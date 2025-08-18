import * as THREE from 'three';
import { AudioManager } from './audio.js';

const settings = {
    sfx: true,
    vibration: true
};

const audioManager = new AudioManager(settings, (file) => {
    const loadingText = document.querySelector("#loading-overlay p");
    if (loadingText) loadingText.textContent = `Cargando Sonido: ${file}...`;
});

// --- CONFIGURACIÓN BÁSICA DE LA ESCENA ---
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

// --- ILUMINACIÓN ---
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

// --- CONSTANTES Y VARIABLES DEL JUEGO ---
const ASPHALT_WIDTH = 19.6; // 14 * 1.4
const CURB_WIDTH = 1;
const FENCE_BUFFER = 1;
const GRASS_SIZE = 2500;
const trackPoints = [
    new THREE.Vector3(0, 0, -500), new THREE.Vector3(0, 0, 0), // Recta de inicio
    new THREE.Vector3(200, 0, 200), new THREE.Vector3(400, 0, 0), // Curva 1
    new THREE.Vector3(600, 0, -200), // Extensión 1
    new THREE.Vector3(800, 0, 0), // Nueva curva amplia
    new THREE.Vector3(800, 0, -500), // Recta larga
    new THREE.Vector3(600, 0, -700), // Extensión 2
    new THREE.Vector3(400, 0, -500), new THREE.Vector3(200, 0, -700), // Curva 2
    new THREE.Vector3(-200, 0, -700),
];
const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'catmullrom', 0.5);
const trackLength = trackCurve.getLength();

