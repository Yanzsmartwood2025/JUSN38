import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// --- Global Variables ---
let camera, scene, renderer, cssScene, cssRenderer, sceneContainer;
const carouselGroup = new THREE.Group();
const tentaclesGroup = new THREE.Group();
const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
let tentacleAnchor;
let focusedObject = null;
let isPointerDown = false, isDragging = false;
let startPointerX = 0, startRotationY = 0, velocityY = 0;
const deceleration = 0.95;
let longPressTimeout = null;
let isHolding = false;
let heldObject = null;
let pressStartTime = 0;
let shakeInterval = null;

// --- Particle System Variables ---
let sparkParticles, sparkGeometry, sparkMaterial;
const particleCount = 4000;
const particlesData = [];
const gravity = new THREE.Vector3(0, -200, 0);

// --- Texture Loading ---
const lightningTexture = textureLoader.load('https://i.imgur.com/Y4uK349.png');
lightningTexture.wrapS = THREE.RepeatWrapping;
lightningTexture.wrapT = THREE.RepeatWrapping;
const sparkTexture = textureLoader.load('https://i.imgur.com/e40Lcf5.png');

function main() {
    init();
    animate();
}

function init() {
    sceneContainer = document.getElementById('scene-container');
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
    
    scene = new THREE.Scene();
    cssScene = new THREE.Scene();
    
    textureLoader.load(
        'https://raw.githubusercontent.com/Yanzsmartwood2025/JUSN38/main/assets/images/JUSN38/menu-principal.png',
        (texture) => {
            scene.background = texture;
        },
        undefined,
        (err) => {
            console.error('An error occurred while loading the background texture.', err);
        }
    );

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x88aaff, 2, 2000);
    scene.add(pointLight);

    initSparks();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    sceneContainer.appendChild(renderer.domElement);

    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
    sceneContainer.appendChild(cssRenderer.domElement);

    const elements = document.querySelectorAll('#html-elements .project-card-3d');
    elements.forEach((element, i) => {
        const cssObject = new CSS3DObject(element);
        cssObject.userData.id = i;
        carouselGroup.add(cssObject);
    });
    cssScene.add(carouselGroup);
    
    scene.add(tentaclesGroup);

    const anchorGeometry = new THREE.TorusGeometry(80, 10, 16, 100);
    const anchorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    tentacleAnchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
    
    tentacleAnchor.position.set(0, -500, -400);
    tentacleAnchor.rotation.x = -Math.PI / 2;
    tentacleAnchor.visible = false; 
    tentaclesGroup.add(tentacleAnchor);

    updateLayout();
    createTentacles();

    // --- Event Listeners ---
    sceneContainer.addEventListener('pointerdown', onPointerDown);
    sceneContainer.addEventListener('pointermove', onPointerMove);
    sceneContainer.addEventListener('pointerup', onPointerUp);
    sceneContainer.addEventListener('pointerleave', onPointerUp);
    sceneContainer.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('resize', onWindowResize);
    
    const gsapScript = document.createElement('script');
    gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js';
    document.body.appendChild(gsapScript);
}

function initSparks() {
    sparkGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0;
        particlesData.push({ velocity: new THREE.Vector3(), lifetime: 0, isActive: false });
    }
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkMaterial = new THREE.PointsMaterial({
        map: sparkTexture, size: 12, blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false,
    });
    sparkParticles = new THREE.Points(sparkGeometry, sparkMaterial);
    sparkParticles.visible = false;
    scene.add(sparkParticles);
}

function triggerSparks(position) {
    sparkParticles.position.copy(position);
    sparkParticles.visible = true;
    let particlesToEmit = 10;
    for (let i = 0; i < particleCount && particlesToEmit > 0; i++) {
        const p = particlesData[i];
        if (!p.isActive) {
            p.isActive = true; p.lifetime = Math.random() * 0.8 + 0.2;
            const pos = sparkGeometry.attributes.position.array;
            pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 300 + 200;
            p.velocity.set(Math.cos(angle) * speed, Math.random() * 200 + 50, Math.sin(angle) * speed);
            particlesToEmit--;
        }
    }
}

