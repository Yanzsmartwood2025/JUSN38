// --- DOM ELEMENTS ---
const dom = {
    audioUpload: document.getElementById('audio-upload'),
    openFileBtn: document.getElementById('open-file-btn'),
    recordBtn: document.getElementById('record-btn'),
    recordingIndicator: document.getElementById('recording-indicator'),
    saveFileBtn: document.getElementById('save-file-btn'),
    downloadModal: document.getElementById('download-modal'),
    cancelDownloadBtn: document.getElementById('cancel-download-btn'),
    confirmDownloadBtn: document.getElementById('confirm-download-btn'),
    downloadFormatSelect: document.getElementById('download-format'),
    playPauseButton: document.getElementById('play-pause-button'),
    waveformCanvas: document.getElementById('waveform-canvas'),
    waveformCtx: document.getElementById('waveform-canvas').getContext('2d'),
    progressCanvas: document.getElementById('progress-canvas'),
    progressCtx: document.getElementById('progress-canvas').getContext('2d'),
    djDisk: document.getElementById('dj-disk'),
    diskHandle: document.getElementById('disk-handle'),
    currentTime: document.getElementById('current-time'),
    totalTime: document.getElementById('total-time'),
    restartButton: document.getElementById('restart-button'),
    loopButton: document.getElementById('loop-button'),
    playerControls: document.getElementById('player-controls'),
    placeholderText: document.getElementById('placeholder-text'),
    repeatsInput: document.getElementById('repeats-input'),
    // FX Controls will be referenced directly via their IDs
};

// --- TONE.JS & GLOBAL STATE ---
let player, compressor, noiseGate, eq, filter, reverb, delay, chorus, distortion;
let originalBuffer;
let selection = { start: 0, end: 1 };
let isPlaying = false, isLooping = false, progressAnimator;
let isRecording = false, mediaRecorder, audioChunks = [];

// --- INITIALIZATION ---
function init() {
    // Basic UI Listeners
    dom.openFileBtn.addEventListener('click', () => dom.audioUpload.click());
    dom.audioUpload.addEventListener('change', handleFileUpload);
    dom.recordBtn.addEventListener('click', toggleRecording);
    dom.saveFileBtn.addEventListener('click', () => { if (player && player.loaded) dom.downloadModal.classList.remove('hidden'); });
    dom.cancelDownloadBtn.addEventListener('click', () => dom.downloadModal.classList.add('hidden'));
    dom.confirmDownloadBtn.addEventListener('click', handleDownload);

    // Playback Controls
    dom.recordBtn.addEventListener('click', toggleRecording);
    dom.playPauseButton.addEventListener('click', togglePlayback);
    dom.restartButton.addEventListener('click', () => { if(isPlaying) { stop(); play(); } });
    dom.loopButton.addEventListener('click', toggleLoop);

    // FX Controls Listeners
    const fxControls = document.getElementById('fx-controls-container');
    fxControls.querySelectorAll('input[type="range"]').forEach(slider => {
        updateSliderFill(slider); // Set initial fill
        slider.addEventListener('input', updateFxValue);
    });

    // Waveform and Disk interaction
    dom.waveformCanvas.addEventListener('mousedown', handleWaveformMouseDown);
    dom.djDisk.addEventListener('mousedown', handleDiskMouseDown);
    window.addEventListener('mousemove', (e) => {
        handleWaveformMouseMove(e);
        handleDiskMouseMove(e);
    });
    window.addEventListener('mouseup', () => {
        isSelecting = false;
        handleDiskMouseUp();
    });

    // DJ Disk Color Switcher
    document.querySelectorAll('.color-switcher').forEach(button => {
        button.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            dom.djDisk.dataset.glowColor = color;
        });
    });
    // Set initial glow color
    dom.djDisk.dataset.glowColor = 'blue';

    // Disk Skin Switcher
    document.querySelectorAll('.skin-switcher').forEach(button => {
        button.addEventListener('click', (e) => {
            const skin = e.target.dataset.skin;
            // Remove any existing skin classes
            dom.djDisk.className = dom.djDisk.className.replace(/disk-skin-\d/g, '');
            // Add the new skin class
            dom.djDisk.classList.add(`disk-skin-${skin}`);
        });
    });

    // Canvas Resizing
    const resizeCanvases = () => {
        const waveContainer = document.getElementById('waveform-container');
        if (!waveContainer) return;

        const { width: waveW, height: waveH } = waveContainer.getBoundingClientRect();
        dom.waveformCanvas.width = dom.progressCanvas.width = waveW;
        dom.waveformCanvas.height = dom.progressCanvas.height = waveH;

        if (originalBuffer) {
            drawWaveform();
            drawProgress(0);
        }
    };
    new ResizeObserver(resizeCanvases).observe(document.getElementById('waveform-container'));
    resizeCanvases();

    // Setup the audio pipeline
    setupTonePipeline();
}

