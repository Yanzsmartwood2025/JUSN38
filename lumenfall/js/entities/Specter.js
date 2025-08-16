import * as THREE from 'three';
import { assetUrls, totalSpecterFrames, roomDepth, playableAreaWidth, specterAnimationSpeed } from '../utils/constants.js';

export class Specter {
    constructor(scene, textureLoader, camera, initialX, initialY) {
        this.scene = scene;
        this.textureLoader = textureLoader;
        this.camera = camera;
        this.initialX = initialX;
        this.floatingCenterY = initialY;
        this.state = 'IDLE';
        this.stateTimer = Math.random() * 2 + 2;
        this.targetPosition = new THREE.Vector3();
        this.moveSpeed = 0.05;
        this.lastFrameTime = 0;
        this.currentFrame = 0;
        this.init();
    }

    init() {
        this.texture = this.textureLoader.load(assetUrls.specterTexture);
        this.texture.repeat.x = 1 / totalSpecterFrames;
        const specterMaterial = new THREE.MeshStandardMaterial({ map: this.texture, color: 0x88bbff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, alphaTest: 0.1 });
        const specterGeometry = new THREE.PlaneGeometry(4.2, 4.2);
        this.mesh = new THREE.Mesh(specterGeometry, specterMaterial);
        this.mesh.position.set(this.initialX, this.floatingCenterY, this.camera.position.z - roomDepth + 1);
        this.scene.add(this.mesh);
    }

    setNewState(newState) {
        this.state = newState;
        switch(this.state) {
            case 'IDLE':
                this.stateTimer = Math.random() * 2 + 2;
                break;
            case 'MOVING':
                const newX = Math.random() * (playableAreaWidth - 20) - (playableAreaWidth / 2 - 10);
                this.targetPosition.set(newX, this.floatingCenterY, this.mesh.position.z);
                this.stateTimer = 10;
                break;
            case 'PHASING_DOWN':
                this.stateTimer = 1.5;
                break;
            case 'PHASING_UP':
                const spawnX = Math.random() * (playableAreaWidth - 20) - (playableAreaWidth / 2 - 10);
                this.mesh.position.set(spawnX, -5, this.mesh.position.z);
                this.stateTimer = 1.5;
                break;
            case 'FLEEING':
                 this.targetPosition.x = this.mesh.position.x + (this.mesh.position.x > 0 ? 15 : -15);
                 this.targetPosition.x = Math.max(-playableAreaWidth/2 + 5, Math.min(playableAreaWidth/2 - 5, this.targetPosition.x));
                 this.stateTimer = 3;
                break;
        }
    }

    update(deltaTime, player) {
        this.stateTimer -= deltaTime;

        if (Date.now() - this.lastFrameTime > specterAnimationSpeed) {
            this.lastFrameTime = Date.now();
            this.currentFrame = (this.currentFrame + 1) % totalSpecterFrames;
            this.texture.offset.x = this.currentFrame / totalSpecterFrames;
        }

        switch(this.state) {
            case 'IDLE':
                this.mesh.position.y = this.floatingCenterY + Math.sin(Date.now() * 0.002) * 0.5;
                if (this.stateTimer <= 0) {
                    this.setNewState(Math.random() > 0.3 ? 'MOVING' : 'PHASING_DOWN');
                }
                break;

            case 'MOVING':
            case 'FLEEING':
                const direction = this.targetPosition.clone().sub(this.mesh.position).normalize();
                const speed = this.state === 'FLEEING' ? this.moveSpeed * 2 : this.moveSpeed;
                this.mesh.position.x += direction.x * speed;

                if (direction.x > 0.01) this.mesh.scale.x = -1;
                if (direction.x < -0.01) this.mesh.scale.x = 1;

                if (this.mesh.position.distanceTo(this.targetPosition) < 1 || this.stateTimer <= 0) {
                    this.setNewState('IDLE');
                }
                break;

            case 'PHASING_DOWN':
                this.mesh.material.opacity = Math.max(0, 1 - (1.5 - this.stateTimer) / 1.5);
                this.mesh.position.y -= 0.1;
                if (this.stateTimer <= 0) {
                    this.setNewState('PHASING_UP');
                }
                break;

            case 'PHASING_UP':
                this.mesh.material.opacity = Math.min(0.8, (1.5 - this.stateTimer) / 1.5);
                this.mesh.position.y = Math.min(this.floatingCenterY, this.mesh.position.y + 0.1);
                 if (this.stateTimer <= 0) {
                    this.mesh.material.opacity = 0.8;
                    this.mesh.position.y = this.floatingCenterY;
                    this.setNewState('IDLE');
                }
                break;
        }

        if (player && this.state !== 'PHASING_DOWN' && this.state !== 'PHASING_UP' && this.state !== 'FLEEING') {
            if (player.mesh.position.distanceTo(this.mesh.position) < 8) {
                this.setNewState('FLEEING');
            }
        }
    }
}
