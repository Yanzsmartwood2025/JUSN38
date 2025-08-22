document.addEventListener('DOMContentLoaded', () => {
    console.log('Compresor de Video listo.');

    const { createFFmpeg, fetchFile } = FFmpeg;
    let ffmpeg;

    // --- DOM Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const optionsArea = document.getElementById('options-area');
    const statusArea = document.getElementById('status-area');
    const statusMessages = document.getElementById('status-messages');
    const downloadLink = document.getElementById('download-link');
    const compressButton = document.getElementById('compress-button');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const outputFormatSelect = document.getElementById('output-format');

    let uploadedFile = null;

    // --- Initialization ---
    async function init() {
        logStatus('Cargando ffmpeg-core.js...');
        try {
            ffmpeg = createFFmpeg({
                log: true,
                logger: ({ message }) => logStatus(message),
                progress: ({ ratio }) => {
                    if (ratio >= 0 && ratio <= 1) {
                         // This log can be noisy, so we can comment it out if needed
                         // logStatus(`Procesando: ${(ratio * 100).toFixed(2)}%`);
                    }
                }
            });
            await ffmpeg.load();
            logStatus('FFmpeg cargado exitosamente.', 'success');
        } catch (error) {
            logStatus('Error al cargar FFmpeg. Revisa la consola.', 'error');
            console.error(error);
        }
    }
    init();


    // --- UI Listeners ---
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-purple-500'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-purple-500'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500');
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    compressButton.addEventListener('click', compressVideo);

    // --- Core Functions ---
    function handleFileSelect(file) {
        uploadedFile = file;
        statusArea.classList.remove('hidden');
        logStatus(`Archivo seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        optionsArea.classList.remove('hidden');
        downloadLink.classList.add('hidden');
        // Clear previous status messages except the first one
        while (statusMessages.children.length > 1) {
            statusMessages.removeChild(statusMessages.lastChild);
        }
    }

    function logStatus(message, type = 'info') {
        const p = document.createElement('p');
        const timestamp = `[${new Date().toLocaleTimeString()}]`;
        p.innerHTML = `<span class="text-gray-500">${timestamp}</span> ${message}`;

        switch(type) {
            case 'error': p.classList.add('text-red-400'); break;
            case 'success': p.classList.add('text-green-400'); break;
            default: p.classList.add('text-gray-300');
        }

        statusMessages.appendChild(p);
        statusMessages.scrollTop = statusMessages.scrollHeight;
    }

    async function compressVideo() {
        if (!uploadedFile) {
            logStatus('Error: No se ha seleccionado ningún archivo.', 'error');
            return;
        }
        if (!ffmpeg.isLoaded()) {
            logStatus('Error: FFmpeg no está cargado todavía.', 'error');
            return;
        }

        setCompressingState(true);

        try {
            const { name } = uploadedFile;
            const outputFormat = outputFormatSelect.value;
            const quality = qualitySlider.value;
            const outputFilename = `comprimido-${Date.now()}.${outputFormat}`;

            logStatus(`Escribiendo archivo en memoria virtual: ${name}`);
            ffmpeg.FS('writeFile', name, await fetchFile(uploadedFile));

            logStatus('Construyendo comando FFmpeg...');
            const command = [
                '-i', name,
                '-c:v', outputFormat === 'webm' ? 'libvpx-vp9' : 'libx264',
                '-crf', quality,
                '-preset', 'fast', // Faster preset for better browser experience
                '-b:v', '0', // CRF mode
                '-an', // Remove audio track for smaller size
                outputFilename
            ];

            if (outputFormat === 'gif') {
                // Specific command for GIF
                command.length = 0; // Clear array
                command.push(
                    '-i', name,
                    '-vf', 'fps=15,scale=480:-1:flags=lanczos',
                    outputFilename
                );
            }

            logStatus(`Ejecutando comando: ffmpeg ${command.join(' ')}`);
            await ffmpeg.run(...command);

            logStatus('Lectura del archivo resultante...');
            const data = ffmpeg.FS('readFile', outputFilename);

            logStatus('Creando enlace de descarga...', 'success');
            const blob = new Blob([data.buffer], { type: outputFormat === 'mp4' ? 'video/mp4' : (outputFormat === 'webm' ? 'video/webm' : 'image/gif') });
            const url = URL.createObjectURL(blob);

            downloadLink.href = url;
            downloadLink.download = outputFilename;
            downloadLink.classList.remove('hidden');

            logStatus(`¡Éxito! Tamaño final: ${(data.buffer.byteLength / 1024 / 1024).toFixed(2)} MB`, 'success');

            // Clean up virtual file system
            ffmpeg.FS('unlink', name);
            ffmpeg.FS('unlink', outputFilename);

        } catch (error) {
            logStatus(`Error durante la compresión: ${error}`, 'error');
            console.error(error);
        } finally {
            setCompressingState(false);
        }
    }

    function setCompressingState(isCompressing) {
        compressButton.disabled = isCompressing;
        if (isCompressing) {
            compressButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Comprimiendo...';
            downloadLink.classList.add('hidden');
        } else {
            compressButton.innerHTML = '<i class="fas fa-cogs mr-2"></i> Comprimir Video';
        }
    }
});
