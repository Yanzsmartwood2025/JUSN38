import * as THREE from 'three';

export class Statue {
    constructor(scene, textureLoader, showDialogue, x, y, z, textureUrl, dialogueKey) {
        this.scene = scene;
        this.textureLoader = textureLoader;
        this.showDialogue = showDialogue; // dependency injection
        this.dialogueKey = dialogueKey;

        this.texture = this.textureLoader.load(textureUrl);
        const material = new THREE.MeshStandardMaterial({
            map: this.texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        const geometry = new THREE.PlaneGeometry(6, 6);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.scene.add(this.mesh);
    }

    interact() {
        this.showDialogue(this.dialogueKey, 4000);
    }
}
