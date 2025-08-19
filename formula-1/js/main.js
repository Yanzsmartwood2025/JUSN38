import * as THREE from 'three';

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
const ASPHALT_WIDTH = 28; // Doble de ancho
const CURB_WIDTH = 1;
const FENCE_BUFFER = 1;
const GRASS_SIZE = 5000; // Más grande para acomodar la pista
const trackPoints = [
    new THREE.Vector3(0, 0, -1000), new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(400, 0, 400), new THREE.Vector3(800, 0, 0),
    new THREE.Vector3(800, 0, -1000), new THREE.Vector3(400, 0, -1400),
    new THREE.Vector3(-400, 0, -1400),
];
const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal');
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

const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

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
    // *** CAMBIO CLAVE: Los árboles ahora empiezan justo después de la valla ***
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
        // *** CAMBIO CLAVE: Distancia de las gradas a la pista muy reducida ***
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
    const fenceSegments = 200;
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
let car;
let steeringWheel;

let engineOn = false; // Estado del motor
const carVelocity = new THREE.Vector3();
const TURN_SPEED = 3.0; // Radianes por segundo a velocidad cero
const ACCELERATION = 18900.0; // Aceleración de F1
const REVERSE_ACCELERATION = 9000.0;
const BRAKE_FORCE = 25000.0; // Fuerza de frenado dedicada
const DRAG_COEFFICIENT = 2.0;
const ROLLING_FRICTION = 1.0;
const MAX_SPEED = 69.4; // 250 km/h
const MAX_REVERSE_SPEED = 41.7; // 150 km/h
const REFERENCE_SPEED_FOR_EFFECTS = 69.4; // Velocidad de referencia para giro, FOV, y audio. Sincronizado con MAX_SPEED.

const keys = {};
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a') {
        engineOn = !engineOn;
    } else {
        keys[key] = true;
    }
});
document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key !== 'a') {
        keys[key] = false;
    }
});

// --- CONTROLES TÁCTILES ---
const touchState = {
    accelerate: false,
    brake: false,
    turn: 0 // -1 for left, 1 for right, 0 for straight
};

// Joystick
const joystickZone = document.getElementById('joystick-zone');
const joystick = nipplejs.create({
    zone: joystickZone,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'white',
    size: 120,
    multitouch: true
}).on('move', (evt, data) => {
    if (data.angle && data.force > 0.3) {
        if (data.angle.degree > 45 && data.angle.degree < 135) {
            // Ignore up
            touchState.turn = 0;
        } else if (data.angle.degree > 225 && data.angle.degree < 315) {
            // Ignore down
            touchState.turn = 0;
        } else if (data.angle.degree >= 135 && data.angle.degree <= 225) {
            touchState.turn = -1; // Left
        } else {
            touchState.turn = 1; // Right
        }
    }
}).on('end', () => {
    touchState.turn = 0;
});


// Botones
const accelButton = document.getElementById('touch-accelerate');
const brakeButton = document.getElementById('touch-brake');
const engineButton = document.getElementById('engine-button');
let engineToggleTimeout;

const setAccelerate = (state) => {
    touchState.accelerate = state;
};

const setBrake = (state) => {
    touchState.brake = state;
};

accelButton.addEventListener('touchstart', (e) => { e.preventDefault(); setAccelerate(true); accelButton.classList.add('active'); }, { passive: false });
accelButton.addEventListener('touchend', (e) => { e.preventDefault(); setAccelerate(false); accelButton.classList.remove('active'); });
accelButton.addEventListener('touchcancel', (e) => { e.preventDefault(); setAccelerate(false); accelButton.classList.remove('active'); });

brakeButton.addEventListener('touchstart', (e) => { e.preventDefault(); setBrake(true); brakeButton.classList.add('active'); }, { passive: false });
brakeButton.addEventListener('touchend', (e) => { e.preventDefault(); setBrake(false); brakeButton.classList.remove('active'); });
brakeButton.addEventListener('touchcancel', (e) => { e.preventDefault(); setBrake(false); brakeButton.classList.remove('active'); });


// --- Engine Button with Hold ---
engineButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    engineButton.classList.add('active');
    engineToggleTimeout = setTimeout(() => {
        engineOn = !engineOn;
        engineButton.style.backgroundColor = engineOn ? 'rgba(74, 222, 128, 0.5)' : 'rgba(26, 32, 44, 0.6)';
    }, 500);
}, { passive: false });

engineButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    engineButton.classList.remove('active');
    clearTimeout(engineToggleTimeout);
});
engineButton.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    engineButton.classList.remove('active');
    clearTimeout(engineToggleTimeout);
});


let cameraMode = 0;
const cameraButton = document.getElementById('camera-button');
cameraButton.addEventListener('click', () => { cameraMode = (cameraMode + 1) % 4; });
const cameraSettings = [
    { offset: new THREE.Vector3(0, 5, 12), lookAt: new THREE.Vector3(0, 1, 0) }, // Lejana
    { offset: new THREE.Vector3(0, 3, 9), lookAt: new THREE.Vector3(0, 0.5, 0) }, // Cercana
    { offset: new THREE.Vector3(0, 1.5, -1), lookAt: new THREE.Vector3(0, 1, -10) }, // Primera persona
    { offset: new THREE.Vector3(0, 0.7, 0.5), lookAt: new THREE.Vector3(0, 0.5, -100) } // Vista de Cabina
];
const clock = new THREE.Clock();
const speedometer = document.getElementById('speedometer');

// --- LÓGICA DE CARGA DEL MODELO Y INICIO ---

function createBasicCar() {
    const car = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2 });
    const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // Carlinga principal
    const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4.5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);

    // Alerón delantero
    const frontWingGeo = new THREE.BoxGeometry(1.8, 0.1, 1);
    const frontWing = new THREE.Mesh(frontWingGeo, bodyMat);
    frontWing.position.set(0, 0.4, 2.75);
    frontWing.castShadow = true;
    car.add(frontWing);

    // Alerón trasero
    const rearWingGeo = new THREE.BoxGeometry(1.8, 0.2, 0.8);
    const rearWing = new THREE.Mesh(rearWingGeo, bodyMat);
    rearWing.position.set(0, 1.2, -2.65);
    rearWing.castShadow = true;
    car.add(rearWing);

    // Cabina del piloto
    const cockpitGeo = new THREE.BoxGeometry(1.2, 0.6, 1.5);
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 1.2, -0.5);
    cockpit.castShadow = true;
    car.add(cockpit);

    // Ruedas
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 32);

    const wheelPositions = [
        { x: -1.2, y: 0.4, z: 1.5 },  // Delantera Izquierda
        { x: 1.2, y: 0.4, z: 1.5 },   // Delantera Derecha
        { x: -1.2, y: 0.4, z: -1.8 }, // Trasera Izquierda
        { x: 1.2, y: 0.4, z: -1.8 }   // Trasera Derecha
    ];

    const frontLeftWheel = new THREE.Mesh(wheelGeo, wheelMat);
    const frontRightWheel = new THREE.Mesh(wheelGeo, wheelMat);
    const rearLeftWheel = new THREE.Mesh(wheelGeo, wheelMat);
    const rearRightWheel = new THREE.Mesh(wheelGeo, wheelMat);

    const wheels = [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel];
    wheels.forEach((wheel, i) => {
        wheel.rotation.z = Math.PI / 2; // Orientar cilindros como ruedas
        wheel.position.set(wheelPositions[i].x, wheelPositions[i].y, wheelPositions[i].z);
        wheel.castShadow = true;
        car.add(wheel);
    });

    // Asignar ruedas para el control de la dirección, manteniendo la estructura original
    car.wheels = [
        new THREE.Object3D(), // Dummy para rueda trasera izquierda
        new THREE.Object3D(), // Dummy para rueda trasera derecha
        frontLeftWheel,
        frontRightWheel
    ];

    // Crear un volante simple
    const steeringWheelGeo = new THREE.TorusGeometry(0.25, 0.05, 8, 24);
    steeringWheel = new THREE.Mesh(steeringWheelGeo, cockpitMat);
    steeringWheel.position.set(0, 1.2, 0);
    steeringWheel.rotation.x = Math.PI / 3;
    car.add(steeringWheel);

    return car;
}

function loadCar(callback) {
    // Mostrar el overlay de carga
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    loadingOverlay.style.opacity = '1';
    loadingOverlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = 'Cargando Escenario...';

    // Crear el coche básico de forma síncrona
    car = createBasicCar();

    // La función `createBasicCar` ya asigna `steeringWheel` y `car.wheels`.

    // Ajustar escala y orientación. El coche básico no necesita la misma escala que el modelo GLB.
    car.scale.set(1.0, 1.0, 1.0);
    car.rotation.y = Math.PI;
    scene.add(car);

    // Ocultar el overlay de carga. Las texturas del escenario (árboles) pueden seguir cargando en segundo plano.
    loadingOverlay.style.opacity = '0';
    loadingOverlay.addEventListener('transitionend', () => {
        loadingOverlay.style.display = 'none';
    });

    // Llamar al callback para iniciar el bucle de animación.
    callback();
}


