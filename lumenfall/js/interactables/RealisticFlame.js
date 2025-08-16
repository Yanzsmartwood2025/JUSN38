import * as THREE from 'three';
import { assetUrls } from '../utils/constants.js';

export class RealisticFlame {
    constructor(scene, textureLoader, position) {
        this.scene = scene;
        this.textureLoader = textureLoader;
        this.position = position;
        this.particleCount = 20;
        this.velocities = [];
        this.init();
    }

    init() {
        const particleMaterial = new THREE.PointsMaterial({ color: 0x00aaff, size: 0.4, map: this.textureLoader.load(assetUrls.flameParticle), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = this.position.x;
            positions[i * 3 + 1] = this.position.y;
            positions[i * 3 + 2] = this.position.z;
            this.velocities.push({ x: (Math.random() - 0.5) * 0.02, y: Math.random() * 0.1, z: (Math.random() - 0.5) * 0.02, lifetime: Math.random() * 2 });
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
        this.light = new THREE.PointLight(0x00aaff, 2.0, 20);
        this.light.position.copy(this.position);
        this.light.castShadow = true;
        this.scene.add(this.light);
    }

    update(deltaTime) {
        const positions = this.particles.geometry.attributes.position.array;
        for (let i = 0; i < this.particleCount; i++) {
            const vel = this.velocities[i];
            vel.lifetime -= deltaTime;
            if (vel.lifetime <= 0) {
                positions[i * 3] = this.position.x;
                positions[i * 3 + 1] = this.position.y;
                positions[i * 3 + 2] = this.position.z;
                vel.lifetime = Math.random() * 2;
                vel.y = Math.random() * 0.1;
            }
            positions[i * 3] += vel.x;
            positions[i * 3 + 1] += vel.y;
            positions[i * 3 + 2] += vel.z;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.light.intensity = 1.0 + Math.sin(Date.now() * 0.01 + this.position.x) * 0.5;
    }
}
