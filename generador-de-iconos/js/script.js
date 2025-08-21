const imageUploader = document.getElementById('image-uploader');
const generateBtn = document.getElementById('generate-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const iconsGrid = document.getElementById('icons-grid');
const resultsContainer = document.getElementById('results-container');
const imagePreview = document.getElementById('image-preview');
const imagePreviewContainer = document.getElementById('image-preview-container');
const fileLabel = document.getElementById('file-label');
const filenameInput = document.getElementById('filename-input');
const platformSelector = document.getElementById('platform-selector');

let uploadedFile = null;
const generatedIcons = [];
let selectedPlatform = 'pwa'; // Default platform

// Define los sets de iconos para cada plataforma
const iconSets = {
    pwa: [
        { size: 512, purpose: 'Splash Screen' },
        { size: 192, purpose: 'Icono Principal' },
        { size: 180, purpose: 'Apple Touch Icon' },
        { size: 144, purpose: 'Windows Tile' },
        { size: 48, purpose: 'Favicon' },
    ],
    android: [
        { size: 192, purpose: 'xxxhdpi' },
        { size: 144, purpose: 'xxhdpi' },
        { size: 96, purpose: 'xhdpi' },
        { size: 72, purpose: 'hdpi' },
        { size: 48, purpose: 'mdpi' },
        { size: 512, purpose: 'Play Store' },
    ],
    ios: [
        { size: 1024, purpose: 'App Store' },
        { size: 180, purpose: 'iPhone Retina HD' },
        { size: 120, purpose: 'iPhone Retina' },
        { size: 152, purpose: 'iPad Retina' },
        { size: 167, purpose: 'iPad Pro' },
        { size: 80, purpose: 'Spotlight' },
    ]
};

// Manejador para la selección de plataforma
platformSelector.addEventListener('click', (e) => {
    const button = e.target.closest('.platform-btn');
    if (!button) return;

    // Actualiza el estado visual de los botones
    platformSelector.querySelectorAll('.platform-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Guarda la plataforma seleccionada
    selectedPlatform = button.dataset.platform;
});

imageUploader.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        fileLabel.textContent = file.name;
        generateBtn.disabled = false;
    }
});

generateBtn.addEventListener('click', () => {
    if (!uploadedFile) return;
    const baseFilename = filenameInput.value.trim() || 'icon';
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generando...';
    iconsGrid.innerHTML = '';
    generatedIcons.length = 0;

    const image = new Image();
    image.src = URL.createObjectURL(uploadedFile);

    image.onload = () => {
        const sizesToGenerate = iconSets[selectedPlatform]; // Usa el set de iconos seleccionado

        sizesToGenerate.forEach(item => {
            const canvas = document.createElement('canvas');
            canvas.width = item.size;
            canvas.height = item.size;
            const ctx = canvas.getContext('2d');

            // Recorta la imagen a 1:1 desde el centro
            const cropSize = Math.min(image.width, image.height);
            const cropX = (image.width - cropSize) / 2;
            const cropY = (image.height - cropSize) / 2;
            ctx.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/png');
            const filename = `${baseFilename}-${item.size}x${item.size}.png`;
            generatedIcons.push({ filename, dataUrl });

            const iconCard = document.createElement('a');
            iconCard.href = dataUrl;
            iconCard.download = filename;
            iconCard.className = 'icon-card p-4 rounded-lg flex flex-col items-center text-center space-y-2 no-underline';
            const imgElement = document.createElement('img');
            imgElement.src = dataUrl;
            imgElement.className = 'w-24 h-24 object-contain';
            const sizeLabel = document.createElement('p');
            sizeLabel.className = 'font-semibold text-white title-font';
            sizeLabel.textContent = `${item.size}x${item.size}`;
            const purposeLabel = document.createElement('p');
            purposeLabel.className = 'text-xs text-gray-400';
            purposeLabel.textContent = item.purpose;
            iconCard.appendChild(imgElement);
            iconCard.appendChild(sizeLabel);
            iconCard.appendChild(purposeLabel);
            iconsGrid.appendChild(iconCard);
        });

        resultsContainer.classList.remove('hidden');
        generateBtn.disabled = false;
        generateBtn.textContent = '4. GENERAR DE NUEVO';
    };
});

downloadAllBtn.addEventListener('click', () => {
    if (generatedIcons.length === 0) return;
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = 'Comprimiendo...';
    const zip = new JSZip();
    for (const icon of generatedIcons) {
        const base64Data = icon.dataUrl.split(',')[1];
        zip.file(icon.filename, base64Data, { base64: true });
    }
    zip.generateAsync({ type: "blob" }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${selectedPlatform}-icons.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = 'DESCARGAR TODO (.zip)';
    });
});
