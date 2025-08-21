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
    eqCanvas: document.getElementById('eq-canvas'),
    eqCtx: document.getElementById('eq-canvas').getContext('2d'),
    djDisk: document.getElementById('dj-disk'),
    diskHandle: document.getElementById('disk-handle'),
    currentTime: document.getElementById('current-time'),
    totalTime: document.getElementById('total-time'),
    restartButton: document.getElementById('restart-button'),
    loopButton: document.getElementById('loop-button'),
    playerControls: document.getElementById('player-controls'),
    placeholderText: document.getElementById('placeholder-text'),
    repeatsInput: document.getElementById('repeats-input'),
    faders: {
        volume: document.getElementById('volume-slider'),
        pitch: document.getElementById('pitch-slider'),
        reverb: document.getElementById('reverb-slider'),
        delayMix: document.getElementById('delayMix-slider'),
        chorus: document.getElementById('chorus-slider'),
    }
};

// --- GLOBAL STATE ---
let audioContext, originalBuffer, masterGain, selection = { start: 0, end: 1 };
let effectNodes = {};
let activeSources = [], isPlaying = false, isLooping = false, progressAnimator, playbackStartTime = 0;
let isRecording = false, mediaRecorder, audioChunks = [];

// --- EQ STATE ---
const eqBands = [
    { freq: 150, gain: 0, q: 0.7, type: 'lowshelf', color: '#f87171' },
    { freq: 600, gain: 0, q: 1.5, type: 'peaking', color: '#fbbf24' },
    { freq: 2500, gain: 0, q: 1.5, type: 'peaking', color: '#a3e635' },
    { freq: 8000, gain: 0, q: 0.7, type: 'highshelf', color: '#60a5fa' },
];
let activeEQBand = -1;

// --- INITIALIZATION ---
function init() {
    dom.openFileBtn.addEventListener('click', () => dom.audioUpload.click());
    dom.audioUpload.addEventListener('change', handleFileUpload);
    dom.recordBtn.addEventListener('click', toggleRecording);
    dom.saveFileBtn.addEventListener('click', () => { if (originalBuffer) dom.downloadModal.classList.remove('hidden'); });
    dom.cancelDownloadBtn.addEventListener('click', () => dom.downloadModal.classList.add('hidden'));
    dom.confirmDownloadBtn.addEventListener('click', handleDownload);

    dom.playPauseButton.addEventListener('click', togglePlayback);
    dom.restartButton.addEventListener('click', () => { if(isPlaying) { stopPlayback(); playWithEffects(); } });
    dom.loopButton.addEventListener('click', toggleLoop);

    Object.values(dom.faders).forEach(fader => {
        fader.addEventListener('input', handleFaderInput);
        updateLevelMeter(fader);
    });

    dom.waveformCanvas.addEventListener('mousedown', handleWaveformMouseDown);
    window.addEventListener('mousemove', handleWaveformMouseMove);

    dom.eqCanvas.addEventListener('mousedown', handleEQMouseDown);
    dom.eqCanvas.addEventListener('mousemove', handleEQMouseMove);

    dom.djDisk.addEventListener('mousedown', handleDiskMouseDown);
    window.addEventListener('mousemove', handleDiskMouseMove);

    window.addEventListener('mouseup', () => {
        isSelecting = false;
        activeEQBand = -1;
        handleDiskMouseUp();
    });

    const resizeCanvases = () => {
        const eqContainer = dom.eqCanvas.parentElement;
        const waveContainer = document.getElementById('waveform-container');
        if (!eqContainer || !waveContainer) return;

        const { width: waveW, height: waveH } = waveContainer.getBoundingClientRect();
        dom.waveformCanvas.width = dom.progressCanvas.width = waveW;
        dom.waveformCanvas.height = dom.progressCanvas.height = waveH;

        const { width: eqW, height: eqH } = eqContainer.getBoundingClientRect();
        dom.eqCanvas.width = eqW;
        dom.eqCanvas.height = eqH;

        if (originalBuffer) {
            drawWaveform();
            drawProgress(0);
        }
        drawEQ();
    };
    new ResizeObserver(resizeCanvases).observe(document.getElementById('waveform-container'));
    new ResizeObserver(resizeCanvases).observe(dom.eqCanvas.parentElement);
    resizeCanvases();
}

