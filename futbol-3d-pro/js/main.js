import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
// No necesitamos OrbitControls por ahora, la cámara seguirá al jugador.
// import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { createSoccerField } from './scene.js';
import { createBall } from './ball.js';
// ¡Importamos al jugador y los controles!
import { createPlayer } from './player.js';
import { Controls } from './controls.js';

const CANNON = window.CANNON;

class Game {
    constructor() {
        this.objectsToUpdate = [];
        this.init();
    }

    init() {
        this.initPhysics();

        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.addLights();

        // --- CREACIÓN DE OBJETOS ---
        const soccerField = createSoccerField();
        this.scene.add(soccerField);

        const ball = createBall(this.physicsMaterials);
        this.scene.add(ball.mesh);
        this.world.addBody(ball.body);
        this.objectsToUpdate.push(ball);

        // Creamos nuestro jugador
        this.player = createPlayer(this.physicsMaterials);
        this.scene.add(this.player.mesh);
        this.world.addBody(this.player.body);
        this.objectsToUpdate.push(this.player);

        // Creamos una instancia de nuestros controles, pasándole el jugador que debe controlar.
        this.controls = new Controls(this.player);

        window.addEventListener('resize', () => this.onWindowResize(), false);
        this.animate();
    }

    initPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0); // Aumentamos un poco la gravedad para un juego más arcade.

        // --- MATERIALES FÍSICOS ---
        const groundMaterial = new CANNON.Material('ground');
        const ballMaterial = new CANNON.Material('ball');
        const playerMaterial = new CANNON.Material('player'); // Nuevo material para el jugador

        // Contacto Balón-Suelo
        this.world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, ballMaterial, { friction: 0.4, restitution: 0.7 }));
        // Contacto Jugador-Suelo
        this.world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, playerMaterial, { friction: 0.9, restitution: 0.1 }));
        // Contacto Jugador-Balón
        this.world.addContactMaterial(new CANNON.ContactMaterial(playerMaterial, ballMaterial, { friction: 0.1, restitution: 0.5 }));
        
        this.physicsMaterials = { ground: groundMaterial, ball: ballMaterial, player: playerMaterial };

        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: groundMaterial });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
    }

    addLights() {
        // ... (el código de las luces no cambia)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCamera() {
        // La cámara sigue suavemente al jugador
        const playerPosition = this.player.mesh.position;
        const cameraOffset = new THREE.Vector3(0, 15, 25); // Distancia de la cámara al jugador

        // Usamos LERP (interpolación lineal) para un movimiento de cámara suave
        this.camera.position.lerp(playerPosition.clone().add(cameraOffset), 0.1);
        this.camera.lookAt(playerPosition); // La cámara siempre mira al jugador
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Actualizamos los controles para saber si hay que mover al jugador
        this.controls.update();

        this.world.step(1 / 60);

        for (const object of this.objectsToUpdate) {
            object.mesh.position.copy(object.body.position);
            object.mesh.quaternion.copy(object.body.quaternion);
        }

        // Actualizamos la posición de la cámara en cada fotograma
        this.updateCamera();

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
