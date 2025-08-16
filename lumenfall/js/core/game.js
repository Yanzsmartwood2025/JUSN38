import * as THREE from 'three';
import { assetUrls, MAPS, roomDepth, playableAreaWidth } from '../utils/constants.js';
import { loadAudio, playAudio, stopAudio, setAudioVolume } from '../utils/audio.js';
import { Player } from '../entities/Player.js';
import { Specter } from '../entities/Specter.js';
import { Puzzle } from '../interactables/Puzzle.js';
import { Statue } from '../interactables/Statue.js';
import { RealisticFlame } from '../interactables/RealisticFlame.js';

export class Game {
    constructor() {
        this.ui = null;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true, alpha: true });
        this.textureLoader = new THREE.TextureLoader();
        this.clock = new THREE.Clock();

        this.player = null;
        this.allFlames = [];
        this.allSpecters = [];
        this.allGates = [];
        this.allStatues = [];
        this.allOrbs = [];
        this.allPuzzles = [];
        this.allProjectiles = [];

        this.currentLevelId = 'dungeon_1';
        this.isPaused = false;
        this.isTransitioning = false;
        this.animationFrameId = null;

        this.completedRooms = { room_1: false, room_2: false, room_3: false, room_4: false, room_5: false };

        this.isGamepadModeActive = false;
        this.isVibrationEnabled = true;
        this.isAttackButtonPressed = false;
        this.attackPressStartTime = 0;
        this.interactPressed = false;
        this.joyVector = new THREE.Vector2(0, 0);

        this.wallMaterial = new THREE.MeshStandardMaterial({ map: this.textureLoader.load(assetUrls.wallTexture), color: 0x454555 });
        this.doorMaterial = new THREE.MeshStandardMaterial({ map: this.textureLoader.load(assetUrls.doorTexture), transparent: true, alphaTest: 0.5 });
        const floorTexture = this.textureLoader.load(assetUrls.floorTexture);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(playableAreaWidth / 4, roomDepth / 5);
        this.floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
        this.torchMaterial = new THREE.MeshStandardMaterial({ map: this.textureLoader.load(assetUrls.torchTexture), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });

        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
    }

    setUI(ui) {
        this.ui = ui;
    }

    setupCamera() {
        this.camera.position.set(0, 4, 8);
        this.camera.lookAt(0, 2, 0);
        this.camera.far = roomDepth + 50;
        this.camera.updateProjectionMatrix();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x000000, 0);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x808080, 1.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xaaaaaa, 0.5);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }

    async start() {
        try {
            await Promise.all([
                loadAudio('pasos', assetUrls.pasosAudio),
                loadAudio('ambiente', assetUrls.ambienteAudio)
            ]);
        } catch (error) {
            console.error("Error loading audio", error);
        }
        playAudio('ambiente', true);
        this.ui.setInitialAudioVolume();

        this.player = new Player(this.scene, this.camera, this.textureLoader);
        this.loadLevelById(this.currentLevelId);
        this.animate();
    }

    pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        stopAudio('ambiente');
        stopAudio('pasos');
        cancelAnimationFrame(this.animationFrameId);
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        playAudio('ambiente', true);
        this.animate();
    }

    animate() {
        if (this.isPaused) return;
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();

        if (this.isGamepadModeActive) {
            this.ui.handleGamepadInput();
        }

        if (this.player && !this.isTransitioning) {
            const attackHeld = this.isAttackButtonPressed && (Date.now() - this.attackPressStartTime > 200);
            this.player.update(deltaTime, { joyVector: this.joyVector, attackHeld }, this.allProjectiles, this.isVibrationEnabled);
            this.ui.checkInteractions();
            this.ui.handleFootsteps(this.player.isGrounded, this.joyVector);
        }

        this.interactPressed = false;
        this.allFlames.forEach(flame => flame.update(deltaTime));
        this.allSpecters.forEach(specter => specter.update(deltaTime, this.player));
        this.allPuzzles.forEach(puzzle => puzzle.update(deltaTime));

        for (let i = this.allProjectiles.length - 1; i >= 0; i--) {
            if (!this.allProjectiles[i].update(deltaTime)) {
                this.scene.remove(this.allProjectiles[i].mesh);
                this.allProjectiles.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    clearSceneForLevelLoad() {
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const obj = this.scene.children[i];
            if (obj !== this.player.mesh && obj !== this.player.playerLight && !(obj instanceof THREE.Camera) && !(obj instanceof THREE.Light)) {
                this.scene.remove(obj);
            }
        }
        this.allFlames.length = 0;
        this.allSpecters.length = 0;
        this.allGates.length = 0;
        this.allStatues.length = 0;
        this.allOrbs.length = 0;
        this.allPuzzles.length = 0;
        this.ui.numeralsContainer.innerHTML = '';
    }

    createTorch(x, y, z, isLit) {
        const torchMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), this.torchMaterial);
        torchMesh.position.set(x, y, z);
        this.scene.add(torchMesh);
        if (isLit) {
            this.allFlames.push(new RealisticFlame(this.scene, this.textureLoader, new THREE.Vector3(x, y + 1.3, z + 0.2)));
        }
    }

    areAllRoomsComplete() {
        return Object.values(this.completedRooms).every(status => status === true);
    }

    loadLevel(levelData) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(playableAreaWidth, roomDepth), this.floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = this.camera.position.z - (roomDepth / 2);
        floor.receiveShadow = true;
        this.scene.add(floor);

        const wall = new THREE.Mesh(new THREE.PlaneGeometry(playableAreaWidth, 20), this.wallMaterial);
        wall.position.set(0, 10, this.camera.position.z - roomDepth);
        this.scene.add(wall);

        levelData.gates.forEach(gateData => {
            if (gateData.id === 'gate_boss' && !this.areAllRoomsComplete()) return;

            const gateGroup = new THREE.Group();
            const gateMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.doorMaterial.clone());
            gateMesh.position.set(0, 4, 0.3);
            gateGroup.add(gateMesh);
            gateGroup.position.x = gateData.x;
            gateGroup.position.z = this.camera.position.z - roomDepth;
            this.scene.add(gateGroup);

            const numeralElement = this.ui.createNumeral(gateData.numeral, this.completedRooms[gateData.destination], levelData.id !== 'dungeon_1');
            this.allGates.push({ mesh: gateGroup, id: gateData.id, destination: gateData.destination, numeralElement: numeralElement });
            this.createTorch(gateData.x - 6, 3.2, this.camera.position.z - roomDepth + 0.5, this.completedRooms[gateData.destination]);
            this.createTorch(gateData.x + 6, 3.2, this.camera.position.z - roomDepth + 0.5, this.completedRooms[gateData.destination]);
        });

        levelData.specters.forEach(specterData => {
            this.allSpecters.push(new Specter(this.scene, this.textureLoader, this.camera, specterData.x, specterData.y));
        });

        if (levelData.puzzles) {
            levelData.puzzles.forEach(puzzleData => {
                this.allPuzzles.push(new Puzzle(this.scene, this.camera, this.textureLoader, this.completedRooms, this.allOrbs, puzzleData.x, levelData.id));
            });
        }

        if (levelData.statues) {
            levelData.statues.forEach(statueData => {
                this.allStatues.push(new Statue(this.scene, this.textureLoader, this.ui.showDialogue.bind(this.ui), statueData.x, statueData.y, this.camera.position.z - roomDepth + 2, statueData.textureUrl, statueData.dialogueKey));
            });
        }
    }

    loadLevelById(levelId, spawnX = null) {
        const levelData = MAPS[levelId];
        if (!levelData) return;
        this.currentLevelId = levelId;
        this.clearSceneForLevelLoad();
        this.loadLevel(levelData);
        if (this.player) {
            this.player.mesh.position.x = spawnX !== null ? spawnX : 0;
            this.player.mesh.position.y = this.player.mesh.geometry.parameters.height / 2;
            this.player.mesh.position.z = 0;
            this.camera.position.x = this.player.mesh.position.x;
        }
    }
}
