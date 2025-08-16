import * as THREE from 'three';
import { roomDepth } from '../utils/constants.js';

export class Orb {
    constructor(scene, camera, completedRooms, x, y, roomId) {
        this.scene = scene;
        this.roomId = roomId;
        this.isActive = completedRooms[roomId];
        this.completedRooms = completedRooms; // store reference

        this.inactiveMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        this.activeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2, roughness: 0.2 });

        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        this.mesh = new THREE.Mesh(geometry, this.isActive ? this.activeMaterial : this.inactiveMaterial);
        this.mesh.position.set(x, y, camera.position.z - roomDepth + 3);
        scene.add(this.mesh);

        this.light = new THREE.PointLight(0xffffff, 1, 10);
        this.light.position.copy(this.mesh.position);
        this.light.visible = this.isActive;
        scene.add(this.light);
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
        this.mesh.material = this.activeMaterial;
        this.light.visible = true;
        this.completedRooms[this.roomId] = true;
    }
}
