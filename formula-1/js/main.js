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
const ASPHALT_WIDTH = 14;
const CURB_WIDTH = 1;
// *** CAMBIO CLAVE: Reducido el espacio entre la valla y la pista ***
const FENCE_BUFFER = 1;
const GRASS_SIZE = 2500;
const trackPoints = [
    new THREE.Vector3(0, 0, -500), new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(200, 0, 200), new THREE.Vector3(400, 0, 0),
    new THREE.Vector3(400, 0, -500), new THREE.Vector3(200, 0, -700),
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
const car = new THREE.Group();
const carBody = new THREE.Mesh( new THREE.BoxGeometry(2, 0.8, 4.5), new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.3, metalness: 0.2 }) );
carBody.castShadow = true; car.add(carBody);
const carCabin = new THREE.Mesh( new THREE.BoxGeometry(1.4, 0.7, 2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, transparent: true, opacity: 0.8 }) );
carCabin.position.set(0, 0.75, -0.2); car.add(carCabin);
scene.add(car);

let carSpeed = 0, trackProgress = 0.001, lateralOffset = 0;
let engineOn = false; // Estado del motor
const ACCELERATION = 80.0, MAX_SPEED = 200.0, FRICTION = 0.985;
const LATERAL_SPEED = 1.5, LATERAL_FRICTION = 0.9, MAX_LATERAL_OFFSET = ASPHALT_WIDTH / 2 - 1.2;

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
const touchMappings = {
    'touch-up': 'arrowup',
    'touch-down': 'arrowdown',
    'touch-left': 'arrowleft',
    'touch-right': 'arrowright'
};
Object.keys(touchMappings).forEach(id => {
    const element = document.getElementById(id);
    const key = touchMappings[id];

    const press = (e) => {
        e.preventDefault();
        keys[key] = true;
        element.classList.add('active');
    };
    const release = (e) => {
        e.preventDefault();
        keys[key] = false;
        element.classList.remove('active');
    };

    element.addEventListener('touchstart', press, { passive: false });
    element.addEventListener('touchend', release);
    element.addEventListener('touchcancel', release);
    element.addEventListener('touchleave', release);
});

let cameraMode = 0;
const cameraButton = document.getElementById('camera-button');
cameraButton.addEventListener('click', () => { cameraMode = (cameraMode + 1) % 3; });
const cameraSettings = [
    { offset: new THREE.Vector3(0, 8, 15), lookAt: new THREE.Vector3(0, 2, 0) },
    { offset: new THREE.Vector3(0, 4, 8), lookAt: new THREE.Vector3(0, 1.5, 0) },
    { offset: new THREE.Vector3(0, 1.4, 0.2), lookAt: new THREE.Vector3(0, 1.2, -10) }
];
const clock = new THREE.Clock();

// --- BUCLE DE ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    let accelerationInput = (keys['arrowup']) ? 1 : (keys['arrowdown']) ? -0.5 : 0;
    let turnInput = (keys['arrowleft']) ? 1 : (keys['arrowright']) ? -1 : 0;

    if (engineOn) {
        carSpeed += accelerationInput * ACCELERATION * delta;
    }
    carSpeed *= FRICTION;
    carSpeed = Math.max(-MAX_SPEED / 3, Math.min(MAX_SPEED, carSpeed));
    trackProgress = (trackProgress + (carSpeed / trackLength) * delta + 1) % 1;

    const turnFactor = 0.4 + 0.6 * (1.0 - Math.min(1, Math.abs(carSpeed) / MAX_SPEED));
    lateralOffset += turnInput * LATERAL_SPEED * delta * turnFactor;
    lateralOffset *= LATERAL_FRICTION;
    lateralOffset = Math.max(-MAX_LATERAL_OFFSET, Math.min(MAX_LATERAL_OFFSET, lateralOffset));

    const carPosition = trackCurve.getPointAt(trackProgress);
    const carTangent = trackCurve.getTangentAt(trackProgress);
    const carNormal = new THREE.Vector3(-carTangent.z, 0, carTangent.x);
    car.position.copy(carPosition).add(carNormal.multiplyScalar(lateralOffset));
    car.position.y = 0.4;
    car.lookAt(carPosition.clone().add(carTangent));

    carCabin.visible = (cameraMode !== 2);
    const currentSettings = cameraSettings[cameraMode];
    const targetCameraPosition = car.position.clone().add(currentSettings.offset.clone().applyQuaternion(car.quaternion));
    camera.position.lerp(targetCameraPosition, delta * 5.0);
    const targetLookAtPosition = car.position.clone().add(currentSettings.lookAt.clone().applyQuaternion(car.quaternion));
    camera.lookAt(targetLookAtPosition);

    renderer.render(scene, camera);
}

// --- INICIO ---
const loadingOverlay = document.getElementById('loading-overlay');
loadingManager.onLoad = () => {
    populateMixedForest();
    loadingOverlay.style.opacity = '0';
    loadingOverlay.addEventListener('transitionend', () => loadingOverlay.style.display = 'none');
    animate();
};

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