// --- BUCLE DE ANIMACIÓN ---
function animate() {
    // Si el coche aún no se ha cargado, no hacer nada.
    if (!car) {
        requestAnimationFrame(animate);
        return;
    }

    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // --- INPUT HANDLING ---
    const keyboardAccel = (keys['arrowup']) ? 1.0 : (keys['arrowdown']) ? -1.0 : 0;
    const keyboardTurn = (keys['arrowleft']) ? 1.0 : (keys['arrowright']) ? -1.0 : 0;
    const touchAccel = (touchState.accelerate) ? 1.0 : (touchState.brake) ? -1.0 : 0;
    const touchTurn = -touchState.turn;
    const accelerationInput = touchAccel !== 0 ? touchAccel : keyboardAccel;
    const turnInput = touchTurn !== 0 ? touchTurn : keyboardTurn;

    // --- PHYSICS ---
    const forward = new THREE.Vector3();
    car.getWorldDirection(forward); // Vector de dirección del coche

    const speed = carVelocity.length();
    const velocityIsForward = forward.dot(carVelocity) >= 0;

    // Animar el volante
    if (steeringWheel) {
        const maxSteerRotation = Math.PI / 4; // 45 grados
        steeringWheel.rotation.z = turnInput * maxSteerRotation;
    }

    // 1. Animar las ruedas delanteras (visual)
    const maxWheelTurn = Math.PI / 6;
    car.wheels[2].rotation.y = turnInput * maxWheelTurn;
    car.wheels[3].rotation.y = turnInput * maxWheelTurn;

    // 2. Rotación del coche (física)
    if (speed > 0.2) {
        const turnFactor = 1.0 - Math.min(1, speed / REFERENCE_SPEED_FOR_EFFECTS);
        const effectiveTurnSpeed = TURN_SPEED * turnFactor;
        // La dirección del giro depende de si vamos hacia adelante o en reversa
        const turnDirection = velocityIsForward ? 1 : -1;
        const turnAmount = turnInput * effectiveTurnSpeed * delta * turnDirection;
        car.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), turnAmount);
    }

    // 3. Calcular fuerzas
    const force = new THREE.Vector3();
    if (engineOn) {
        // Aceleración hacia adelante
        if (accelerationInput > 0) {
            if (speed < MAX_SPEED) {
                force.add(forward.clone().multiplyScalar(ACCELERATION * accelerationInput));
            }
        }
        // Lógica de Freno y Reversa
        else if (accelerationInput < 0) {
            // Si el coche se mueve hacia adelante, frenamos
            if (velocityIsForward && speed > 0.1) {
                const brakeDirection = carVelocity.clone().normalize().multiplyScalar(-1);
                force.add(brakeDirection.multiplyScalar(BRAKE_FORCE));
            }
            // Si está parado o ya va en reversa, aceleramos en reversa
            else {
                if (speed < MAX_REVERSE_SPEED) {
                    // Usamos REVERSE_ACCELERATION y el input negativo
                    force.add(forward.clone().multiplyScalar(REVERSE_ACCELERATION * accelerationInput));
                }
            }
        }
    }

    // 4. Aplicar fricción y resistencia del aire (siempre)
    const dragForce = carVelocity.clone().multiplyScalar(-DRAG_COEFFICIENT * speed);
    force.add(dragForce);

    // Solo aplicar fricción de rodadura si el coche se está moviendo
    if (speed > 0.1) {
       const rollingFrictionForce = carVelocity.clone().normalize().multiplyScalar(-ROLLING_FRICTION);
       force.add(rollingFrictionForce);
    }

    // 5. Actualizar velocidad
    carVelocity.add(force.clone().multiplyScalar(delta));

    // Forzar parada si la velocidad es muy baja para evitar deslizamiento infinito
    if (accelerationInput === 0 && speed > 0 && speed < 0.5) {
        carVelocity.set(0, 0, 0);
    }

    // 6. Limitar la velocidad después de aplicar todas las fuerzas
    // (Esto es un seguro en caso de que las fuerzas superen el límite momentáneamente)
    if (carVelocity.length() > 0) {
        const currentSpeed = carVelocity.length();
        if(forward.dot(carVelocity) > 0) { // Hacia adelante
            if (currentSpeed > MAX_SPEED) carVelocity.setLength(MAX_SPEED);
        } else { // Hacia atrás
            if (currentSpeed > MAX_REVERSE_SPEED) carVelocity.setLength(MAX_REVERSE_SPEED);
        }
    }

    // 7. Actualizar posición
    car.position.add(carVelocity.clone().multiplyScalar(delta));

    // --- UI UPDATES ---
    const displaySpeed = Math.round(speed * 3.6); // Factor para convertir m/s a KM/H
    speedometer.textContent = `${displaySpeed} KM/H`;

    // --- AUDIO ---
    if (engineOn && Object.keys(engineSounds).length > 0) {
        const baseVolume = 0.4;
        const speedRatio = Math.min(1, speed / REFERENCE_SPEED_FOR_EFFECTS);

        // Volumen general basado en la velocidad, para que no sea abrupto
        const overallVolume = baseVolume * Math.min(1, speed / 5.0);

        // Mezcla de RPM basado en la velocidad
        const highRpmVolume = speedRatio;
        const lowRpmVolume = 1 - highRpmVolume;

        // Si estamos acelerando, damos un empujón extra al sonido
        const accelerationBoost = (accelerationInput > 0) ? 1.5 : 1.0;

        engineSounds.engine_low_rpm_loop.setVolume(lowRpmVolume * overallVolume * accelerationBoost);
        engineSounds.engine_high_rpm_loop.setVolume(highRpmVolume * overallVolume * accelerationBoost);

        // El sonido de ralentí solo suena si el motor está encendido pero casi no nos movemos
        engineSounds.engine_idle_garage.setVolume(speed < 1 && engineOn ? 0.2 : 0);

    } else if (Object.keys(engineSounds).length > 0) {
        // Apagar todos los sonidos si el motor está apagado
        Object.values(engineSounds).forEach(s => s.setVolume(0));
    }

    // --- CÁMARA ---
    // Efecto FOV dinámico
    const baseFov = 75;
    const fovBoost = Math.min(1, speed / REFERENCE_SPEED_FOR_EFFECTS) * 15; // Aumenta hasta 15 grados
    camera.fov = baseFov + fovBoost;
    camera.updateProjectionMatrix();

    const currentSettings = cameraSettings[cameraMode];
    const targetCameraPosition = car.position.clone().add(currentSettings.offset.clone().applyQuaternion(car.quaternion));
    camera.position.lerp(targetCameraPosition, delta * 5.0);
    const targetLookAtPosition = car.position.clone().add(currentSettings.lookAt.clone().applyQuaternion(car.quaternion));
    camera.lookAt(targetLookAtPosition);

    renderer.render(scene, camera);
}