// --- EVENT HANDLERS ---
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!audioContext) await setupAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        loadAudioBuffer(audioBuffer);
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!audioContext) await setupAudioContext();
            isRecording = true;
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
            mediaRecorder.onstop = async () => {
                isRecording = false;
                dom.recordBtn.classList.remove('recording');
                dom.recordBtn.innerHTML = '<i class="fas fa-microphone mr-2"></i>Grabar';
                dom.recordingIndicator.classList.add('hidden');
                stream.getTracks().forEach(track => track.stop());
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                loadAudioBuffer(audioBuffer);
            };
            mediaRecorder.start();
            dom.recordBtn.classList.add('recording');
            dom.recordBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>Detener';
            dom.recordingIndicator.classList.remove('hidden');
        } catch (err) { console.error("Error accessing microphone:", err); }
    }
}

function handleFaderInput(e) {
    updateLevelMeter(e.target);
    if (audioContext) updateEffectValues(null, effectNodes);
}

let isDraggingDisk = false;
let diskDragStart = { x: 0, y: 0 };
function handleDiskMouseDown(e) {
    isDraggingDisk = true;
    diskDragStart.x = e.clientX;
    diskDragStart.y = e.clientY;
    dom.djDisk.style.cursor = 'grabbing';
}
function handleDiskMouseMove(e) {
    if (!isDraggingDisk) return;
    const deltaX = e.clientX - diskDragStart.x;
    const deltaY = e.clientY - diskDragStart.y;

    // Map X to Delay Time (0 to 1s)
    const delayTime = Math.max(0, Math.min(1, deltaX / 200)); // 200px drag = 1s
    // Map Y to Delay Decay (0 to 0.9)
    const delayDecay = Math.max(0, Math.min(0.9, -deltaY / 100)); // 100px drag up = 0.9 decay

    if (effectNodes.delay) {
        effectNodes.delay.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01);
        effectNodes.feedback.gain.setTargetAtTime(delayDecay, audioContext.currentTime, 0.01);
    }

    // Update handle position visually
    const handleX = Math.max(-80, Math.min(80, deltaX));
    const handleY = Math.max(-80, Math.min(80, deltaY));
    dom.diskHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;
}
function handleDiskMouseUp() {
    if (!isDraggingDisk) return;
    isDraggingDisk = false;
    dom.djDisk.style.cursor = 'grab';
    // Reset handle to center
    dom.diskHandle.style.transform = `translate(-50%, -50%)`;
}

function handleEQMouseDown(e) {
    const rect = dom.eqCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = eqBands.length - 1; i >= 0; i--) {
        const band = eqBands[i];
        const bandX = freqToX(band.freq, dom.eqCanvas.width);
        const bandY = gainToY(band.gain, dom.eqCanvas.height);
        if (Math.sqrt(Math.pow(x - bandX, 2) + Math.pow(y - bandY, 2)) < 10) {
            activeEQBand = i;
            return;
        }
    }
}
function handleEQMouseMove(e) {
    if (activeEQBand === -1) return;
    const rect = dom.eqCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const band = eqBands[activeEQBand];
    band.freq = xToFreq(x, dom.eqCanvas.width);
    band.gain = yToGain(y, dom.eqCanvas.height);

    band.freq = Math.max(20, Math.min(22050, band.freq));
    band.gain = Math.max(-24, Math.min(24, band.gain));

    if (effectNodes.eq) {
        effectNodes.eq[activeEQBand].frequency.setValueAtTime(band.freq, audioContext.currentTime);
        effectNodes.eq[activeEQBand].gain.setValueAtTime(band.gain, audioContext.currentTime);
    }
    drawEQ();
}

let isSelecting = false;
function handleWaveformMouseDown(e) {
    if (!originalBuffer) return; isSelecting = true;
    const rect = dom.waveformCanvas.getBoundingClientRect();
    const clickTime = ((e.clientX - rect.left) / rect.width) * originalBuffer.duration;
    selection.start = selection.end = clickTime;
    drawWaveform();
}
function handleWaveformMouseMove(e) {
    if (!isSelecting || !originalBuffer) return;
    const rect = dom.waveformCanvas.getBoundingClientRect();
    let end = ((e.clientX - rect.left) / rect.width) * originalBuffer.duration;
    end = Math.max(0, Math.min(originalBuffer.duration, end));
    if (end < selection.start) {
        selection.end = selection.start;
        selection.start = end;
    } else {
        selection.end = end;
    }
    drawWaveform();
}