// --- GENERADORES DE TEXTURAS Y MATERIALES (Sin cambios) ---
function createAsphaltMaterial() { const size = 512; const colorCanvas = document.createElement('canvas'); colorCanvas.width = size; colorCanvas.height = size; const ctx = colorCanvas.getContext('2d'); ctx.fillStyle = '#303030'; ctx.fillRect(0, 0, size, size); for (let i = 0; i < 20000; i++) { const x = Math.random() * size; const y = Math.random() * size; const c = 40 + Math.random() * 30; ctx.fillStyle = `rgb(${c},${c},${c})`; ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2); ctx.fill(); } const colorMap = new THREE.CanvasTexture(colorCanvas); colorMap.wrapS = THREE.RepeatWrapping; colorMap.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.9, metalness: 0.1 }); }
function createCurbTexture() { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 32; canvas.height = 32; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 32, 16); ctx.fillStyle = '#FF0000'; ctx.fillRect(0, 16, 32, 16); const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; return texture; }
function createGrassMaterial() { const size = 512; const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#3a5921'; ctx.fillRect(0, 0, size, size); for (let i = 0; i < 15000; i++) { const x = Math.random() * size; const y = Math.random() * size; const lightness = Math.random() * 0.15; ctx.fillStyle = `rgba(255, 255, 150, ${lightness})`; ctx.fillRect(x, y, 2, 2); } const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(GRASS_SIZE / 50, GRASS_SIZE / 50); return new THREE.MeshStandardMaterial({ map: texture, roughness: 1, color: 0x4a7931 }); }
function createCrowdTexture() { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#444'; ctx.fillRect(0,0,512,128); for(let i=0; i < 2000; i++) { const x = Math.random() * 512; const y = 32 + Math.random() * 96; const size = Math.random() * 2 + 1; ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, ${60 + Math.random() * 20}%)`; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); } return new THREE.CanvasTexture(canvas); }
function createFenceTexture() { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.strokeStyle = 'rgba(100, 100, 100, 0.7)'; ctx.lineWidth = 2; for(let i = -128; i < 256; i+=10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i, 128); ctx.lineTo(i + 128, 0); ctx.stroke(); } const texture = new THREE.CanvasTexture(canvas); texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; return texture; }
function createFlatTrackSegment(curve, width, material, yOffset = 0) { const segments = Math.floor(curve.getLength() / 2); const geometry = new THREE.BufferGeometry(); const positions = [], normals = [], uvs = [], indices = []; const repeatFactor = trackLength / 10; for (let i = 0; i <= segments; i++) { const p = i / segments; const point = curve.getPointAt(p); const tangent = curve.getTangentAt(p); const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize(); positions.push(point.x - normal.x * width / 2, yOffset, point.z - normal.z * width / 2); normals.push(0, 1, 0); uvs.push(0, p * repeatFactor); positions.push(point.x + normal.x * width / 2, yOffset, point.z + normal.z * width / 2); normals.push(0, 1, 0); uvs.push(width / 10, p * repeatFactor); } for (let i = 0; i < segments; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, b, c, b, d, c); } geometry.setIndex(indices); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; return mesh; }
function createOffsetFlatTrackSegment(curve, width, material, offset, yOffset) { const segments = Math.floor(curve.getLength() / 2); const geometry = new THREE.BufferGeometry(); const positions = [], normals = [], uvs = [], indices = []; for (let i = 0; i <= segments; i++) { const p = i / segments; const point = curve.getPointAt(p); const tangent = curve.getTangentAt(p); const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize(); const basePoint = point.clone().add(normal.clone().multiplyScalar(offset)); const textureRepeatFactor = 1 / (1.5 * 2); positions.push(basePoint.x - normal.x * width / 2, yOffset, basePoint.z - normal.z * width / 2); normals.push(0, 1, 0); uvs.push(0, p * trackLength * textureRepeatFactor); positions.push(basePoint.x + normal.x * width / 2, yOffset, basePoint.z + normal.z * width / 2); normals.push(0, 1, 0); uvs.push(1, p * trackLength * textureRepeatFactor); } for (let i = 0; i < segments; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, b, c, b, d, c); } geometry.setIndex(indices); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return new THREE.Mesh(geometry, material); }

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
    const fenceOffset = ASPHALT_WIDTH / 2 + CURB_WIDTH + FENCE_BUFFER;
    const minSafeDistance = fenceOffset + 1;
    const dummy = new THREE.Object3D();

    const counts = { frondoso: 0, conifera: 0, alamo: 0 };

    for (let i = 0; i < (MAX_TREES_PER_TYPE * treeTypes.length) * 5; i++) {
        const x = (Math.random() - 0.5) * (GRASS_SIZE * 0.9);
        const z = (Math.random() - 0.5) * (GRASS_SIZE * 0.9);

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

    const fenceHeight = 3;
    const fenceOffset = ASPHALT_WIDTH / 2 + CURB_WIDTH + FENCE_BUFFER;
    const fenceSegments = 400; // Aumentado para la pista más larga
    const fenceGeo = new THREE.PlaneGeometry(trackLength / fenceSegments, fenceHeight);
    for (let i = 0; i < fenceSegments; i++) {
        const progress = i / fenceSegments;
        const point = trackCurve.getPointAt(progress);
        const tangent = trackCurve.getTangentAt(progress);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const fence_outer = new THREE.Mesh(fenceGeo, fenceMaterial);
        fence_outer.position.copy(point).add(normal.clone().multiplyScalar(fenceOffset));
        fence_outer.position.y = fenceHeight / 2;
        fence_outer.lookAt(point);
        scene.add(fence_outer);
        const fence_inner = new THREE.Mesh(fenceGeo, fenceMaterial);
        fence_inner.position.copy(point).add(normal.clone().multiplyScalar(-fenceOffset));
        fence_inner.position.y = fenceHeight / 2;
        fence_inner.lookAt(point.clone().add(normal.clone().multiplyScalar(-100)));
        scene.add(fence_inner);
    }
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

    const finishPoint = trackCurve.getPointAt(0.0001); // Ligeramente después del inicio
    const tangent = trackCurve.getTangentAt(0.0001);
    finishLine.position.copy(finishPoint);
    finishLine.position.y += 0.02; // Reducido para que esté más pegado
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

// --- INICIALIZACIÓN DE LA ESCENA ---
scene.add(createFlatTrackSegment(trackCurve, ASPHALT_WIDTH, createAsphaltMaterial(), 0.01));
const curbMaterial = new THREE.MeshStandardMaterial({ map: createCurbTexture(), roughness: 0.7 });
const curbOffset = ASPHALT_WIDTH / 2 + CURB_WIDTH / 2;
scene.add(createOffsetFlatTrackSegment(trackCurve, CURB_WIDTH, curbMaterial, -curbOffset, 0.02));
scene.add(createOffsetFlatTrackSegment(trackCurve, CURB_WIDTH, curbMaterial, curbOffset, 0.02));
const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(GRASS_SIZE, GRASS_SIZE), createGrassMaterial());
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.receiveShadow = true;
scene.add(groundPlane);
createScenery();

