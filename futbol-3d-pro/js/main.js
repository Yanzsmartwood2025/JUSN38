import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { createSoccerField } from './scene.js';
// ¡Importamos nuestro nuevo creador de balones!
import { createBall } from './ball.js';

// CANNON.js se carga globalmente, así que lo asignamos a una constante para facilidad de uso.
const CANNON = window.CANNON;

class Game {
    constructor() {
        this.objectsToUpdate = []; // Un array para guardar todos los objetos que necesitan sincronización física.
        this.init();
    }

    init() {
        // --- INICIALIZACIÓN DE FÍSICA (CANNON.JS) ---
        this.initPhysics();

        // --- INICIALIZACIÓN GRÁFICA (THREE.JS) ---
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 50, 60); // Ajustamos la cámara para una mejor vista inicial

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);

        this.addLights();

        // --- CREACIÓN DE OBJETOS ---

        // Campo de fútbol (visual)
        const soccerField = createSoccerField();
        this.scene.add(soccerField);
        // El campo físico ya se creó en initPhysics()

        // Balón (visual y físico)
        const ball = createBall(this.physicsMaterials);
        this.scene.add(ball.mesh);
        this.world.addBody(ball.body);
        this.objectsToUpdate.push(ball); // Lo añadimos a la lista de objetos a actualizar.

        window.addEventListener('resize', () => this.onWindowResize(), false);
        this.animate();
    }

    initPhysics() {
        // Creamos un mundo de física con gravedad hacia abajo.
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Gravedad estándar de la Tierra.

        // --- MATERIALES FÍSICOS ---
        // Definimos cómo se comportan los objetos al chocar.
        const groundMaterial = new CANNON.Material('ground');
        const ballMaterial = new CANNON.Material('ball');
        
        // Definimos la interacción entre el balón y el suelo.
        const ballGroundContactMaterial = new CANNON.ContactMaterial(
            groundMaterial,
            ballMaterial,
            {
                friction: 0.4, // Fricción para que no resbale infinitamente.
                restitution: 0.7 // "Rebote". 0 es sin rebote, 1 es rebote perfecto.
            }
        );
        this.world.addContactMaterial(ballGroundContactMaterial);
        
        // Guardamos los materiales para poder usarlos en otros archivos (como en ball.js).
        this.physicsMaterials = { ground: groundMaterial, ball: ballMaterial };

        // --- SUELO FÍSICO ---
        // Creamos un plano infinito para que los objetos no caigan al vacío.
        const groundBody = new CANNON.Body({
            mass: 0, // Masa 0 significa que es un objeto estático, no se mueve.
            shape: new CANNON.Plane(),
            material: groundMaterial
        });
        // Lo rotamos para que coincida con nuestro suelo visual.
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
    }

    addLights() {
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

    animate() {
        requestAnimationFrame(() => this.animate());

        // --- ACTUALIZACIÓN DE FÍSICA ---
        // Avanzamos la simulación física un pequeño paso en el tiempo.
        this.world.step(1 / 60);

        // --- SINCRONIZACIÓN ---
        // Copiamos la posición y rotación del cuerpo físico al objeto visual.
        // Este es el paso CRUCIAL que une la física con los gráficos.
        for (const object of this.objectsToUpdate) {
            object.mesh.position.copy(object.body.position);
            object.mesh.quaternion.copy(object.body.quaternion);
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
