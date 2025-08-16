import * as THREE from 'three';
import { assetUrls } from '../utils/constants.js';

export class Projectile {
    constructor(scene, textureLoader, startPosition, direction) {
        this.scene = scene;
        this.lifetime = 2;
        this.speed = 0.5;

        const material = new THREE.MeshBasicMaterial({
            map: textureLoader.load(assetUrls.flameParticle),
            color: 0xaaddff,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);

        this.velocity = new THREE.Vector3(direction.x, direction.y, 0).multiplyScalar(this.speed);

        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            return false;
        }
        this.mesh.position.x += this.velocity.x;
        this.mesh.position.y += this.velocity.y;
        return true;
    }
}