// --- LÓGICA DEL COCHE Y CONTROLES ---
const car = new THREE.Group();
const carBody = new THREE.Mesh( new THREE.BoxGeometry(2, 0.8, 4.5), new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.3, metalness: 0.2 }) );
carBody.castShadow = true; car.add(carBody);
const carCabin = new THREE.Mesh( new THREE.BoxGeometry(1.4, 0.7, 2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, transparent: true, opacity: 0.8 }) );
carCabin.position.set(0, 0.75, -0.2); car.add(carCabin);
scene.add(car);

// --- FÍSICA DEL VEHÍCULO ---
let carSpeed = 0; // en m/s
let engineRPM = 0;
let currentGear = 2; // Empezar en Primera Marcha
let trackProgress = 0.001;
let lateralOffset = 0;

const MAX_LATERAL_OFFSET = ASPHALT_WIDTH / 2 - 1.2;
const STEER_SENSITIVITY = 2.5; // A mayor valor, más sensible
const MAX_SPEED = 90; // m/s, approx 324 km/h
const DRAG_COEFFICIENT = 0.4257;
const ROLLING_RESISTANCE = 30.0;
const BRAKE_FORCE = 8000.0;
const WHEEL_RADIUS = 0.33; // en metros

const gearRatios = [-2.90, 0, 2.66, 1.78, 1.30, 1.0, 0.74]; // R, N, 1, 2, 3, 4, 5
const finalDriveRatio = 3.42;
const IDLE_RPM = 800;
const MAX_RPM = 6500;
const ENGINE_POWER = 950; // Caballos de fuerza
const MAX_TORQUE = (ENGINE_POWER * 745.7) / (5252 * Math.PI / 30); // Convertir HP a torque en N·m

function getEngineTorque(rpm) {
    if (rpm < IDLE_RPM) return 0;
    if (rpm > MAX_RPM) return 0;
    // Curva de torque simplificada
    const peakRpm = 4600;
    if (rpm < peakRpm) {
        return MAX_TORQUE * (rpm - IDLE_RPM) / (peakRpm - IDLE_RPM);
    } else {
        return MAX_TORQUE * (1 - (rpm - peakRpm) / (MAX_RPM - peakRpm));
    }
}
let gameState = 'COUNTDOWN'; // COUNTDOWN, RACE, SPECTATOR, FINISHED
const aiCars = [];
const raceData = {
    laps: 1,
    player: { lap: 0, finished: false, finishTime: 0 },
    ai: []
};

const controls = {
    throttle: 0,
    brake: 0,
    steer: 0,
    gearUp: false,
    gearDown: false
};

document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': controls.throttle = 1; break;
        case 's': case 'arrowdown': controls.brake = 1; break;
        case 'a': case 'arrowleft': controls.steer = -1; break;
        case 'd': case 'arrowright': controls.steer = 1; break;
        case 'e': controls.gearUp = true; break;
        case 'q': controls.gearDown = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup': controls.throttle = 0; break;
        case 's': case 'arrowdown': controls.brake = 0; break;
        case 'a': case 'arrowleft': controls.steer = 0; break;
        case 'd': case 'arrowright': controls.steer = 0; break;
        case 'e': controls.gearUp = false; break;
        case 'q': controls.gearDown = false; break;
    }
});

