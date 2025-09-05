// js/script.js (Versión con Puter.js)

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
    debugContainer.innerHTML = '<h4>-- Pizarrón de Anuncios (Puter.js) --</h4>';
    document.body.appendChild(debugContainer);

    const logToScreen = (message) => {
        console.log(message);
        const p = document.createElement('p');
        p.textContent = `> ${message}`;
        p.style.margin = '2px 0';
        p.style.borderBottom = '1px solid #333';
        debugContainer.appendChild(p);
        debugContainer.scrollTop = debugContainer.scrollHeight;
    };
    
    // --- Elementos de la página ---
    const voiceSelect = document.getElementById('voice-select');
    const textInput = document.getElementById('text-input');
    const speakButton = document.getElementById('speak-button');
    const audioOutput = document.getElementById('audio-output');
    const audioPlayer = document.getElementById('audio-player');
    const errorMessage = document.getElementById('error-message');

    logToScreen("Puter.js inicializado. Listo para generar voces.");

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    };

    const hideError = () => {
        errorMessage.classList.add('hidden');
    };

    const loadLanguages = () => {
        logToScreen("Cargando lista de idiomas soportados por Puter.js...");
        const languages = {
            "ar-AE": "Arabic",
            "ca-ES": "Catalan",
            "yue-CN": "Chinese (Cantonese)",
            "cmn-CN": "Chinese (Mandarin)",
            "da-DK": "Danish",
            "nl-BE": "Dutch (Belgian)",
            "nl-NL": "Dutch",
            "en-AU": "English (Australian)",
            "en-GB": "English (British)",
            "en-IN": "English (Indian)",
            "en-NZ": "English (New Zealand)",
            "en-ZA": "English (South African)",
            "en-US": "English (US)",
            "en-GB-WLS": "English (Welsh)",
            "fi-FI": "Finnish",
            "fr-FR": "French",
            "fr-BE": "French (Belgian)",
            "fr-CA": "French (Canadian)",
            "de-DE": "German",
            "de-AT": "German (Austrian)",
            "hi-IN": "Hindi",
            "is-IS": "Icelandic",
            "it-IT": "Italian",
            "ja-JP": "Japanese",
            "ko-KR": "Korean",
            "nb-NO": "Norwegian",
            "pl-PL": "Polish",
            "pt-BR": "Portuguese (Brazilian)",
            "pt-PT": "Portuguese (European)",
            "ro-RO": "Romanian",
            "ru-RU": "Russian",
            "es-ES": "Spanish (European)",
            "es-MX": "Spanish (Mexican)",
            "es-US": "Spanish (US)",
            "sv-SE": "Swedish",
            "tr-TR": "Turkish",
            "cy-GB": "Welsh"
        };

        voiceSelect.innerHTML = '<option value="" disabled selected>Selecciona un idioma...</option>';

        for (const [code, name] of Object.entries(languages)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            voiceSelect.appendChild(option);
        }
        logToScreen("¡Idiomas cargados!");
    };

    speakButton.addEventListener('click', async () => {
        const selectedLanguage = voiceSelect.value;
        const text = textInput.value.trim();

        if (!selectedLanguage || !text) {
            showError('Por favor, selecciona un idioma y escribe un texto.');
            return;
        }

        hideError();
        speakButton.disabled = true;
        document.getElementById('button-text').textContent = 'Generando...';
        document.getElementById('loading-spinner').classList.remove('hidden');
        audioOutput.classList.add('hidden');

        logToScreen(`Enviando texto a Puter.js con el idioma: ${selectedLanguage}`);

        try {
            const audio = await puter.ai.txt2speech(text, {
                language: selectedLanguage
            });

            logToScreen("¡Audio recibido de Puter.js!");

            audio.addEventListener('error', (e) => {
                throw new Error('El objeto de audio devolvió un error.');
            });

            // Puter.js devuelve un <audio> element. Necesitamos obtener su src.
            // Para hacer eso, esperamos a que los metadatos del audio se carguen.
            audio.addEventListener('loadedmetadata', () => {
                audioPlayer.src = audio.src;
                audioOutput.classList.remove('hidden');
                audioPlayer.play();
                logToScreen("Audio listo para reproducir.");
            });

             // Forzamos la carga de metadatos si no se dispara el evento
            if (audio.readyState >= 1) {
               audio.dispatchEvent(new Event('loadedmetadata'));
            }


        } catch (error) {
            logToScreen(`ALARMA: Falló la generación de audio con Puter.js. ${error.message}`);
            showError(`No se pudo generar el audio: ${error.message}`);
        } finally {
            speakButton.disabled = false;
            document.getElementById('button-text').textContent = 'Generar Audio';
            document.getElementById('loading-spinner').classList.add('hidden');
        }
    });

    loadLanguages();
});
