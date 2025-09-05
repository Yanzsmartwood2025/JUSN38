// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    const voiceSelect = document.getElementById('voice-select');
    const textInput = document.getElementById('text-to-convert');
    const generateBtn = document.getElementById('generate-btn');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const errorMessage = document.getElementById('error-message');

    // --- MICRÓFONO 1: Confirmar que el script se ha cargado ---
    console.log("El script.js se ha cargado correctamente. ¡El local está abierto!");

    // Función para mostrar errores
    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    };

    // Función para ocultar errores
    const hideError = () => {
        errorMessage.style.display = 'none';
    };

    // Cargar las voces al iniciar
    const loadVoices = async () => {
        hideError();
        voiceSelect.disabled = true;
        
        // --- MICRÓFONO 2: Avisar que estamos a punto de llamar a la cocina ---
        console.log('Intentando llamar a la cocina en /api/tts para obtener las voces...');

        try {
            const response = await fetch('/api/tts');
            
            // --- MICRÓFONO 3: Confirmar si la cocina contestó el teléfono ---
            console.log('Respuesta recibida desde la cocina. Estado:', response.status);

            if (!response.ok) {
                throw new Error(`La cocina respondió con un error: ${response.statusText}`);
            }

            const voices = await response.json();
            
            // --- MICRÓFONO 4: Confirmar que recibimos la lista de voces ---
            console.log('¡Lista de voces recibida con éxito!', voices);

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
            // --- MICRÓFONO 5 (ALARMA): Algo salió mal durante la llamada ---
            console.error('ERROR al intentar cargar las voces:', error);
            showError('No se pudieron cargar las voces. Revisa la consola para más detalles.');
        }
    };

    // Generar el audio
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

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ voice: selectedVoice, text: text }),
            });

            if (!response.ok) {
                throw new Error(`La cocina tuvo un problema al generar el audio: ${response.statusText}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audioPlayer = document.createElement('audio');
            audioPlayer.controls = true;
            audioPlayer.src = audioUrl;
            audioPlayerContainer.appendChild(audioPlayer);

        } catch (error) {
            console.error('ERROR al generar el audio:', error);
            showError('No se pudo generar el audio. Revisa la consola.');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generar Audio';
        }
    });

    // Cargar las voces al iniciar
    loadVoices();
});