function updateSparks(delta) {
    if (!sparkParticles.visible) return;
    const positions = sparkGeometry.attributes.position.array;
    let activeParticles = 0;
    for (let i = 0; i < particleCount; i++) {
        const p = particlesData[i];
        if (p.isActive) {
            p.lifetime -= delta;
            if (p.lifetime <= 0) {
                p.isActive = false;
                positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0;
                continue;
            }
            p.velocity.add(gravity.clone().multiplyScalar(delta));
            positions[i * 3] += p.velocity.x * delta;
            positions[i * 3 + 1] += p.velocity.y * delta;
            positions[i * 3 + 2] += p.velocity.z * delta;
            activeParticles++;
        }
    }
    if (activeParticles === 0 && !isHolding) {
        sparkParticles.visible = false;
    }
    sparkGeometry.attributes.position.needsUpdate = true;
}

function updateLayout() {
    const isMobile = window.innerWidth < 768;
    const radius = isMobile ? 1000 : 1200;
    const cardScale = isMobile ? 0.8 : 1.0;
    camera.position.z = isMobile ? 1400 : 1200;

    carouselGroup.children.forEach((object, i) => {
        const numElements = carouselGroup.children.length;
        const angle = (i / numElements) * Math.PI * 2;
        object.position.x = Math.sin(angle) * radius;
        object.position.z = Math.cos(angle) * radius;
        object.scale.set(cardScale, cardScale, cardScale);
    });
}

function createTentacles() {
    tentaclesGroup.children.filter(child => child.isGroup).forEach(t => tentaclesGroup.remove(t));

    const numTentacles = carouselGroup.children.length;
    const numSegments = 25; 

    const linkGeometry = new THREE.TorusGeometry(10, 4, 8, 16);
    const linkMaterial = new THREE.MeshStandardMaterial({
        color: 0x222228,
        metalness: 0.9,
        roughness: 0.4
    });

    carouselGroup.children.forEach((targetObject, i) => {
        const tentacleGroup = new THREE.Group();
        
        const originPoint = new THREE.Vector3(
            (Math.random() - 0.5) * 200, 0, (Math.random() - 0.5) * 200,
        ).applyMatrix4(tentacleAnchor.matrixWorld);

        const restingAngle = (i / numTentacles) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const restingRadius = 1200 + Math.random() * 200;
        const restingPoint = new THREE.Vector3(
            Math.cos(restingAngle) * restingRadius,
            (Math.random() - 0.5) * 800,
            Math.sin(restingAngle) * restingRadius - 400
        );
        
        const segments = [];
        for (let j = 0; j < numSegments; j++) {
            const point = new THREE.Vector3().lerpVectors(originPoint, restingPoint, j / (numSegments - 1));
            segments.push(point);
        }
        
        const curve = new THREE.CatmullRomCurve3(segments);
        const coreGeometry = new THREE.TubeGeometry(curve, 32, 5, 8, false);
        const coreMaterial = new THREE.MeshBasicMaterial({ 
            map: lightningTexture, 
            blending: THREE.AdditiveBlending, 
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });
        const electricityCore = new THREE.Mesh(coreGeometry, coreMaterial);

        const chainLinks = new THREE.Group();
        for (let j = 0; j < numSegments; j++) {
            const link = new THREE.Mesh(linkGeometry, linkMaterial);
            chainLinks.add(link);
        }
        
        tentacleGroup.add(electricityCore, chainLinks);
        
        tentacleGroup.userData = {
            targetId: i,
            segments: segments,
            originPoint: originPoint.clone(),
            restingPoint: restingPoint.clone(),
            animatedTarget: new THREE.Vector3().copy(restingPoint),
            isEngaged: false,
            electricityCore: electricityCore,
            chainLinks: chainLinks,
            animationProps: {
                timeOffset: Math.random() * 10,
                amplitude: 60 + Math.random() * 40,
                speed: 0.7 + Math.random() * 0.4,
                waveLength: 0.25 + Math.random() * 0.15
            }
        };
        tentaclesGroup.add(tentacleGroup);
    });
}

