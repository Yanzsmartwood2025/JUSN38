// --- VERSIÓN DE PRUEBA PARA DEPURACIÓN ---
// No importamos ningún archivo local, solo la librería Three.js

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// 1. Escena, Cámara, Renderizador
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // Fondo oscuro para que se vea el cubo

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

// 2. Creamos el Cubo
const geometry = new THREE.BoxGeometry(1, 1, 1); // Un cubo de 1x1x1
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Color verde brillante
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 3. Bucle de Animación
function animate() {
    requestAnimationFrame(animate);

    // Hacemos girar el cubo para saber que la animación funciona
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

// 4. Manejo de Redimensión
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// ¡Iniciamos la animación!
animate();

console.log("Prueba del cubo iniciada. Si ves un cubo verde girando, la base funciona.");
