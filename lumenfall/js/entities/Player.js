import * as THREE from 'three';
import { assetUrls, totalRunningFrames, totalAttackFrames, totalJumpFrames, moveSpeed, playableAreaWidth, animationSpeed } from '../utils/constants.js';
import { Projectile } from '../interactables/Projectile.js';
import { vibrateGamepad } from '../utils/gamepad.js';

export class Player {
    constructor(scene, camera, textureLoader) {
        this.scene = scene;
        this.camera = camera;
        this.textureLoader = textureLoader;

        this.runningTexture = this.textureLoader.load(assetUrls.runningSprite);
        this.attackTexture = this.textureLoader.load(assetUrls.attackSprite);
        this.jumpTexture = this.textureLoader.load(assetUrls.jumpSprite);

        this.runningTexture.repeat.x = 1 / totalRunningFrames;
        this.attackTexture.repeat.x = 1 / totalAttackFrames;
        this.jumpTexture.repeat.x = 1 / totalJumpFrames;

        const playerHeight = 2.8;
        const playerWidth = 2.8;

        const playerGeometry = new THREE.PlaneGeometry(playerWidth, playerHeight);
        const playerMaterial = new THREE.MeshStandardMaterial({ map: this.runningTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
        this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.mesh.position.y = playerHeight / 2;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.playerLight = new THREE.PointLight(0xffffff, 0.5, 8);
        this.scene.add(this.playerLight);

        this.createAttackFlame();

        this.currentState = 'idle';
        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.isFacingLeft = false;
        this.isGrounded = true;
        this.velocity = new THREE.Vector3();
        this.jumpPower = 0.35;
        this.gravity = -0.025;
        this.isJumping = false;
        this.minPlayerX = -playableAreaWidth/2 + 1.5;
        this.maxPlayerX = playableAreaWidth/2 - 1.5;
        this.jumpInputReceived = false;
        this.shootCooldown = 0;
        this.shootCooldownDuration = 0.5;
        this.shootingTimer = 0;
    }

    shoot(aimVector, allProjectiles, isVibrationEnabled) {
        if (this.shootCooldown > 0) return;
        vibrateGamepad(isVibrationEnabled, 50, 0.5, 0.5);

        const startPosition = this.mesh.position.clone().add(new THREE.Vector3(0, 0.2, 0.5));
        let direction = new THREE.Vector2(this.isFacingLeft ? -1 : 1, 0);

        if (Math.abs(aimVector.y) > 0.3) {
            direction.y = aimVector.y;
        }
        direction.normalize();

        allProjectiles.push(new Projectile(this.scene, this.textureLoader, startPosition, direction));
        this.shootCooldown = this.shootCooldownDuration;
        this.currentState = 'shooting';
        this.shootingTimer = 0.2;
    }

    createAttackFlame() {
        const flameGroup = new THREE.Group();
        const flameLight = new THREE.PointLight(0x00aaff, 1.5, 4);
        flameLight.castShadow = true;
        flameGroup.add(flameLight);
        const attackFlameMaterial = new THREE.MeshBasicMaterial({ map: this.textureLoader.load(assetUrls.flameParticle), color: 0xaaddff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const flameCore = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), attackFlameMaterial);
        flameGroup.add(flameCore);
        flameGroup.visible = false;
        this.mesh.add(flameGroup);
        this.rightHandFlame = flameGroup;
        this.rightHandFlame.position.set(-0.6, 0.3, 0.3);

        const leftHandFlame = flameGroup.clone();
        this.mesh.add(leftHandFlame);
        this.leftHandFlame = leftHandFlame;
        this.leftHandFlame.position.set(0.6, 0.3, 0.3);
    }

    updateAttackFlames() {
        [this.rightHandFlame, this.leftHandFlame].forEach(flame => {
            const light = flame.children[0];
            const core = flame.children[1];
            light.intensity = 1.0 + Math.random() * 0.5;
            const scale = 0.8 + Math.random() * 0.4;
            core.scale.set(scale, scale, scale);
            core.rotation.z += 0.1;
        });
    }

    update(deltaTime, controls, allProjectiles, isVibrationEnabled) {
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
        if (this.shootingTimer > 0) {
            this.shootingTimer -= deltaTime;
            if (this.shootingTimer <= 0) {
                this.currentState = 'idle';
            }
        }

        const joyX = controls.joyVector.x;
        const joyY = controls.joyVector.y;
        const isMoving = Math.abs(joyX) > 0.1;
        const previousState = this.currentState;

        if (this.currentState !== 'shooting') {
            if (controls.attackHeld) {
                if(this.currentState !== 'attacking') vibrateGamepad(isVibrationEnabled, 100, 0.8, 0.8);
                this.currentState = 'attacking';
            } else {
                const isJumpingInput = joyY > 0.5;
                if (isJumpingInput && this.isGrounded && !this.jumpInputReceived) {
                    this.isJumping = true;
                    this.isGrounded = false;
                    this.velocity.y = this.jumpPower;
                    this.currentState = 'jumping';
                    this.jumpInputReceived = true;
                } else if (!isJumpingInput) {
                    this.jumpInputReceived = false;
                }

                if (isMoving) {
                    this.currentState = 'running';
                    this.mesh.position.x += moveSpeed * joyX;
                    this.isFacingLeft = joyX < 0;
                } else if (!this.isJumping) {
                    this.currentState = 'idle';
                }
            }
        }

        if (!this.isGrounded) this.velocity.y += this.gravity;
        this.mesh.position.y += this.velocity.y;

        if (this.mesh.position.y <= this.mesh.geometry.parameters.height / 2) {
            this.mesh.position.y = this.mesh.geometry.parameters.height / 2;
            this.isGrounded = true;
            this.isJumping = false;
            this.velocity.y = 0;
        }

        this.mesh.position.x = Math.max(this.minPlayerX, Math.min(this.maxPlayerX, this.mesh.position.x));
        this.mesh.rotation.y = this.isFacingLeft ? Math.PI : 0;
        this.camera.position.x = this.mesh.position.x;
        this.playerLight.position.set(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z + 2);

        if (this.currentState !== previousState) this.currentFrame = 0;

        const isAttacking = this.currentState === 'attacking';
        this.rightHandFlame.visible = isAttacking;
        this.leftHandFlame.visible = isAttacking;
        if (isAttacking) this.updateAttackFlames();

        if (Date.now() - this.lastFrameTime > animationSpeed) {
            this.lastFrameTime = Date.now();
            let totalFrames, currentTexture;
            switch (this.currentState) {
                case 'shooting': [totalFrames, currentTexture] = [totalAttackFrames, this.attackTexture]; this.currentFrame = 2; break;
                case 'attacking': [totalFrames, currentTexture] = [totalAttackFrames, this.attackTexture]; if (this.currentFrame < totalFrames - 1) this.currentFrame++; break;
                case 'running': [totalFrames, currentTexture] = [totalRunningFrames, this.runningTexture]; this.currentFrame = (this.currentFrame + 1) % totalFrames; break;
                case 'jumping': [totalFrames, currentTexture] = [totalJumpFrames, this.jumpTexture]; this.currentFrame = this.velocity.y > 0 ? 1 : 2; break;
                default: [totalFrames, currentTexture] = [totalAttackFrames, this.attackTexture]; this.currentFrame = 0; break;
            }
            if (currentTexture) {
                this.mesh.material.map = currentTexture;
                currentTexture.offset.x = this.currentFrame / totalFrames;
            }
        }
    }
}
