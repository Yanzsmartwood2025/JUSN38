export class AudioManager {
    constructor(settings, loadingCallback) {
        this.settings = settings;
        this.audioContext = null;
        this.sounds = {};
        this.engineSources = {};
        this.masterGain = null;
        this.isInitialized = false;
        this.loadingCallback = loadingCallback;

        this.basePath = 'https://raw.githubusercontent.com/Yanzsmartwood2025/JUSN38/main/formula-1/assets/audios/';
        this.soundFiles = {
            idle: 'engine_idle_garage.mp3',
            low: 'engine_low_rpm_loop.mp3',
            mid: 'engine_mid_rpm_loop.mp3',
            high: 'engine_high_rpm_loop.mp3',
            shiftUp: 'sfx_gear_shift_up.mp3',
            shiftDown: 'sfx_gear_shift_down.mp3',
            backfire: 'engine_decel_backfire.mp3',
            skid: 'sfx_tires_skid.mp3',
            accelHard: 'engine_accel_hard.mp3',
            collision: 'sfx_collision_light.mp3',
            doppler: 'sfx_doppler_pass_by.mp3',
            exhaustPop: 'sfx_exhaust_pop.mp3',
            wind: 'sfx_wind_high_speed_loop.mp3'
        };
    }

    async init() {
        if (this.isInitialized) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        await this._loadAllSounds();
        this.isInitialized = true;
    }

    async _loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
        } catch (error) {
            console.error(`Error loading sound: ${name}`, error);
        }
    }

    async _loadAllSounds() {
        const loadPromises = [];
        for (const key in this.soundFiles) {
            const url = this.basePath + this.soundFiles[key];
            loadPromises.push(this._loadSound(key, url));
            if(this.loadingCallback) this.loadingCallback(key);
        }
        await Promise.all(loadPromises);
    }

    playSound(name, loop = false, gain = 1.0) {
        if (!this.settings.sfx && name !== 'low' && name !== 'mid' && name !== 'high') return null;
        if (!this.sounds[name] || !this.isInitialized) return null;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name];
        source.loop = loop;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = gain;

        source.connect(gainNode).connect(this.masterGain);
        source.start();
        return { source, gainNode };
    }

    startEngine() {
        if (!this.isInitialized) return;
        this.engineSources.low = this.playSound('low', true, 0);
        this.engineSources.mid = this.playSound('mid', true, 0);
        this.engineSources.high = this.playSound('high', true, 0);
    }

    stopEngine() {
        if(this.engineSources.low) this.engineSources.low.source.stop();
        if(this.engineSources.mid) this.engineSources.mid.source.stop();
        if(this.engineSources.high) this.engineSources.high.source.stop();
    }

    updateEngineSound(rpm, idleRpm, maxRpm) {
        if (!this.isInitialized || !this.engineSources.low) return;

        const rpmRatio = (rpm - idleRpm) / (maxRpm - idleRpm);

        let lowGain = 0, midGain = 0, highGain = 0;

        if (rpmRatio < 0.33) {
            lowGain = 1 - (rpmRatio / 0.33);
            midGain = rpmRatio / 0.33;
        } else if (rpmRatio < 0.66) {
            midGain = 1 - ((rpmRatio - 0.33) / 0.33);
            highGain = (rpmRatio - 0.33) / 0.33;
        } else {
            highGain = 1.0;
        }

        // Ensure smooth transitions
        this.engineSources.low.gainNode.gain.linearRampToValueAtTime(Math.pow(lowGain, 2), this.audioContext.currentTime + 0.05);
        this.engineSources.mid.gainNode.gain.linearRampToValueAtTime(Math.pow(midGain, 2), this.audioContext.currentTime + 0.05);
        this.engineSources.high.gainNode.gain.linearRampToValueAtTime(Math.pow(highGain, 2), this.audioContext.currentTime + 0.05);
    }
}
