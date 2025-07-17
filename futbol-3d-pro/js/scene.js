// Importamos THREE para poder usar sus herramientas de creación de objetos 3D.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// 'export' hace que esta función esté disponible para ser usada en otros archivos (como en main.js).
export function createSoccerField() {
    // Creamos un Grupo. Es como una carpeta invisible que contendrá todas las partes del campo.
    // Así podemos mover, rotar o escalar todo el campo a la vez.
    const fieldGroup = new THREE.Group();

    // Dimensiones oficiales de un campo de fútbol (en metros).
    const fieldWidth = 105;
    const fieldLength = 68;

    // 1. CÉSPED: Creamos un plano para el césped.
    const grassGeometry = new THREE.PlaneGeometry(fieldWidth, fieldLength);
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x008f00 }); // Un color verde oscuro.
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2; // Lo rotamos 90 grados para que sea el suelo.
    grass.receiveShadow = true; // Le decimos al césped que puede recibir sombras de otros objetos.
    fieldGroup.add(grass);

    // 2. LÍNEAS: Creamos un material blanco que usaremos para todas las líneas.
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    // Función auxiliar para crear líneas rectangulares (para las áreas).
    function createBoxLine(width, height) {
        const points = [
            new THREE.Vector3(-width / 2, 0.01, -height / 2),
            new THREE.Vector3(width / 2, 0.01, -height / 2),
            new THREE.Vector3(width / 2, 0.01, height / 2),
            new THREE.Vector3(-width / 2, 0.01, height / 2),
            new THREE.Vector3(-width / 2, 0.01, -height / 2) // Cerramos el rectángulo.
        ];
        // Las posicionamos un poquito por encima del césped (0.01) para que no haya conflictos visuales.
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(geometry, lineMaterial);
    }

    // Dibujamos las diferentes líneas usando nuestra función auxiliar y medidas oficiales.
    
    // Líneas de borde
    const outerLines = createBoxLine(fieldWidth, fieldLength);
    fieldGroup.add(outerLines);

    // Línea de medio campo
    const midLinePoints = [ new THREE.Vector3(-fieldWidth / 2, 0.01, 0), new THREE.Vector3(fieldWidth / 2, 0.01, 0) ];
    const midLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(midLinePoints), lineMaterial);
    fieldGroup.add(midLine);

    // Círculo central (radio 9.15m)
    const centerCircleGeometry = new THREE.CircleGeometry(9.15, 64);
    centerCircleGeometry.vertices.shift(); // Quitamos el vértice del centro para que sea solo el borde.
    const centerCircle = new THREE.LineLoop(centerCircleGeometry, lineMaterial);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.01;
    fieldGroup.add(centerCircle);

    // Área grande (40.3m x 16.5m)
    const penaltyAreaNorth = createBoxLine(40.3, 16.5);
    penaltyAreaNorth.position.z = - (fieldLength / 2) + (16.5 / 2); // La posicionamos en un extremo.
    fieldGroup.add(penaltyAreaNorth);

    const penaltyAreaSouth = createBoxLine(40.3, 16.5);
    penaltyAreaSouth.position.z = (fieldLength / 2) - (16.5 / 2); // La posicionamos en el otro extremo.
    fieldGroup.add(penaltyAreaSouth);

    // Área pequeña (18.32m x 5.5m)
    const goalAreaNorth = createBoxLine(18.32, 5.5);
    goalAreaNorth.position.z = - (fieldLength / 2) + (5.5 / 2);
    fieldGroup.add(goalAreaNorth);

    const goalAreaSouth = createBoxLine(18.32, 5.5);
    goalAreaSouth.position.z = (fieldLength / 2) - (5.5 / 2);
    fieldGroup.add(goalAreaSouth);

    // Devolvemos el grupo con el campo completo.
    return fieldGroup;
}