const touchButtonIds = {
    'touch-accelerate': 'throttle',
    'touch-brake': 'brake',
    'touch-gear-up': 'gearUp',
    'touch-gear-down': 'gearDown'
};

for (const id in touchButtonIds) {
    const element = document.getElementById(id);
    if (!element) continue;
    const controlKey = touchButtonIds[id];

    const press = (e) => {
        e.preventDefault();
        controls[controlKey] = (controlKey === 'throttle' || controlKey === 'brake') ? 1 : true;
    };
    const release = (e) => {
        e.preventDefault();
        controls[controlKey] = (controlKey === 'throttle' || controlKey === 'brake') ? 0 : false;
    };

    element.addEventListener('touchstart', press, { passive: false });
    element.addEventListener('touchend', release);
    element.addEventListener('touchcancel', release);

    element.addEventListener('mousedown', press);
    element.addEventListener('mouseup', release);
    element.addEventListener('mouseleave', release);
}

// Joystick Logic
const joystickContainer = document.getElementById('joystick-container');
const joystickStick = document.getElementById('joystick-stick');
const joystickRadius = 75; // Half of the container's width (150px)
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
    controls.steer = stickX / joystickRadius;
};

const stopJoystick = () => {
    joystickActive = false;
    joystickStick.style.transform = 'translate(0px, 0px)';
    controls.steer = 0;
};

// Touch Events
joystickContainer.addEventListener('touchstart', (e) => {
    joystickActive = true;
}, { passive: false });
joystickContainer.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    handleJoystickMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
}, { passive: false });
joystickContainer.addEventListener('touchend', stopJoystick);
joystickContainer.addEventListener('touchcancel', stopJoystick);

// Mouse Events
joystickContainer.addEventListener('mousedown', (e) => {
    joystickActive = true;
});
joystickContainer.addEventListener('mousemove', (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    handleJoystickMove(e.clientX, e.clientY);
});
joystickContainer.addEventListener('mouseup', stopJoystick);
joystickContainer.addEventListener('mouseleave', stopJoystick);

let cameraMode = 0;
const cameraButton = document.getElementById('camera-button');
cameraButton.addEventListener('click', () => { cameraMode = (cameraMode + 1) % 3; });
const cameraSettings = [
    { offset: new THREE.Vector3(0, 8, 15), lookAt: new THREE.Vector3(0, 2, 0) },
    { offset: new THREE.Vector3(0, 4, 8), lookAt: new THREE.Vector3(0, 1.5, 0) },
    { offset: new THREE.Vector3(0, 1.4, 0.2), lookAt: new THREE.Vector3(0, 1.2, -10) }
];
const clock = new THREE.Clock();

// --- LÓGICA DE IA Y COCHES ADICIONALES ---
function createAICars() {
    const carColors = [0x0000ff, 0x00ff00, 0xffff00, 0xffa500, 0x800080, 0x00ffff, 0xffffff];
    for (let i = 0; i < 7; i++) {
        const aiCarBody = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.5), new THREE.MeshStandardMaterial({ color: carColors[i], roughness: 0.4 }));
        const aiCar = new THREE.Group();
        aiCar.add(aiCarBody);

        const row = Math.floor(i / 2);
        const side = (i % 2 === 0) ? -1 : 1; // -1 para la izquierda, 1 para la derecha

        aiCar.userData = {
            trackProgress: -0.012 * (row + 1),
            lateralOffset: side * (ASPHALT_WIDTH / 4.5),
            speed: MAX_SPEED * 0.8, // Empezar a 80% de la velocidad máxima
            skill: 0.85 + Math.random() * 0.15 // Nivel de habilidad de 85% a 100%
        };
        aiCars.push(aiCar);
        scene.add(aiCar);
        raceData.ai.push({ lap: 0, finished: false, finishTime: 0 });
    }
}

