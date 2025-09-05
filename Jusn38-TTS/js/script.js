// js/script.js (Versión con Pizarrón de Depuración)

document.addEventListener('DOMContentLoaded', () => {
    // --- Creación del Pizarrón de Anuncios ---
    const debugContainer = document.createElement('div');
    debugContainer.id = 'debug-container';
    debugContainer.style.position = 'fixed';
    debugContainer.style.bottom = '10px';
    debugContainer.style.left = '10px';
    debugContainer.style.right = '10px';
    debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugContainer.style.color = '#00ff00';
    debugContainer.style.padding = '10px';
    debugContainer.style.fontFamily = 'monospace';
    debugContainer.style.fontSize = '12px';
    debugContainer.style.borderRadius = '8px';
    debugContainer.style.zIndex = '1000';
    debugContainer.style.maxHeight = '150px';
    debugContainer.style.overflowY = 'auto';
    debugContainer.innerHTML = '<h4>-- Pizarrón de Anuncios (Local) --</h4>';
    document.body.appendChild(debugContainer);

    const logToScreen = (message) => {
        console.log(message); // Mantenemos el log de consola por si acaso
        const p = document.createElement('p');
        p.textContent = `> ${message}`;
        p.style.margin = '2px 0';
        p.style.borderBottom = '1px solid #333';
        debugContainer.appendChild(p);
        debugContainer.scrollTop = debugContainer.scrollHeight;
    };
    
    // --- Elementos de la página ---
    const voiceSelect = document.getElementById('voice-select');
    const textInput = document.getElementById('text-to-convert');
    const generateBtn = document.getElementById('generate-btn');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const errorMessage = document.getElementById('error-message');

    logToScreen("El local está abierto y el pizarrón está listo.");

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    };

    const hideError = () => {
        errorMessage.style.display = 'none';
    };

    const loadVoices = async () => {
        hideError();
        voiceSelect.disabled = true;
        
        logToScreen('Llamando a la cocina en /api/tts para pedir la lista de voces...');

        try {
            const response = await fetch('/api/tts');
            logToScreen(`La cocina contestó. Estado: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                throw new Error(`La cocina respondió con un error.`);
            }

            const voices = await response.json();
            logToScreen('¡Lista de voces recibida con éxito!');

            voiceSelect.innerHTML = '<option value="" disabled>Selecciona una voz...</option>';
            
            for (const ttsEngine in voices) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = ttsEngine;
                for (const voice in voices[ttsEngine]) {
                    const option = document.createElement('option');
                    option.value = `${ttsEngine}:${voices[ttsEngine][voice].id}`;
                    option.textContent = `${voices[ttsEngine][voice].name} (${voices[ttsEngine][voice].language})`;
                    optgroup.appendChild(option);
                }
                voiceSelect.appendChild(optgroup);
            }
            voiceSelect.disabled = false;
            voiceSelect.options[0].selected = true;

        } catch (error) {
            logToScreen(`ALARMA: Falló la comunicación con la cocina. ${error.message}`);
            showError('No se pudieron cargar las voces. Revisa el pizarrón.');
        }
    };

    generateBtn.addEventListener('click', async () => {
        const selectedVoice = voiceSelect.value;
        const text = textInput.value.trim();

        if (!selectedVoice || !text) {
            showError('Por favor, selecciona una voz y escribe un texto.');
            return;
        }

        hideError();
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generando...';
        audioPlayerContainer.innerHTML = '';
        logToScreen(`Enviando texto a la cocina con la voz: ${selectedVoice}`);

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ voice: selectedVoice, text: text }),
            });

            logToScreen(`La cocina respondió a la petición de generar audio. Estado: ${response.status}`);

            if (!response.ok) {
                throw new Error(`La cocina tuvo un problema al generar el audio.`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audioPlayer = document.createElement('audio');
            audioPlayer.controls = true;
            audioPlayer.src = audioUrl;
            audioPlayerContainer.appendChild(audioPlayer);
            logToScreen("¡Audio generado y listo para reproducir!");

        } catch (error) {
            logToScreen(`ALARMA: Falló la generación de audio. ${error.message}`);
            showError('No se pudo generar el audio. Revisa el pizarrón.');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generar Audio';
        }
    });

    loadVoices();
});