function updateTentacleGeometry(tentacleGroup, time) {
    const { segments, originPoint, animatedTarget, electricityCore, chainLinks, animationProps } = tentacleGroup.userData;
    
    const mainAxis = new THREE.Vector3().subVectors(animatedTarget, originPoint);
    const distance = mainAxis.length();
    mainAxis.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    let waveAxisX = new THREE.Vector3().crossVectors(mainAxis, up).normalize();
    if (waveAxisX.lengthSq() < 0.1) {
        up.set(1, 0, 0);
        waveAxisX.crossVectors(mainAxis, up).normalize();
    }
    const waveAxisY = new THREE.Vector3().crossVectors(mainAxis, waveAxisX).normalize();

    const waveTime = time * animationProps.speed + animationProps.timeOffset;

    for (let i = 0; i < segments.length; i++) {
        const progress = i / (segments.length - 1);
        const positionOnAxis = originPoint.clone().add(mainAxis.clone().multiplyScalar(distance * progress));
        
        const waveFactor = Math.sin(progress * Math.PI);
        const waveAmplitude = animationProps.amplitude;
        
        const waveOffsetX = Math.sin(waveTime + i * animationProps.waveLength) * waveAmplitude * waveFactor;
        const waveOffsetY = Math.cos(waveTime * 0.8 + i * animationProps.waveLength * 1.2) * (waveAmplitude * 0.8) * waveFactor;
        
        positionOnAxis.add(waveAxisX.clone().multiplyScalar(waveOffsetX));
        positionOnAxis.add(waveAxisY.clone().multiplyScalar(waveOffsetY));
        segments[i].copy(positionOnAxis);
    }

    const newCurve = new THREE.CatmullRomCurve3(segments);
    
    const newCoreGeom = new THREE.TubeGeometry(newCurve, 32, 5, 8, false);
    electricityCore.geometry.dispose();
    electricityCore.geometry = newCoreGeom;
    electricityCore.material.map.offset.x = time * -0.8;

    const numLinks = chainLinks.children.length;
    for (let i = 0; i < numLinks; i++) {
        const link = chainLinks.children[i];
        const progress = i / (numLinks - 1);
        const point = newCurve.getPointAt(progress);
        link.position.copy(point);

        const lookAtProgress = (i + 1) / (numLinks - 1);
        const lookAtPoint = newCurve.getPointAt(Math.min(lookAtProgress, 1));
        link.lookAt(lookAtPoint);
    }
}

function engageTentacle(tentacle, targetObject) {
    if (!tentacle || !window.gsap) return;
    tentacle.userData.isEngaged = true;

    const targetPosition = new THREE.Vector3();
    targetObject.getWorldPosition(targetPosition);
    tentaclesGroup.worldToLocal(targetPosition);
    targetPosition.y -= 110; 

    gsap.to(tentacle.userData.animatedTarget, {
        x: targetPosition.x, y: targetPosition.y, z: targetPosition.z,
        duration: 0.4, ease: "power2.inOut"
    });
}