function updateAICars(delta) {
    aiCars.forEach((aiCar, i) => {
        if (raceData.ai[i].finished) return;

        // --- Ajuste de velocidad basado en la curvatura ---
        const currentProgress = aiCar.userData.trackProgress;
        const aheadProgress = (currentProgress + 0.005) % 1; // Mirar un poco hacia adelante

        const currentTangent = trackCurve.getTangentAt(currentProgress);
        const aheadTangent = trackCurve.getTangentAt(aheadProgress);
        const curvature = Math.abs(currentTangent.angleTo(aheadTangent));

        // La velocidad máxima está determinada por la habilidad, reducida por la curvatura
        const maxSkillSpeed = MAX_SPEED * aiCar.userData.skill;
        const speedReduction = Math.min(curvature * 10, 0.4); // Reducir la velocidad hasta un 40% en las curvas más cerradas
        const targetSpeed = maxSkillSpeed * (1 - speedReduction);

        // Ajustar suavemente la velocidad actual hacia la velocidad objetivo
        aiCar.userData.speed = THREE.MathUtils.lerp(aiCar.userData.speed, targetSpeed, 0.08);

        // --- Actualizar posición ---
        const oldProgress = currentProgress;
        aiCar.userData.trackProgress = (oldProgress + (aiCar.userData.speed / trackLength) * delta + 1) % 1;
        checkLapCompletion(aiCar, raceData.ai[i], oldProgress);

        // --- Movimiento lateral y evasión de colisiones ---
        if (Math.random() < 0.01) {
            aiCar.userData.lateralOffset += (Math.random() - 0.5) * 0.5;
        }

        aiCars.forEach(otherCar => {
            if (aiCar === otherCar) return;

            const progressDiff = Math.abs(aiCar.userData.trackProgress - otherCar.userData.trackProgress);
            const lateralDiff = Math.abs(aiCar.userData.lateralOffset - otherCar.userData.lateralOffset);

            if (progressDiff < 0.01 && lateralDiff < 2.5) {
                const avoidanceForce = 0.05;
                if (aiCar.userData.lateralOffset > otherCar.userData.lateralOffset) {
                    aiCar.userData.lateralOffset += avoidanceForce;
                } else {
                    aiCar.userData.lateralOffset -= avoidanceForce;
                }
            }
        });

        aiCar.userData.lateralOffset = Math.max(-MAX_LATERAL_OFFSET, Math.min(MAX_LATERAL_OFFSET, aiCar.userData.lateralOffset));

        const pos = trackCurve.getPointAt(aiCar.userData.trackProgress);
        const tangent = trackCurve.getTangentAt(aiCar.userData.trackProgress);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
        aiCar.position.copy(pos).add(normal.multiplyScalar(aiCar.userData.lateralOffset));
        aiCar.position.y = 0.4;
        aiCar.lookAt(pos.clone().add(tangent));
    });
}

function checkLapCompletion(carObject, carRaceData, oldProgress) {
    const newProgress = carObject.userData ? carObject.userData.trackProgress : carObject.trackProgress;
    if (oldProgress > 0.9 && newProgress < 0.1) {
        carRaceData.lap++;
        if (carRaceData.lap >= raceData.laps) {
            carRaceData.finished = true;
            carRaceData.finishTime = clock.getElapsedTime();
            if (carObject === car) { // Es el jugador
                gameState = 'SPECTATOR';
            }
        }
    }
}


// --- LÓGICA DE RESULTADOS Y REINICIO ---
function showResults() {
    gameState = 'FINISHED';
    const resultsTable = document.getElementById('results-table');
    resultsTable.innerHTML = '';

    const allRacers = [
        { name: 'Jugador', ...raceData.player },
        ...raceData.ai.map((ai, i) => ({ name: `IA ${i + 1}`, ...ai }))
    ];

    allRacers.sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        return 0;
    });

    allRacers.forEach((racer, index) => {
        const time = racer.finished ? racer.finishTime.toFixed(2) + 's' : 'DNF';
        resultsTable.innerHTML += `<p>${index + 1}. ${racer.name} - ${time}</p>`;
    });

    document.getElementById('results-overlay').style.display = 'flex';
}