// --- EVENT HANDLERS ---
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    await Tone.start(); // User interaction gesture
    const arrayBuffer = await file.arrayBuffer();
    try {
        const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
        await loadAudioBuffer(audioBuffer);
    } catch (e) {
        console.error("Error decoding audio data", e);
        alert("No se pudo decodificar el archivo de audio. Por favor, intenta con otro formato (MP3, WAV).");
    }
}

async function toggleRecording() {
    if (isRecording) {
        mediaRecorder.stop();
    } else {
        try {
            await Tone.start(); // User interaction gesture
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            isRecording = true;
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
            mediaRecorder.onstop = async () => {
                isRecording = false;
                dom.recordBtn.classList.remove('glow-red');
                dom.recordingIndicator.classList.add('hidden');
                stream.getTracks().forEach(track => track.stop());
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
                await loadAudioBuffer(audioBuffer);
            };
            mediaRecorder.start();
            dom.recordBtn.classList.add('glow-red');
            dom.recordingIndicator.classList.remove('hidden'); // Keep this for accessibility, though button is primary indicator
        } catch (err) { console.error("Error accessing microphone:", err); }
    }
}

function updateSliderFill(slider) {
    const min = slider.min || 0;
    const max = slider.max || 1;
    const value = slider.value;
    const percent = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--fill-percent', `${percent}%`);
}

function updateFxValue(e) {
    const { id, value } = e.target;
    const floatValue = parseFloat(value);

    // Update visual fill
    updateSliderFill(e.target);

    // Update value display span
    const valueSpan = document.getElementById(`${id}-value`);
    if (valueSpan) {
        valueSpan.textContent = value;
    }

    switch (id) {
        // Compressor
        case 'compressor-threshold': compressor.threshold.value = floatValue; break;
        case 'compressor-ratio': compressor.ratio.value = floatValue; break;
        case 'compressor-attack': compressor.attack.value = floatValue; break;
        case 'compressor-release': compressor.release.value = floatValue; break;
        // Gate
        case 'gate-threshold': noiseGate.threshold.value = floatValue; break;
        // EQ
        case 'eq-low': eq.low.value = floatValue; break;
        case 'eq-mid': eq.mid.value = floatValue; break;
        case 'eq-high': eq.high.value = floatValue; break;
        // Reverb
        case 'reverb-decay': reverb.decay = floatValue; break;
        case 'reverb-wet': reverb.wet.value = floatValue; break;
        // Delay
        case 'delay-time': delay.delayTime.value = floatValue; break;
        case 'delay-feedback': delay.feedback.value = floatValue; break;
        case 'delay-wet': delay.wet.value = floatValue; break;
        // Chorus
        case 'chorus-frequency': chorus.frequency.value = floatValue; break;
        case 'chorus-depth': chorus.depth = floatValue; break;
        case 'chorus-wet': chorus.wet.value = floatValue; break;
        // Distortion
        case 'distortion-amount': distortion.wet.value = floatValue; break;
    }
}

let isSelecting = false;
function handleWaveformMouseDown(e) {
    if (!player || !player.loaded) return;
    isSelecting = true;
    const rect = dom.waveformCanvas.getBoundingClientRect();
    const clickTime = ((e.clientX - rect.left) / rect.width) * player.buffer.duration;
    selection.start = selection.end = clickTime;
    drawWaveform();
}

function handleWaveformMouseMove(e) {
    if (!isSelecting || !player || !player.loaded) return;
    const rect = dom.waveformCanvas.getBoundingClientRect();
    let end = ((e.clientX - rect.left) / rect.width) * player.buffer.duration;
    end = Math.max(0, Math.min(player.buffer.duration, end));
    if (end < selection.start) {
        selection.end = selection.start;
        selection.start = end;
    } else {
        selection.end = end;
    }
    drawWaveform();
}

