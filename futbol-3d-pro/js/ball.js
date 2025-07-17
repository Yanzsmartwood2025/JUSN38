// Importamos las librerías para poder crear objetos 3D (THREE) y físicos (CANNON).
// CANNON no es un módulo, por lo que lo tomamos del objeto global 'window'.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
const CANNON = window.CANNON;

// Exportamos la función para que pueda ser usada desde main.js
export function createBall(physicsMaterials) {
    const radius = 0.35; // Radio del balón (en metros)

    // --- Parte Visual (Three.js) ---
    const ballGeometry = new THREE.SphereGeometry(radius, 32, 32); // Esfera con buena resolución
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, // Color blanco
        metalness: 0.3,
        roughness: 0.4 
    });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.castShadow = true; // El balón proyectará sombras.
    ballMesh.position.y = 15; // Posición inicial en el aire para que caiga.

    // --- Parte Física (Cannon.js) ---
    const ballShape = new CANNON.Sphere(radius);
    const ballBody = new CANNON.Body({
        mass: 1, // Masa del balón
        shape: ballShape,
        position: new CANNON.Vec3(0, 15, 0), // Posición inicial (debe coincidir con la visual)
        material: physicsMaterials.ball // Usamos el material físico que crearemos en main.js
    });
    
    // Devolvemos un objeto que contiene tanto la malla visual como el cuerpo físico.
    // Esto nos permite manejarlos juntos fácilmente.
    return {
        mesh: ballMesh,
        body: ballBody
    };
}