function resetRace() {
    document.getElementById('results-overlay').style.display = 'none';

    raceData.player = { lap: 0, finished: false, finishTime: 0 };
    raceData.ai = [];
    aiCars.forEach(car => scene.remove(car));
    aiCars.length = 0;

    trackProgress = 0.001;
    lateralOffset = 0;
    carSpeed = 0;

    createAICars();
    startCountdown();
}

document.getElementById('new-race-button').addEventListener('click', resetRace);


// --- BUCLE DE ANIMACIÓN ---
function startCountdown() {
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownSteps = [ "3", "2", "1", "GO!" ];
    let currentStep = 0;

    countdownOverlay.style.display = 'flex';

    audioManager.startEngine();

    const interval = setInterval(() => {
        if (currentStep < countdownSteps.length) {
            countdownOverlay.textContent = countdownSteps[currentStep];
            currentStep++;
        } else {
            clearInterval(interval);
            countdownOverlay.style.display = 'none';
            gameState = 'RACE';
        }
    }, 1000);
}

function handleGamepad() {
    const gamepadStatus = document.getElementById('gamepad-status');
    const gamepads = navigator.getGamepads();

    if (gamepads[0]) {
        if (gamepadStatus) gamepadStatus.style.opacity = '1';

        const gamepad = gamepads[0];
        controls.throttle = gamepad.buttons[7].value;
        controls.brake = gamepad.buttons[6].value;
        controls.steer = gamepad.axes[0];

        // Handle button presses for gear shifting
        if (gamepad.buttons[2].pressed) { // 'X' on Xbox, 'Square' on PS
            if (!controls.gearUp) controls.gearUp = true;
        } else {
            controls.gearUp = false;
        }

        if (gamepad.buttons[0].pressed) { // 'A' on Xbox, 'X' on PS
            if (!controls.gearDown) controls.gearDown = true;
        } else {
            controls.gearDown = false;
        }
    } else {
        if (gamepadStatus) gamepadStatus.style.opacity = '0.3';
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    handleGamepad();

    if (gameState === 'RACE' || gameState === 'SPECTATOR') {
        if (gameState === 'SPECTATOR') {
            const allFinished = raceData.ai.every(car => car.finished);
            if (allFinished) {
                showResults();
                gameState = 'FINISHED';
            }
        }

        const oldProgress = trackProgress;
        if (gameState === 'RACE') {
            let lastGear = currentGear;
            // Gear shifting
            if (controls.gearUp) {
                if (currentGear < gearRatios.length - 1) currentGear++;
                controls.gearUp = false; // Consume input
            }
            if (controls.gearDown) {
                if (currentGear > 0) currentGear--;
                controls.gearDown = false; // Consume input
            }

            if (currentGear !== lastGear) {
                audioManager.playSound(currentGear > lastGear ? 'shiftUp' : 'shiftDown');
                triggerVibration(20);
                if (engineRPM > 4000) {
                    setTimeout(() => {
                        audioManager.playSound('exhaustPop', false, 0.5);
                        triggerVibration(10);
                    }, 50);
                }
            }

            // Physics calculations
            const carMass = 1500; // kg
            const wheelRotationSpeed = carSpeed / WHEEL_RADIUS;
            const currentGearRatio = gearRatios[currentGear];

            if (currentGearRatio !== 0) {
                let wheelRPM = wheelRotationSpeed * 60 / (2 * Math.PI);
                let targetRPM = wheelRPM * currentGearRatio * finalDriveRatio;

                if (controls.throttle > 0) {
                    // Allow engine to rev up when throttle is applied, even at low speed
                    engineRPM += controls.throttle * 2500 * delta;
                } else {
                    // Smoothly decrease RPM to match wheel speed or idle
                    engineRPM = Math.max(targetRPM, engineRPM - 4000 * delta);
                }

                // Ensure RPM is always at least idle and doesn't exceed max
                engineRPM = Math.max(IDLE_RPM, Math.min(MAX_RPM, engineRPM));

                // If car is moving, RPM should be at least proportional to wheel speed
                if (carSpeed > 1) {
                    engineRPM = Math.max(engineRPM, targetRPM);
                }

            } else {
                 // In neutral, let player rev the engine freely
                 if (controls.throttle > 0) {
                     engineRPM = Math.min(MAX_RPM, engineRPM + controls.throttle * 3000 * delta);
                 } else {
                     engineRPM = Math.max(IDLE_RPM, engineRPM - 4000 * delta); // Decay to idle
                 }
            }

            const engineTorque = getEngineTorque(engineRPM);
            const driveForce = engineTorque * currentGearRatio * finalDriveRatio / WHEEL_RADIUS;

            const dragForce = 0.5 * DRAG_COEFFICIENT * carSpeed * Math.abs(carSpeed);

            let throttleInput = controls.throttle;
            // Play backfire sound on deceleration
            if (throttleInput === 0 && engineRPM > 3500 && carSpeed > 50) {
                 audioManager.playSound('backfire', false, 0.4);
            }

            const totalForce = (driveForce * throttleInput) - (BRAKE_FORCE * controls.brake) - dragForce - ROLLING_RESISTANCE;

            const acceleration = totalForce / carMass;
            carSpeed += acceleration * delta;
            carSpeed = Math.max(-50, carSpeed); // Limitar velocidad en reversa

            // Steering & Skid Sound
            const steerEffectiveness = 1 - (Math.min(Math.abs(carSpeed), 150) / 200); // Menos sensible a alta velocidad
            lateralOffset += controls.steer * STEER_SENSITIVITY * delta * steerEffectiveness;

            if (Math.abs(controls.steer) > 0.9 && Math.abs(carSpeed) > 40) {
                 audioManager.playSound('skid', false, 0.3);
            }

            lateralOffset *= 0.95; // Fricción lateral

            trackProgress = (trackProgress + (carSpeed / trackLength) * delta + 1) % 1;
            lateralOffset = Math.max(-MAX_LATERAL_OFFSET, Math.min(MAX_LATERAL_OFFSET, lateralOffset));
        }

        audioManager.updateEngineSound(engineRPM, IDLE_RPM, MAX_RPM);

        checkLapCompletion(car, raceData.player, oldProgress);
        updateAICars(delta);
    }

    const carPosition = trackCurve.getPointAt(trackProgress);
    const carTangent = trackCurve.getTangentAt(trackProgress);
    const carNormal = new THREE.Vector3(-carTangent.z, 0, carTangent.x);
    car.position.copy(carPosition).add(carNormal.multiplyScalar(lateralOffset));
    car.position.y = 0.4;
    car.lookAt(carPosition.clone().add(carTangent));

    updateMinimap();

    carCabin.visible = (cameraMode !== 2);
    const currentSettings = cameraSettings[cameraMode];
    const targetCameraPosition = car.position.clone().add(currentSettings.offset.clone().applyQuaternion(car.quaternion));
    camera.position.lerp(targetCameraPosition, delta * 5.0);
    const targetLookAtPosition = car.position.clone().add(currentSettings.lookAt.clone().applyQuaternion(car.quaternion));
    camera.lookAt(targetLookAtPosition);

    renderer.render(scene, camera);
}

// --- INICIO ---
const startOverlay = document.getElementById('start-overlay');
const startGameButton = document.getElementById('start-game-button');
const loadingOverlay = document.getElementById('loading-overlay');
const touchControls = document.querySelector('.touch-controls-container');

startGameButton.addEventListener('click', async () => {
    startOverlay.style.display = 'none';
    loadingOverlay.style.display = 'none'; // Ocultar inmediatamente

    // Show touch controls only on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        touchControls.style.display = 'flex';
    }

    // Iniciar la carga de audio en segundo plano
    audioManager.init();

    // Iniciar el juego inmediatamente
    animate();
    populateMixedForest();
    createAICars();
    createFinishLine();
    drawMinimapTrack(); // Draw the static track map once
    startCountdown();

    // Iniciar la carga de texturas en segundo plano
    treeTypes.forEach(type => {
        const url = `https://raw.githubusercontent.com/Yanzsmartwood2025/JUSN38/main/assets/images/formula-1/arbol_${type}.png`;
        textureLoader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            treeMaterials[type].map = texture;
            treeMaterials[type].needsUpdate = true;
        });
    });
}, { once: true });

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Settings Menu Logic ---
const settingsButton = document.getElementById('settings-button');
const closeSettingsButton = document.getElementById('close-settings-button');
const settingsModal = document.getElementById('settings-modal');
const sfxToggle = document.getElementById('sfx-toggle');
const vibrationToggle = document.getElementById('vibration-toggle');

settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
});

closeSettingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

sfxToggle.addEventListener('change', (e) => {
    settings.sfx = e.target.checked;
});

vibrationToggle.addEventListener('change', (e) => {
    settings.vibration = e.target.checked;
});

function triggerVibration(duration) {
    if (settings.vibration && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// --- Minimap Logic ---
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const offscreenMinimap = document.createElement('canvas');
offscreenMinimap.width = minimapCanvas.width;
offscreenMinimap.height = minimapCanvas.height;
const offscreenCtx = offscreenMinimap.getContext('2d');
let minimapScale, minimapOffsetX, minimapOffsetZ, trackMinX, trackMinZ;

function drawMinimapTrack() {
    const points = trackCurve.getSpacedPoints(400);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
    });
    trackMinX = minX;
    trackMinZ = minZ;

    const trackWidth = maxX - minX;
    const trackHeight = maxZ - minZ;
    minimapScale = Math.min(minimapCanvas.width / trackWidth, minimapCanvas.height / trackHeight) * 0.9;
    minimapOffsetX = (minimapCanvas.width - (trackWidth * minimapScale)) / 2;
    minimapOffsetZ = (minimapCanvas.height - (trackHeight * minimapScale)) / 2;

    offscreenCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    offscreenCtx.lineWidth = 3;
    offscreenCtx.beginPath();
    points.forEach((p, i) => {
        const x = (p.x - trackMinX) * minimapScale + minimapOffsetX;
        const z = (p.z - trackMinZ) * minimapScale + minimapOffsetZ;
        if (i === 0) offscreenCtx.moveTo(x, z);
        else offscreenCtx.lineTo(x, z);
    });
    offscreenCtx.closePath();
    offscreenCtx.stroke();
}

function updateMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapCtx.drawImage(offscreenMinimap, 0, 0);

    // Draw player car
    const playerX = (car.position.x - trackMinX) * minimapScale + minimapOffsetX;
    const playerZ = (car.position.z - trackMinZ) * minimapScale + minimapOffsetZ;
    minimapCtx.fillStyle = 'blue';
    minimapCtx.beginPath();
    minimapCtx.arc(playerX, playerZ, 4, 0, 2 * Math.PI);
    minimapCtx.fill();

    // Draw AI cars
    minimapCtx.fillStyle = 'red';
    aiCars.forEach(aiCar => {
        const aiX = (aiCar.position.x - trackMinX) * minimapScale + minimapOffsetX;
        const aiZ = (aiCar.position.z - trackMinZ) * minimapScale + minimapOffsetZ;
        minimapCtx.beginPath();
        minimapCtx.arc(aiX, aiZ, 3, 0, 2 * Math.PI);
        minimapCtx.fill();
    });

    // Draw distance to finish
    const distance = trackLength * (raceData.laps - raceData.player.lap - trackProgress);
    minimapCtx.fillStyle = 'white';
    minimapCtx.font = '14px Rajdhani';
    minimapCtx.textAlign = 'right';
    minimapCtx.fillText(`${Math.round(distance)}m`, minimapCanvas.width - 10, 20);
}