// --- AUDIO CORE ---
async function setupAudioContext() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    effectNodes = createEffectNodes(audioContext);
}
async function loadAudioBuffer(audioBuffer) {
    stopPlayback();
    originalBuffer = audioBuffer;
    selection.start = 0;
    selection.end = originalBuffer.duration;
    dom.totalTime.textContent = formatTime(originalBuffer.duration);
    drawWaveform();
    dom.playerControls.classList.remove('hidden');
    dom.placeholderText.classList.add('hidden');
}
function togglePlayback() {
    if (!audioContext || !originalBuffer) return;
    if (audioContext.state === 'suspended') audioContext.resume();
    if (isPlaying) stopPlayback(); else playWithEffects();
}
function toggleLoop(e) {
    isLooping = !isLooping;
    e.currentTarget.classList.toggle('text-blue-400', isLooping);
    activeSources.forEach(source => source.loop = isLooping);
}
function playWithEffects() {
    stopPlayback();
    if (selection.start >= selection.end) return;
    const mainSource = audioContext.createBufferSource();
    mainSource.buffer = originalBuffer;
    mainSource.connect(effectNodes.eq[0]);
    updateEffectValues(mainSource, effectNodes);
    mainSource.loop = isLooping;
    mainSource.loopStart = selection.start;
    mainSource.loopEnd = selection.end;
    const duration = selection.end - selection.start;
    mainSource.start(audioContext.currentTime, selection.start, isLooping ? undefined : duration);
    playbackStartTime = audioContext.currentTime;
    isPlaying = true;
    dom.playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    updateProgress();
    mainSource.onended = () => { if (!isLooping && isPlaying) stopPlayback(); };
    activeSources.push(mainSource);
}
function stopPlayback() {
    activeSources.forEach(source => { try { source.stop(0); source.disconnect(); } catch(e) {} });
    activeSources = [];
    isPlaying = false;
    dom.playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    cancelAnimationFrame(progressAnimator);
    dom.currentTime.textContent = formatTime(0);
    drawProgress(0);
}

// --- DRAWING & UI ---
function updateProgress() {
    if (!isPlaying) return;
    const selectionDuration = selection.end - selection.start;
    const elapsedTime = (audioContext.currentTime - playbackStartTime) % selectionDuration;
    dom.currentTime.textContent = formatTime(elapsedTime);
    const progress = (selection.start + elapsedTime) / originalBuffer.duration;
    drawProgress(progress);
    progressAnimator = requestAnimationFrame(updateProgress);
}
function updateLevelMeter(fader) {
    const meter = document.getElementById(`${fader.id.replace('-slider', '')}-meter`);
    if (!meter) return;
    const min = fader.min || 0;
    const max = fader.max || 1;
    const percent = ((fader.value - min) / (max - min)) * 100;
    meter.style.height = `${percent}%`;
}
function drawWaveform() {
    if (!originalBuffer) return;
    const { waveformCtx: ctx, waveformCanvas: canvas } = dom;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const startX = (selection.start / originalBuffer.duration) * canvas.width;
    const endX = (selection.end / originalBuffer.duration) * canvas.width;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.fillRect(startX, 0, endX - startX, canvas.height);
}
function drawProgress(progress) {
    if (!originalBuffer) return;
    const { progressCtx: ctx, progressCanvas: canvas } = dom;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const data = originalBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    const progressPx = progress * canvas.width;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressPx, canvas.height);
    ctx.clip();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
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
    ctx.restore();
}

