import * as THREE from 'three';
import { AudioManager } from './audio.js';

const audioManager = new AudioManager();

// --- CONFIGURACIÓN BÁSICA DE LA ESCENA (sin cambios) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 500, 1500);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

// --- ILUMINACIÓN (sin cambios) ---
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.position.set(-200, 250, 500);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -1000;
directionalLight.shadow.camera.right = 1000;
directionalLight.shadow.camera.top = 1000;
directionalLight.shadow.camera.bottom = -1000;
scene.add(directionalLight);

// --- PISTA Y GEOMETRÍA (sin cambios) ---
const ASPHALT_WIDTH = 19.6;
const trackPoints = [
    new THREE.Vector3(0, 0, -500), new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(200, 0, 200), new THREE.Vector3(400, 0, 0),
    new THREE.Vector3(600, 0, -200), new THREE.Vector3(800, 0, 0),
    new THREE.Vector3(800, 0, -500), new THREE.Vector3(600, 0, -700),
    new THREE.Vector3(400, 0, -500), new THREE.Vector3(200, 0, -700),
    new THREE.Vector3(-200, 0, -700),
];
const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'catmullrom', 0.5);
const trackLength = trackCurve.getLength();
function createAsphaltMaterial() { const size = 512; const colorCanvas = document.createElement('canvas'); colorCanvas.width = size; colorCanvas.height = size; const ctx = colorCanvas.getContext('2d'); ctx.fillStyle = '#303030'; ctx.fillRect(0, 0, size, size); for (let i = 0; i < 20000; i++) { const x = Math.random() * size; const y = Math.random() * size; const c = 40 + Math.random() * 30; ctx.fillStyle = `rgb(${c},${c},${c})`; ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2); ctx.fill(); } const colorMap = new THREE.CanvasTexture(colorCanvas); colorMap.wrapS = THREE.RepeatWrapping; colorMap.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.9, metalness: 0.1 }); }
function createCrowdTexture() { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#444'; ctx.fillRect(0,0,512,128); for(let i=0; i < 2000; i++) { const x = Math.random() * 512; const y = 32 + Math.random() * 96; const size = Math.random() * 2 + 1; ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, ${60 + Math.random() * 20}%)`; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); } return new THREE.CanvasTexture(canvas); }
function createFenceTexture() { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)'; ctx.lineWidth = 2; for(let i = -128; i < 256; i+=10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, 128); ctx.lineTo(i + 128, 0); ctx.stroke(); } const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; return texture; }
function createFlatTrackSegment(curve, width, material, yOffset = 0) { const segments = Math.floor(curve.getLength() / 2); const geometry = new THREE.BufferGeometry(); const positions = [], normals = [], uvs = [], indices = []; const repeatFactor = trackLength / 10; for (let i = 0; i <= segments; i++) { const p = i / segments; const point = curve.getPointAt(p); const tangent = curve.getTangentAt(p); const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize(); positions.push(point.x - normal.x * width / 2, yOffset, point.z - normal.z * width / 2); normals.push(0, 1, 0); uvs.push(0, p * repeatFactor); positions.push(point.x + normal.x * width / 2, yOffset, point.z + normal.z * width / 2); normals.push(0, 1, 0); uvs.push(width / 10, p * repeatFactor); } for (let i = 0; i < segments; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, b, c, b, d, c); } geometry.setIndex(indices); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; return mesh; }
scene.add(createFlatTrackSegment(trackCurve, ASPHALT_WIDTH, createAsphaltMaterial(), 0.01));
const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({color: 0x4a7931, roughness: 1}));
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.receiveShadow = true;
scene.add(groundPlane);

// --- LÓGICA DE ÁRBOLES OPTIMIZADA CON BOSQUE MIXTO ---
const MAX_TREES_PER_TYPE = 100;
const treeGeo = new THREE.PlaneGeometry(1, 1);
treeGeo.translate(0, 0.5, 0);

const treeTypes = ['frondoso', 'conifera', 'alamo'];
const treeMeshes = {};
const treeMaterials = {};

const textureLoader = new THREE.TextureLoader();

treeTypes.forEach(type => {
    treeMaterials[type] = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const instancedMesh1 = new THREE.InstancedMesh(treeGeo, treeMaterials[type], MAX_TREES_PER_TYPE);
    const instancedMesh2 = new THREE.InstancedMesh(treeGeo, treeMaterials[type], MAX_TREES_PER_TYPE);
    instancedMesh1.castShadow = false; instancedMesh2.castShadow = false;
    instancedMesh1.receiveShadow = true; instancedMesh2.receiveShadow = true;
    treeMeshes[type] = [instancedMesh1, instancedMesh2];
    scene.add(instancedMesh1, instancedMesh2);
});

