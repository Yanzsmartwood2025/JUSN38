import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
const CANNON = window.CANNON;

export function createPlayer(physicsMaterials) {
    // --- Parte Visual (Three.js) ---
    // Crearemos una cápsula simple para representar al jugador.
    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 16); // Radio, altura, segmentos
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Color azul
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.castShadow = true;
    playerMesh.position.set(5, 5, 10); // Posición inicial

    // --- Parte Física (Cannon.js) ---
    const playerShape = new CANNON.Sphere(0.5); // Usamos una esfera para la base de la física
    const playerBody = new CANNON.Body({
        mass: 70, // Masa de un jugador en kg
        position: new CANNON.Vec3(5, 5, 10),
        shape: playerShape,
        material: physicsMaterials.player, // Material físico que crearemos en main.js
        linearDamping: 0.9, // Esto actúa como "fricción con el aire", para que el jugador se frene solo.
        fixedRotation: true // Impide que el jugador se caiga o ruede como una pelota.
    });

    // --- Objeto del Jugador ---
    // Creamos un objeto que contendrá todo lo relacionado al jugador.
    const playerObject = {
        mesh: playerMesh,
        body: playerBody,
        
        // Método para mover al jugador.
        // Se le aplica una fuerza (impulso) en la dirección deseada.
        move: function(direction) {
            const speed = 250; // La fuerza con la que se mueve
            const force = new CANNON.Vec3(direction.x * speed, 0, direction.z * speed);
            this.body.applyLocalImpulse(force, new CANNON.Vec3(0, 0, 0));
        }
    };

    return playerObject;
}

