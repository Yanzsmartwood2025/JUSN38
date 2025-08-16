import * as THREE from 'three';
import { assetUrls, roomDepth } from '../utils/constants.js';
import { Orb } from './Orb.js';

export class Puzzle {
    constructor(scene, camera, textureLoader, completedRooms, allOrbs, x, roomId) {
        this.scene = scene;
        this.camera = camera;
        this.textureLoader = textureLoader;
        this.completedRooms = completedRooms;
        this.allOrbs = allOrbs;
        this.roomId = roomId;
        this.isSolved = this.completedRooms[this.roomId];
        this.pieces = [];
        this.init(x);
        this.mesh = this.table;
    }

    init(x) {
        const tableGeometry = new THREE.BoxGeometry(8, 2, 4);
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.table = new THREE.Mesh(tableGeometry, tableMaterial);
        this.table.position.set(x, 1, this.camera.position.z - roomDepth + 4);
        this.scene.add(this.table);

        if (this.isSolved) {
            this.createOrb();
            this.orb.activate();
            return;
        }

        const texture = this.textureLoader.load(assetUrls.halleyStatueTexture);
        const pieceSize = 3;

        const correctPositions = [
            new THREE.Vector3(-pieceSize/2, pieceSize/2, 0),
            new THREE.Vector3(pieceSize/2, pieceSize/2, 0),
            new THREE.Vector3(-pieceSize/2, -pieceSize/2, 0),
            new THREE.Vector3(pieceSize/2, -pieceSize/2, 0),
        ];

        let initialPositions = [...correctPositions].sort(() => Math.random() - 0.5);

        for (let i = 0; i < 4; i++) {
            const material = new THREE.MeshStandardMaterial({
                map: texture.clone(),
                transparent: true,
                alphaTest: 0.1
            });
            material.map.repeat.set(0.5, 0.5);
            material.map.offset.set((i % 2) * 0.5, (i < 2 ? 0.5 : 0));

            const piece = new THREE.Mesh(new THREE.PlaneGeometry(pieceSize, pieceSize), material);
            piece.position.copy(initialPositions[i]).add(new THREE.Vector3(x, 4, this.table.position.z + 2.1));
            piece.userData.targetPosition = correctPositions[i].clone().add(new THREE.Vector3(x, 4, this.table.position.z + 2.1));
            this.pieces.push(piece);
            this.scene.add(piece);
        }
    }

    solve() {
        if (this.isSolved) return;
        this.isSolved = true;

        this.pieces.forEach(piece => {
            const startPos = piece.position.clone();
            const endPos = piece.userData.targetPosition;
            let t = 0;
            const duration = 1;
            const animatePiece = () => {
                t += 0.05;
                piece.position.lerpVectors(startPos, endPos, Math.min(t/duration, 1.0));
                if (t < duration) requestAnimationFrame(animatePiece);
            };
            animatePiece();
        });

        setTimeout(() => {
            this.createOrb();
            this.orb.activate();
        }, 1200);
    }

    createOrb() {
        this.orb = new Orb(this.scene, this.camera, this.completedRooms, this.mesh.position.x, this.mesh.position.y + 2.5, this.roomId);
        this.allOrbs.push(this.orb);
    }

    update(deltaTime) {}
}