// --- INICIO ---
const loadingOverlay = document.getElementById('loading-overlay');
const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const audioLoader = new THREE.AudioLoader();
const engineSounds = {};

loadingManager.onLoad = () => {
    populateMixedForest();
    // No ocultar el overlay de carga aquí, se hará después de cargar el coche
};

startButton.addEventListener('click', () => {
    // Ocultar el overlay de inicio
    startOverlay.style.display = 'none';

    // Inicializar audio
    if (audioListener.context.state === 'suspended') {
        audioListener.context.resume();
    }

    // --- INICIALIZAR AUDIO Y VIBRACIÓN ---
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }

    const soundsToLoad = ['engine_idle_garage.mp3', 'engine_low_rpm_loop.mp3', 'engine_mid_rpm_loop.mp3', 'engine_high_rpm_loop.mp3'];
    let soundsLoaded = 0;
    soundsToLoad.forEach(soundFile => {
        audioLoader.load(`assets/audios/${soundFile}`, (buffer) => {
            const sound = new THREE.Audio(audioListener);
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0);
            engineSounds[soundFile.split('.')[0]] = sound;
            soundsLoaded++;
            if (soundsLoaded === soundsToLoad.length) {
                Object.values(engineSounds).forEach(s => s.play());
            }
        });
    });

    // Cargar el modelo del coche e iniciar el bucle de animación cuando esté listo
    loadCar(() => {
        // La animación ahora solo comienza después de que el coche se carga.
        requestAnimationFrame(animate);
    });
});

// Cargar todas las texturas
treeTypes.forEach(type => {
    const url = `https://raw.githubusercontent.com/Yanzsmartwood2025/JUSN38/main/assets/images/formula-1/arbol_${type}.png`;
    textureLoader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        treeMaterials[type].map = texture;
        treeMaterials[type].needsUpdate = true;
    });
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
