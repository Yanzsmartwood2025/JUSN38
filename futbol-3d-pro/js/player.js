import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
const CANNON = window.CANNON;

// La función ahora necesita saber sobre el balón para poder patearlo.
export function createPlayer(physicsMaterials, ball) {
    // --- Parte Visual (Three.js) ---
    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 16);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.castShadow = true;
    playerMesh.position.set(5, 5, 10);

    // --- Parte Física (Cannon.js) ---
    const playerShape = new CANNON.Sphere(0.5);
    const playerBody = new CANNON.Body({
        mass: 70,
        position: new CANNON.Vec3(5, 5, 10),
        shape: playerShape,
        material: physicsMaterials.player,
        linearDamping: 0.95, // Aumentamos la fricción para un control más preciso
        fixedRotation: true
    });

    // --- Objeto del Jugador ---
    const playerObject = {
        mesh: playerMesh,
        body: playerBody,
        
        move: function(direction) {
            const speed = 250;
            const force = new CANNON.Vec3(direction.x * speed, 0, direction.z * speed);
            this.body.applyLocalImpulse(force, new CANNON.Vec3(0, 0, 0));
        },

        // ¡NUEVO MÉTODO PARA PATEAR!
        kick: function(camera) {
            // 1. Calculamos la distancia entre el jugador y el balón.
            const playerPos = this.body.position;
            const ballPos = ball.body.position;
            const distance = playerPos.distanceTo(ballPos);

            // 2. Si el balón está lo suficientemente cerca (ej. a menos de 1.5 metros)...
            if (distance < 1.5) {
                // 3. Obtenemos la dirección hacia donde mira la cámara.
                const kickDirection = new THREE.Vector3();
                camera.getWorldDirection(kickDirection);
                
                // La convertimos a un vector de física de Cannon.js
                const cannonKickDirection = new CANNON.Vec3(kickDirection.x, kickDirection.y, kickDirection.z);
                
                // 4. Aplicamos una fuerza (impulso) muy fuerte al balón en esa dirección.
                const kickStrength = 40; // ¡La potencia del chute!
                ball.body.applyImpulse(
                    cannonKickDirection.scale(kickStrength), 
                    ball.body.position // Aplicamos la fuerza en el centro del balón
                );
            }
        }
    };

    return playerObject;
}
