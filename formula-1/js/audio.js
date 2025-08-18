export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.engineSound = null;
        this.isInitialized = false;
        // Apuntamos a la ruta raw de GitHub para los assets
        this.basePath = 'https://raw.githubusercontent.com/Yanzsmartwood2025/JUSN38/main/formula-1/assets/audios/';
    }

    // Inicializa el AudioContext si es necesario
    async init() {
        if (this.isInitialized) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.isInitialized = true;
    }

    // Carga y reproduce un único sonido de motor en bucle
    async playEngineSound() {
        if (!this.isInitialized) {
            await this.init();
        }

        // Si ya hay un sonido, lo detenemos antes de empezar de nuevo
        if (this.engineSound) {
            try {
                this.engineSound.source.stop();
            } catch (e) {
                // Ignorar errores si el source ya se detuvo
            }
        }

        try {
            const response = await fetch(this.basePath + 'engine_mid_rpm_loop.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            source.connect(this.audioContext.destination);
            source.start();
            this.engineSound = { source };

        } catch (error) {
            console.error("Error al cargar o reproducir el sonido del motor:", error);
        }
    }

    // Función para detener el sonido si es necesario
    stopEngineSound() {
        if (this.engineSound) {
            try {
                this.engineSound.source.stop();
            } catch(e) {
                // Ignorar
            }
        }
    }
}