function populateMixedForest() {
    const curvePoints = trackCurve.getSpacedPoints(200);
    const fenceOffset = ASPHALT_WIDTH / 2 + 1 + 1;
    const minSafeDistance = fenceOffset + 1;
    const dummy = new THREE.Object3D();

    const counts = { frondoso: 0, conifera: 0, alamo: 0 };

    for (let i = 0; i < (MAX_TREES_PER_TYPE * treeTypes.length) * 5; i++) {
        const x = (Math.random() - 0.5) * (3000 * 0.9);
        const z = (Math.random() - 0.5) * (3000 * 0.9);

        let minDistanceToTrack = Infinity;
        for (const point of curvePoints) {
            minDistanceToTrack = Math.min(minDistanceToTrack, Math.hypot(x - point.x, z - point.z));
        }

        if (minDistanceToTrack > minSafeDistance) {
            const randomTreeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
            if (counts[randomTreeType] < MAX_TREES_PER_TYPE) {
                const treeHeight = 10 + Math.random() * 15;
                const treeWidth = treeHeight / 1.8;
                dummy.position.set(x, 0, z);
                dummy.scale.set(treeWidth, treeHeight, 1);
                dummy.rotation.y = 0;
                dummy.updateMatrix();
                treeMeshes[randomTreeType][0].setMatrixAt(counts[randomTreeType], dummy.matrix);
                dummy.rotation.y = Math.PI / 2;
                dummy.updateMatrix();
                treeMeshes[randomTreeType][1].setMatrixAt(counts[randomTreeType], dummy.matrix);
                counts[randomTreeType]++;
            }
        }
        if (treeTypes.every(type => counts[type] >= MAX_TREES_PER_TYPE)) break;
    }

    treeTypes.forEach(type => {
        treeMeshes[type][0].count = counts[type];
        treeMeshes[type][1].count = counts[type];
        treeMeshes[type][0].instanceMatrix.needsUpdate = true;
        treeMeshes[type][1].instanceMatrix.needsUpdate = true;
    });
}

// --- CREACIÓN DEL ESCENARIO ---
function createScenery() {
    const crowdMaterial = new THREE.MeshBasicMaterial({ map: createCrowdTexture() });
    const fenceMaterial = new THREE.MeshBasicMaterial({ map: createFenceTexture(), transparent: true, alphaTest: 0.1 });
    fenceMaterial.map.repeat.set(80, 1);
    const sceneryPlanes = [ { progress: 0.95, side: 'outer', size: new THREE.Vector2(150, 30), material: crowdMaterial }, { progress: 0.2, side: 'outer', size: new THREE.Vector2(100, 25), material: crowdMaterial }, { progress: 0.6, side: 'outer', size: new THREE.Vector2(120, 28), material: crowdMaterial }, ];

    sceneryPlanes.forEach(p => {
        const point = trackCurve.getPointAt(p.progress);
        const tangent = trackCurve.getTangentAt(p.progress);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const sideMultiplier = p.side === 'outer' ? 1 : -1;
        const offset = ASPHALT_WIDTH / 2 + 8;
        const planeGeo = new THREE.PlaneGeometry(p.size.x, p.size.y);
        const plane = new THREE.Mesh(planeGeo, p.material);
        plane.position.copy(point).add(normal.clone().multiplyScalar(offset * sideMultiplier));
        plane.position.y = p.size.y / 2;
        plane.lookAt(point);
        scene.add(plane);
    });
}

// --- LÍNEA DE META ---
function createFinishLine() {
    const finishLineTexture = new THREE.CanvasTexture(createCheckerboardCanvas(10, 10));
    finishLineTexture.wrapS = THREE.RepeatWrapping;
    finishLineTexture.wrapT = THREE.RepeatWrapping;
    finishLineTexture.repeat.set(10, 1);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ map: finishLineTexture, side: THREE.DoubleSide });
    const finishLineGeo = new THREE.PlaneGeometry(ASPHALT_WIDTH, 5);
    const finishLine = new THREE.Mesh(finishLineGeo, finishLineMaterial);

    const finishPoint = trackCurve.getPointAt(0.0001);
    const tangent = trackCurve.getTangentAt(0.0001);
    finishLine.position.copy(finishPoint);
    finishLine.position.y += 0.02;
    finishLine.lookAt(finishPoint.clone().add(tangent));
    finishLine.rotation.x = -Math.PI / 2;
    scene.add(finishLine);
}

function createCheckerboardCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'black';
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if ((i + j) % 2 == 0) {
                context.fillRect(j, i, 1, 1);
            }
        }
    }
    return canvas;
}

// --- LÓGICA DEL COCHE Y CONTROLES (NUEVA IMPLEMENTACIÓN) ---
const car = new THREE.Group();
const carBody = new THREE.Mesh( new THREE.BoxGeometry(2, 0.8, 4.5), new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.3, metalness: 0.2 }) );
carBody.castShadow = true;
car.add(carBody);
scene.add(car);

