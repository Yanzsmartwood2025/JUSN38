// --- ZONA CRÍTICA: REVISA ESTAS LÍNEAS ---
// El navegador buscará estos archivos. Si uno tiene un nombre diferente o no existe, todo se detendrá.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { createSoccerField } from './scene.js';
import { createBall } from './ball.js';
import { createPlayer } from './player.js';
import { Controls } from './controls.js';

// CANNON.js se carga de forma global, así que lo asignamos a una constante.
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

        // --- CREACIÓN DE OBJETOS DEL JUEGO ---
        const soccerField = createSoccerField();
        this.scene.add(soccerField);

        const ball = createBall(this.physicsMaterials);
        this.scene.add(ball.mesh);
        this.world.addBody(ball.body);
        this.objectsToUpdate.push(ball);

        this.player = createPlayer(this.physicsMaterials, ball);
        this.scene.add(this.player.mesh);
        this.world.addBody(this.player.body);
        this.objectsToUpdate.push(this.player);

        this.controls = new Controls();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        this.animate();
    }

    initPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);

        const groundMaterial = new CANNON.Material('ground');
        const ballMaterial = new CANNON.Material('ball');
        const playerMaterial = new CANNON.Material('player');
        
        this.world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, ballMaterial, { friction: 0.4, restitution: 0.7 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(groundMaterial, playerMaterial, { friction: 0.9, restitution: 0.1 }));
        this.world.addContactMaterial(new CANNON.ContactMaterial(playerMaterial, ballMaterial, { friction: 0.1, restitution: 0.5 }));
        
        this.physicsMaterials = { ground: groundMaterial, ball: ballMaterial, player: playerMaterial };

        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: groundMaterial });
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

    updateCamera() {
        const playerPosition = this.player.mesh.position;
        const cameraOffset = new THREE.Vector3(0, 15, 25);
        this.camera.position.lerp(playerPosition.clone().add(cameraOffset), 0.1);
        this.camera.lookAt(playerPosition);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update(this.player);

        if (this.controls.keys.space) {
            this.player.kick(this.camera);
        }

        this.world.step(1 / 60);

        for (const object of this.objectsToUpdate) {
            object.mesh.position.copy(object.body.position);
            object.mesh.quaternion.copy(object.body.quaternion);
        }

        this.updateCamera();

        this.renderer.render(this.scene, this.camera);
    }
}

// Inicia el juego.
new Game();