let isDraggingDisk = false;
let diskDragStart = { x: 0, y: 0 };
function handleDiskMouseDown(e) {
    if (!player || !player.loaded) return;
    isDraggingDisk = true;
    diskDragStart.x = e.clientX;
    diskDragStart.y = e.clientY;
    dom.djDisk.style.cursor = 'grabbing';
}
function handleDiskMouseMove(e) {
    if (!isDraggingDisk) return;
    const deltaX = e.clientX - diskDragStart.x;
    const deltaY = e.clientY - diskDragStart.y;

    // Map X to Distortion Wet (0 to 1)
    const distortionWet = Math.max(0, Math.min(1, deltaX / 200));
    distortion.wet.setTargetAtTime(distortionWet, Tone.context.currentTime, 0.01);

    // Map Y to Filter Frequency (logarithmic, 200Hz to 8000Hz)
    const filterFreq = Math.max(200, Math.min(8000, 8000 * Math.pow(0.025, -deltaY / 100)));
    filter.frequency.setTargetAtTime(filterFreq, Tone.context.currentTime, 0.01);

    // Update handle position visually
    const handleX = Math.max(-80, Math.min(80, deltaX));
    const handleY = Math.max(-80, Math.min(80, deltaY));
    dom.diskHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;
}
function handleDiskMouseUp() {
    if (!isDraggingDisk) return;
    isDraggingDisk = false;
    dom.djDisk.style.cursor = 'grab';
    // Reset handle to center and effects to default
    dom.diskHandle.style.transform = `translate(-50%, -50%)`;
    distortion.wet.setTargetAtTime(0, Tone.context.currentTime, 0.1);
    filter.frequency.setTargetAtTime(20000, Tone.context.currentTime, 0.1);
}


// --- TONE.JS AUDIO CORE ---
function setupTonePipeline() {
    // Create effects with default values from the UI
    compressor = new Tone.Compressor({
        threshold: -24, ratio: 12, attack: 0.003, release: 0.25
    });
    noiseGate = new Tone.Gate(-40);
    eq = new Tone.EQ3(0, 0, 0);
    filter = new Tone.Filter(20000, 'lowpass');
    reverb = new Tone.Reverb({ decay: 1.5, wet: 0 });
    delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.5, wet: 0 });
    chorus = new Tone.Chorus({ frequency: 4, depth: 0.5, wet: 0 }).start();
    distortion = new Tone.Distortion({ distortion: 0.8, wet: 0 }); // wet is 0, so it's off by default

    // Player will be created when audio is loaded and then chained.
}

async function loadAudioBuffer(audioBuffer) {
    if (isPlaying) stop();

    originalBuffer = audioBuffer; // Keep a reference for drawing

    if (player) player.dispose();

    // Create the player and chain it.
    player = new Tone.Player(originalBuffer).chain(compressor, noiseGate, eq, filter, reverb, delay, chorus, distortion, Tone.Destination);

    // Assign the onstop handler
    player.onstop = () => {
        if (isPlaying) stop();
    };

    // Wait for Tone.js to confirm all buffers are loaded. This is the crucial fix.
    await Tone.loaded();

    // Now that the player is ready, update the UI.
    selection.start = 0;
    selection.end = player.buffer.duration;
    dom.totalTime.textContent = formatTime(player.buffer.duration);
    dom.placeholderText.classList.add('hidden');
    drawWaveform();
}

async function togglePlayback() {
    if (!player || !player.loaded) return;

    // Crucially, ensure Tone.js is started by a user gesture.
    await Tone.start();

    if (isPlaying) {
        stop();
    } else {
        play();
    }
}

function toggleLoop(e) {
    isLooping = !isLooping;
    if (player) player.loop = isLooping;
    e.currentTarget.classList.toggle('glow-blue', isLooping);
}

let progressLoop;

function play() {
    if (!player || !player.loaded || selection.start >= selection.end) return;

    const duration = selection.end - selection.start;
    player.loopStart = selection.start;
    player.loopEnd = selection.end;
    player.loop = isLooping;

    // The duration is passed only if not looping.
    player.start(Tone.now(), selection.start, isLooping ? undefined : duration);

    isPlaying = true;
    dom.playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    dom.playPauseButton.classList.add('glow-white');
    dom.djDisk.classList.add('spinning');

    // Stop any previous loop to avoid multiple running
    if (progressLoop) progressLoop.dispose();

    // Loop for updating the progress bar
    const startTime = player.startTime;
    progressLoop = new Tone.Loop(time => {
        const elapsed = Tone.now() - startTime;
        const currentPosition = selection.start + (elapsed % duration);
        const progress = currentPosition / player.buffer.duration;

        // Use Tone.Draw to sync UI updates with the audio thread
        Tone.Draw.schedule(() => {
            dom.currentTime.textContent = formatTime(currentPosition);
            drawProgress(progress);
        }, time);

    }, "16n").start(0);
}

function stop() {
    if (player) player.stop();
    if (progressLoop) progressLoop.dispose();

    isPlaying = false;
    dom.playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    dom.playPauseButton.classList.remove('glow-white');
    dom.djDisk.classList.remove('spinning');

    // Reset progress bar to the beginning of the selection
    Tone.Draw.schedule(() => {
        const duration = player && player.loaded ? player.buffer.duration : 1;
        dom.currentTime.textContent = formatTime(selection.start);
        drawProgress(selection.start / duration);
    }, Tone.now());
}