// Estado del juego y del coche
let isEngineOn = false;
let carSpeed = 0; // en m/s
let trackProgress = 0.001;
let lateralOffset = 0;

// Parámetros de física y control
const MAX_SPEED = 80; // m/s (approx. 288 km/h)
const ACCELERATION = 15; // m/s^2
const BRAKING_FORCE = 30; // m/s^2
const DRAG_COEFFICIENT = 0.5; // Fricción del aire
const STEER_SPEED = 1.5; // Radianes por segundo

// Objeto para registrar las teclas presionadas
const controls = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
};

// Listeners de teclado
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'a':
            isEngineOn = !isEngineOn;
            if (isEngineOn) {
                audioManager.startEngine();
            } else {
                audioManager.stopEngine();
            }
            break;
        case 'arrowup':
            controls.accelerate = true;
            break;
        case 'arrowdown':
            controls.brake = true;
            if (carSpeed > 30) audioManager.playSfx('skid');
            break;
        case 'arrowleft':
            controls.steerLeft = true;
            audioManager.playSfx('shiftDown');
            break;
        case 'arrowright':
            controls.steerRight = true;
            audioManager.playSfx('shiftUp');
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'arrowup':
            controls.accelerate = false;
            if (carSpeed > 40) audioManager.playSfx('backfire');
            break;
        case 'arrowdown':
            controls.brake = false;
            break;
        case 'arrowleft':
            controls.steerLeft = false;
            break;
        case 'arrowright':
            controls.steerRight = false;
            break;
    }
});

// --- LÓGICA DE CONTROLES TÁCTILES ---
const joystickContainer = document.getElementById('joystick-container');
const joystickStick = document.getElementById('joystick-stick');
const joystickRadius = 75;
let joystickActive = false;

const handleJoystickMove = (clientX, clientY) => {
    const rect = joystickContainer.getBoundingClientRect();
    const x = clientX - rect.left - joystickRadius;
    const y = clientY - rect.top - joystickRadius;
    const distance = Math.min(joystickRadius, Math.hypot(x, y));
    const angle = Math.atan2(y, x);
    const stickX = distance * Math.cos(angle);
    const stickY = distance * Math.sin(angle);
    joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    const xValue = stickX / joystickRadius;
    const yValue = -stickY / joystickRadius;

    controls.accelerate = yValue > 0.15;
    controls.brake = yValue < -0.15;
    controls.steerLeft = xValue < -0.15;
    controls.steerRight = xValue > 0.15;
};

const stopJoystick = () => {
    joystickActive = false;
    joystickStick.style.transform = 'translate(0px, 0px)';
    controls.accelerate = false;
    controls.brake = false;
    controls.steerLeft = false;
    controls.steerRight = false;
};

joystickContainer.addEventListener('touchstart', (e) => { joystickActive = true; handleJoystickMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY); e.preventDefault(); }, { passive: false });
joystickContainer.addEventListener('touchmove', (e) => { if (!joystickActive) return; handleJoystickMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY); e.preventDefault(); }, { passive: false });
joystickContainer.addEventListener('touchend', stopJoystick);
joystickContainer.addEventListener('touchcancel', stopJoystick);

document.getElementById('touch-engine').addEventListener('click', () => {
    isEngineOn = !isEngineOn;
    if (isEngineOn) {
        audioManager.startEngine();
    } else {
        audioManager.stopEngine();
    }
});

// --- BUCLE DE ANIMACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // --- CÓDIGO DE DIAGNÓSTICO DE ESCENA CONGELADA ---
    // Posicionar el coche en un punto fijo de la pista
    const carPosition = trackCurve.getPointAt(0.01);
    car.position.copy(carPosition);
    car.lookAt(trackCurve.getPointAt(0.02));

    // Posicionar la cámara en un punto fijo detrás del coche
    camera.position.set(car.position.x, car.position.y + 5, car.position.z + 15);
    camera.lookAt(car.position);

    // Renderizar la escena
    renderer.render(scene, camera);
}

// --- INICIO DEL JUEGO ---
const startOverlay = document.getElementById('start-overlay');
const startGameButton = document.getElementById('start-game-button');

startGameButton.addEventListener('click', async () => {
    startOverlay.style.display = 'none';

    await audioManager.init();

    // Restaurar la creación del mundo
    populateMixedForest();
    createScenery();
    createFinishLine();

    // Mostrar controles táctiles si el dispositivo es compatible
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('touch-controls-container').style.display = 'flex';
    } else {
        // Opcional: ocultar completamente los controles si no es un dispositivo táctil
        document.getElementById('touch-controls-container').style.display = 'none';
    }

    animate();
}, { once: true });


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
