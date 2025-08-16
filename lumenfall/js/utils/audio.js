export const audioContext = new (window.AudioContext || window.webkitAudioContext)();
export const audioBuffers = {};
export const audioSources = {};
const gainNodes = {};

export async function loadAudio(name, url) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[name] = await audioContext.decodeAudioData(arrayBuffer);
            resolve();
        } catch (error) {
            console.error(`Error loading audio "${name}":`, error);
            reject(error);
        }
    });
}

export function playAudio(name, loop = false) {
    if (!audioBuffers[name]) return;
    if (audioSources[name] && audioSources[name].buffer) stopAudio(name);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[name];
    source.loop = loop;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5; // Default volume
    source.connect(gainNode).connect(audioContext.destination);
    source.start(0);
    audioSources[name] = source;
    gainNodes[name] = gainNode;
}

export function stopAudio(name) {
    if (audioSources[name]) {
        audioSources[name].stop();
        delete audioSources[name];
    }
}

export function setAudioVolume(name, volume) {
    if (gainNodes[name]) {
        gainNodes[name].gain.value = volume;
    }
}
