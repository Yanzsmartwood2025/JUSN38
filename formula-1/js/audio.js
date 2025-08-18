export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.sounds = {};
        this.engineLoops = {};
        this.masterGain = null;
        this.basePath = 'https://raw.githubusercontent.com/Yanzsmartwood2025/JUSN38/main/formula-1/assets/audios/';

        this.soundFiles = {
            // Loops de motor
            idle: 'engine_idle_garage.mp3',
            low: 'engine_low_rpm_loop.mp3',
            mid: 'engine_mid_rpm_loop.mp3',
            high: 'engine_high_rpm_loop.mp3',
            wind: 'sfx_wind_high_speed_loop.mp3',
            // Efectos de sonido (SFX)
            backfire: 'engine_decel_backfire.mp3',
            skid: 'sfx_tires_skid.mp3',
            shiftUp: 'sfx_gear_shift_up.mp3',
            shiftDown: 'sfx_gear_shift_down.mp3',
        };
    }

    async init() {
        if (this.isInitialized) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);

        // Reanudar contexto si es necesario
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const loadPromises = Object.entries(this.soundFiles).map(([name, file]) =>
            this._loadSound(name, this.basePath + file)
        );

        await Promise.all(loadPromises);
        this.isInitialized = true;
        console.log("AudioManager inicializado y todos los sonidos cargados.");
    }

    async _loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.sounds[name] = await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error(`Error al cargar el sonido ${name}:`, error);
        }
    }

    startEngine() {
        if (!this.isInitialized || !this.sounds.idle) return;

        this.stopEngine(); // Asegurarse de que todo esté detenido antes de empezar

        const loopNames = ['idle', 'low', 'mid', 'high', 'wind'];
        loopNames.forEach(name => {
            if (this.sounds[name]) {
                const source = this.audioContext.createBufferSource();
                source.buffer = this.sounds[name];
                source.loop = true;

                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = (name === 'idle') ? 1.0 : 0.0; // Empezar solo con el sonido de ralentí

                source.connect(gainNode).connect(this.masterGain);
                source.start();
                this.engineLoops[name] = { source, gainNode };
            }
        });
        console.log("Motor encendido, sonido de ralentí activado.");
    }

    stopEngine() {
        Object.values(this.engineLoops).forEach(loop => {
            try {
                loop.source.stop();
            } catch (e) { /* Ignorar errores si ya está detenido */ }
        });
        this.engineLoops = {};
        console.log("Motor apagado, todos los sonidos detenidos.");
    }

    updateEngineSound(speedRatio) { // speedRatio es un valor de 0.0 a 1.0
        if (!this.isInitialized || Object.keys(this.engineLoops).length === 0) return;

        const sr = Math.max(0, Math.min(1, speedRatio)); // Asegurar que el valor esté entre 0 y 1

        let idleGain = 0, lowGain = 0, midGain = 0, highGain = 0;

        if (sr < 0.33) {
            idleGain = 1 - (sr / 0.33);
            lowGain = sr / 0.33;
        } else if (sr < 0.66) {
            lowGain = 1 - ((sr - 0.33) / 0.33);
            midGain = (sr - 0.33) / 0.33;
        } else {
            midGain = 1 - ((sr - 0.66) / 0.34);
            highGain = (sr - 0.66) / 0.34;
        }

        // El sonido del viento aumenta con la ganancia del motor alto
        const windGain = highGain * 0.7; // El viento no debe ser tan fuerte como el motor

        // Aplicar ganancias con transiciones suaves
        const rampTime = this.audioContext.currentTime + 0.1;
        this.engineLoops.idle.gainNode.gain.linearRampToValueAtTime(idleGain, rampTime);
        this.engineLoops.low.gainNode.gain.linearRampToValueAtTime(lowGain, rampTime);
        this.engineLoops.mid.gainNode.gain.linearRampToValueAtTime(midGain, rampTime);
        this.engineLoops.high.gainNode.gain.linearRampToValueAtTime(highGain, rampTime);
        this.engineLoops.wind.gainNode.gain.linearRampToValueAtTime(windGain, rampTime);
    }

    playSfx(name) {
        if (!this.isInitialized || !this.sounds[name]) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name];
        source.connect(this.masterGain);
        source.start();
    }
}