// --- DRAWING & UI ---
function drawWaveform() {
    if (!originalBuffer) return;
    const { waveformCtx: ctx, waveformCanvas: canvas } = dom;
    const duration = originalBuffer.duration;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the full waveform in a muted color first
    const data = originalBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum; if (datum > max) max = datum;
        }
        ctx.moveTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Draw the selection overlay
    const startX = (selection.start / duration) * canvas.width;
    const endX = (selection.end / duration) * canvas.width;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.fillRect(startX, 0, endX - startX, canvas.height);
}

function drawProgress(progress) {
    if (!originalBuffer) return;
    const { progressCtx: ctx, progressCanvas: canvas } = dom;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const progressPx = progress * canvas.width;

    ctx.fillStyle = '#a78bfa'; // violet-400
    ctx.fillRect(progressPx - 1, 0, 2, canvas.height);
}

// --- OFFLINE PROCESSING & DOWNLOAD ---
async function handleDownload() {
    if (!player || !player.loaded) return;
    dom.downloadModal.classList.add('hidden');
    const btn = dom.confirmDownloadBtn;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
    btn.disabled = true;

    try {
        const repeats = parseInt(dom.repeatsInput.value) || 1;
        const selectionDuration = selection.end - selection.start;
        if (selectionDuration <= 0) throw new Error("Selection duration is zero.");

        const totalDuration = selectionDuration * repeats;
        const sampleRate = player.buffer.sampleRate;
        const channels = player.buffer.numberOfChannels;

        const renderedBuffer = await Tone.Offline(async (offlineCtx) => {
            // Create a player and effects within the offline context
            const offlinePlayer = new Tone.Player(player.buffer);

            // Create offline versions of all effects, using current values
            const offlineCompressor = new Tone.Compressor(compressor.get());
            const offlineGate = new Tone.Gate(noiseGate.get());
            const offlineEq = new Tone.EQ3(eq.get());
            const offlineReverb = new Tone.Reverb(reverb.get());
            const offlineDelay = new Tone.FeedbackDelay(delay.get());
            const offlineChorus = new Tone.Chorus(chorus.get()).start();
            const offlineDistortion = new Tone.Distortion(distortion.get());

            // Chain them to the offline context's destination
            offlinePlayer.chain(
                offlineCompressor,
                offlineGate,
                offlineEq,
                offlineReverb,
                offlineDelay,
                offlineChorus,
                offlineDistortion,
                offlineCtx.destination
            );

            // Play the selected part, looped as many times as requested
            for (let i = 0; i < repeats; i++) {
                offlinePlayer.start(i * selectionDuration, selection.start, selectionDuration);
            }

        }, totalDuration);

        const format = dom.downloadFormatSelect.value;
        const blob = format === 'wav' ? bufferToWavBlob(renderedBuffer.get()) : bufferToMp3Blob(renderedBuffer.get());
        const filename = `Jusn38_Studio_output.${format}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);

    } catch (error) {
        console.error("Error processing audio for download:", error);
        alert("Hubo un error al procesar el audio para la descarga.");
    } finally {
        btn.innerHTML = 'Descargar';
        btn.disabled = false;
    }
}

// --- HELPERS ---
const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const bufferToWavBlob = (abuffer) => {
    let numOfChan = abuffer.numberOfChannels, len = abuffer.length * numOfChan * 2 + 44,
        buf = new ArrayBuffer(len), view = new DataView(buf),
        channels = [], i, sample, offset = 0, pos = 0;
    const setUint16 = (d) => { view.setUint16(pos, d, true); pos += 2; };
    const setUint32 = (d) => { view.setUint32(pos, d, true); pos += 4; };
    setUint32(0x46464952); setUint32(len - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
    setUint32(len - pos - 4);
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while (pos < len) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset] || 0));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true); pos += 2;
        }
        offset++;
    }
    return new Blob([view], { type: 'audio/wav' });
};
const bufferToMp3Blob = (abuffer) => {
    const mp3encoder = new lamejs.Mp3Encoder(abuffer.numberOfChannels, abuffer.sampleRate, 128);
    const samples = new Int16Array(abuffer.length);
    const channelData = abuffer.getChannelData(0);
    for(let i = 0; i < abuffer.length; i++){
        samples[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
    }
    const sampleBlockSize = 1152;
    const mp3Data = [];
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
    return new Blob(mp3Data, { type: 'audio/mp3' });
};

// --- RUN APP ---
init();