// --- EQ DRAWING ---
function drawEQ() {
    const { eqCtx: ctx, eqCanvas: canvas } = dom;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();

    if (effectNodes.eq) {
        const freqs = new Float32Array(width);
        const magResponse = new Float32Array(width);
        const phaseResponse = new Float32Array(width);
        for (let i = 0; i < width; i++) {
            freqs[i] = 20 * Math.pow(1000, i / width);
        }
        const totalMag = new Float32Array(width).fill(1);
        effectNodes.eq.forEach(band => {
            band.getFrequencyResponse(freqs, magResponse, phaseResponse);
            for(let i=0; i<width; i++) totalMag[i] *= magResponse[i];
        });

        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const db = 20 * Math.log10(totalMag[i]);
            const y = (1 - (db + 24) / 48) * height;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
        }
        ctx.stroke();
    }

    eqBands.forEach((band, index) => {
        const x = freqToX(band.freq, width);
        const y = gainToY(band.gain, height);
        ctx.fillStyle = band.color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        if (index === activeEQBand) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}
const freqToX = (freq, width) => (Math.log(freq / 20) / Math.log(22050 / 20)) * width;
const xToFreq = (x, width) => 20 * Math.pow(22050 / 20, x / width);
const gainToY = (gain, height) => (1 - (gain + 24) / 48) * height;
const yToGain = (y, height) => (1 - y / height) * 48 - 24;

// --- OFFLINE PROCESSING & DOWNLOAD ---
async function handleDownload() {
    if (!originalBuffer) return;
    dom.downloadModal.classList.add('hidden');
    const btn = dom.confirmDownloadBtn;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
    btn.disabled = true;

    try {
        const repeats = parseInt(dom.repeatsInput.value) || 1;
        const selectionDuration = selection.end - selection.start;
        if (selectionDuration <= 0) throw new Error("Selection duration is zero.");

        const totalDuration = selectionDuration * repeats;

        const offlineCtx = new OfflineAudioContext(originalBuffer.numberOfChannels, Math.ceil(totalDuration * originalBuffer.sampleRate), originalBuffer.sampleRate);

        const loopCtx = new OfflineAudioContext(originalBuffer.numberOfChannels, Math.ceil(selectionDuration * originalBuffer.sampleRate), originalBuffer.sampleRate);
        const loopEffects = createEffectNodes(loopCtx);
        const loopSource = loopCtx.createBufferSource();
        loopSource.buffer = originalBuffer;
        loopSource.connect(loopEffects.eq[0]);
        updateEffectValues(loopSource, loopEffects);
        loopSource.start(0, selection.start, selectionDuration);
        const renderedLoopBuffer = await loopCtx.startRendering();

        for (let i = 0; i < repeats; i++) {
            const finalSource = offlineCtx.createBufferSource();
            finalSource.buffer = renderedLoopBuffer;
            finalSource.connect(offlineCtx.destination);
            finalSource.start(i * selectionDuration);
        }

        const renderedBuffer = await offlineCtx.startRendering();
        const format = dom.downloadFormatSelect.value;
        const blob = format === 'wav' ? bufferToWavBlob(renderedBuffer) : bufferToMp3Blob(renderedBuffer);
        const filename = `Jusn38_Studio_output.${format}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);

    } catch (error) {
        console.error("Error processing audio:", error);
        alert("Hubo un error al procesar el audio para la descarga.");
    } finally {
        btn.innerHTML = 'Descargar';
        btn.disabled = false;
    }
}

// --- HELPERS ---
const createEffectNodes = (context) => {
    const nodes = {};
    nodes.eq = eqBands.map(band => {
        const filter = context.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.freq;
        filter.gain.value = band.gain;
        filter.Q.value = band.q;
        return filter;
    });
    for (let i = 0; i < nodes.eq.length - 1; i++) {
        nodes.eq[i].connect(nodes.eq[i + 1]);
    }

    nodes.dryGain = context.createGain();
    nodes.wetGain = context.createGain();
    nodes.delayGain = context.createGain(); // For Delay Mix
    nodes.convolver = context.createConvolver();
    nodes.convolver.buffer = createSimpleImpulse(context);
    nodes.delay = context.createDelay(2.0);
    nodes.feedback = context.createGain();
    nodes.chorusDelay = context.createDelay(0.1);
    nodes.chorusLFO = context.createOscillator();
    nodes.chorusDepth = context.createGain();
    nodes.chorusLFO.frequency.value = 4;
    nodes.chorusDepth.gain.value = 0;
    nodes.chorusLFO.connect(nodes.chorusDepth);
    nodes.chorusDepth.connect(nodes.chorusDelay.delayTime);
    nodes.chorusLFO.start();

    const lastEQ = nodes.eq[nodes.eq.length - 1];
    const destination = context.destination || masterGain;
    lastEQ.connect(nodes.dryGain);
    lastEQ.connect(nodes.chorusDelay);

    nodes.chorusDelay.connect(nodes.convolver);
    nodes.convolver.connect(nodes.wetGain);

    lastEQ.connect(nodes.delay);
    nodes.delay.connect(nodes.feedback);
    nodes.feedback.connect(nodes.delay);
    nodes.delay.connect(nodes.delayGain);
    nodes.delayGain.connect(destination);

    nodes.dryGain.connect(destination);
    nodes.wetGain.connect(destination);
    return nodes;
};
const updateEffectValues = (sourceNode, nodes) => {
    if (!nodes.eq) return;
    const now = nodes.eq[0].context.currentTime;
    const values = Object.fromEntries(
        Object.entries(dom.faders).map(([key, fader]) => [key, parseFloat(fader.value)])
    );
    masterGain.gain.setTargetAtTime(values.volume, now, 0.01);
    const reverbAndChorusWet = (values.reverb + values.chorus) / 2;
    nodes.dryGain.gain.setTargetAtTime(1.0 - reverbAndChorusWet, now, 0.01);
    nodes.wetGain.gain.setTargetAtTime(reverbAndChorusWet, now, 0.01);
    nodes.delayGain.gain.setTargetAtTime(values.delayMix, now, 0.01);
    nodes.chorusDepth.gain.setTargetAtTime(values.chorus * 0.01, now, 0.01);
    if (sourceNode) sourceNode.playbackRate.setTargetAtTime(values.pitch, now, 0.01);
};
const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};
const createSimpleImpulse = (ctx) => {
    const len = ctx.sampleRate * 2;
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return impulse;
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
