document.addEventListener('DOMContentLoaded', () => {
    // Selectores de los elementos del DOM
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const speakButton = document.getElementById('speak-button');
    const buttonText = document.getElementById('button-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    const audioOutput = document.getElementById('audio-output');
    const audioPlayer = document.getElementById('audio-player');
    const errorMessage = document.getElementById('error-message');

    // La URL de nuestra API. Vercel sabe que /api/tts debe ir a app.py
    const apiUrl = '/api/tts';

    // Función para obtener y poblar la lista de voces
    const fetchVoices = async () => {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.statusText}`);
            }
            const voices = await response.json();

            voiceSelect.innerHTML = '<option value="">-- Elige una voz --</option>';

            const languages = {};
            for (const voiceId in voices) {
                const voice = voices[voiceId];
                const lang = voice.language;
                if (!languages[lang]) {
                    languages[lang] = document.createElement('optgroup');
                    languages[lang].label = lang.toUpperCase();
                }
                const option = document.createElement('option');
                option.value = voiceId;
                option.textContent = `${voice.name} (${voice.gender})`;
                languages[lang].appendChild(option);
            }

            Object.values(languages).forEach(group => voiceSelect.appendChild(group));

        } catch (error) {
            console.error('Error al cargar las voces:', error);
            showError('No se pudieron cargar las voces desde el servidor.');
        }
    };

    // Función para generar el audio
    const speakText = async () => {
        const text = textInput.value.trim();
        const voiceId = voiceSelect.value;

        if (!text) {
            showError('Por favor, escribe un texto para generar el audio.');
            return;
        }
        if (!voiceId) {
            showError('Por favor, selecciona una voz de la lista.');
            return;
        }

        setLoading(true);
        hideError();
        audioOutput.classList.add('hidden');

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, voice: voiceId }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido al generar el audio.');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            audioPlayer.src = audioUrl;
            audioOutput.classList.remove('hidden');

        } catch (error) {
            console.error('Error al generar el audio:', error);
            showError(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    // Funciones de ayuda para la UI
    const setLoading = (isLoading) => {
        speakButton.disabled = isLoading;
        loadingSpinner.classList.toggle('hidden', !isLoading);
        buttonText.textContent = isLoading ? 'Generando...' : 'Generar Audio';
    };

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    };
    
    const hideError = () => {
        errorMessage.classList.add('hidden');
    };

    // Event Listeners
    speakButton.addEventListener('click', speakText);

    // Cargar las voces al inicio
    fetchVoices();
});