function disengageTentacle(tentacle) {
    if (!tentacle || !window.gsap) return;
    tentacle.userData.isEngaged = false;

    const { restingPoint, animatedTarget } = tentacle.userData;
    const currentTipPosition = tentacle.userData.segments[tentacle.userData.segments.length - 1];

    const recoilDirection = new THREE.Vector3().subVectors(currentTipPosition, restingPoint).normalize();
    recoilDirection.x += (Math.random() - 0.5) * 2.5;
    recoilDirection.y += (Math.random() - 0.5) * 2.5;
    recoilDirection.z += (Math.random() - 0.5) * 2.5;
    const recoilPoint = currentTipPosition.clone().add(recoilDirection.multiplyScalar(400));

    gsap.killTweensOf(animatedTarget);
    const tl = gsap.timeline();
    
    tl.to(animatedTarget, {
        x: recoilPoint.x, y: recoilPoint.y, z: recoilPoint.z,
        duration: 0.25, ease: "power3.out"
    });
    
    tl.to(animatedTarget, {
        x: restingPoint.x, y: restingPoint.y, z: restingPoint.z,
        duration: 1.5, ease: "elastic.out(1, 0.5)"
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    if (!isPointerDown) {
        if (Math.abs(velocityY) > 0.0001) {
            carouselGroup.rotation.y += velocityY;
            tentaclesGroup.rotation.y += velocityY;
            velocityY *= deceleration;
        } else {
            velocityY = 0;
        }
    }
    
    let maxDot = -2;
    let newlyFocusedObject = null;
    carouselGroup.children.forEach(object => {
        object.lookAt(camera.position);
        const worldPosition = new THREE.Vector3();
        object.getWorldPosition(worldPosition);
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const objectDirection = worldPosition.sub(camera.position).normalize();
        const dot = cameraDirection.dot(objectDirection);

        if (dot > maxDot) { maxDot = dot; newlyFocusedObject = object; }
        if (object !== heldObject) {
            object.element.classList.remove('focused');
        }
    });

    if (newlyFocusedObject && newlyFocusedObject !== focusedObject) {
        focusedObject = newlyFocusedObject;
    }
    if(focusedObject && !isHolding) {
        focusedObject.element.classList.add('focused');
    }

    tentaclesGroup.children.forEach(tentacle => { 
        if (tentacle.isGroup) {
            if (tentacle.userData.isEngaged) {
                const targetCard = carouselGroup.children.find(c => c.userData.id === tentacle.userData.targetId);
                if (targetCard) {
                    const targetPosition = new THREE.Vector3();
                    targetCard.getWorldPosition(targetPosition);
                    tentaclesGroup.worldToLocal(targetPosition);
                    targetPosition.y -= 110;
                    tentacle.userData.animatedTarget.copy(targetPosition);
                }
            }
            updateTentacleGeometry(tentacle, time); 
        }
    });

    if (isHolding && heldObject) {
        const tentacle = tentaclesGroup.children.find(t => t.isGroup && t.userData.targetId === heldObject.userData.id);
        if (tentacle) { 
            const tipPosition = new THREE.Vector3();
            const lastSegment = tentacle.userData.segments[tentacle.userData.segments.length-1];
            tentacle.localToWorld(tipPosition.copy(lastSegment));
            triggerSparks(tipPosition);
        }
    }
    updateSparks(delta);

    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
}

function navigateTo(element) {
    if (element.target === '_blank') { window.open(element.href, '_blank'); } 
    else { window.location.href = element.href; }
}

function startCharging(element) {
    isHolding = true;
    heldObject = carouselGroup.children.find(o => o.element === element);
    if (heldObject) {
        element.classList.add('is-charging');
        if(shakeInterval) clearInterval(shakeInterval);
        shakeInterval = setInterval(() => {
            sceneContainer.classList.remove('shaking');
            void sceneContainer.offsetWidth;
            sceneContainer.classList.add('shaking');
        }, 500);
        
        const tentacle = tentaclesGroup.children.find(t => t.isGroup && t.userData.targetId === heldObject.userData.id);
        engageTentacle(tentacle, heldObject);

        longPressTimeout = setTimeout(() => {
            if (isHolding && heldObject) {
                element.classList.add('card-active');
                navigateTo(element);
            }
        }, 4000);
    }
}

function stopCharging() {
    if (isHolding && heldObject) {
        heldObject.element.classList.remove('is-charging');
        heldObject.element.classList.remove('card-active');
        
        const tentacle = tentaclesGroup.children.find(t => t.isGroup && t.userData.targetId === heldObject.userData.id);
        disengageTentacle(tentacle);
    }
    clearTimeout(longPressTimeout); 
    clearInterval(shakeInterval);
    sceneContainer.classList.remove('shaking');
    
    shakeInterval = null; 
    isHolding = false; 
    heldObject = null;
}

function onPointerDown(event) {
    if (isDragging) return;

    isPointerDown = true; 
    isDragging = false;
    startPointerX = event.clientX;
    startRotationY = carouselGroup.rotation.y;
    velocityY = 0; 
    pressStartTime = Date.now();
    
    const element = event.target.closest('.project-card-3d');
    if (element) {
        startCharging(element);
    }
}

function onPointerMove(event) {
    if (!isPointerDown) return;
    const deltaX = event.clientX - startPointerX;

    if (Math.abs(deltaX) > 10) {
        isDragging = true;
        if (isHolding) {
            stopCharging();
        }
    }
    
    if (isDragging) {
        const rotationFactor = 0.005; 
        const newRotation = startRotationY + (deltaX * rotationFactor);
        velocityY = newRotation - carouselGroup.rotation.y;
        carouselGroup.rotation.y = newRotation;
        tentaclesGroup.rotation.y = newRotation;
        
        startRotationY = carouselGroup.rotation.y;
        startPointerX = event.clientX;
    }
}

function onPointerUp(event) {
    if(isHolding) {
        stopCharging(); 
    }
    isPointerDown = false; 
    isDragging = false; 
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    updateLayout();
    createTentacles(); 
}

window.addEventListener('load', main);
