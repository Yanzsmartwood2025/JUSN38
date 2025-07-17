
// Importamos las librerías necesarias. 'THREE' para los gráficos y 'OrbitControls' para mover la cámara.
// También importamos nuestra función para crear el campo desde 'scene.js'.
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { createSoccerField } from './scene.js';

// --- CLASE PRINCIPAL DEL JUEGO ---
// Usamos una clase para mantener todo nuestro código organizado.
class Game {
    constructor() {
        // El constructor llama al método init para empezar todo.
        this.init();
    }

    init() {
        // 1. RENDERIZADOR: Es el encargado de dibujar la escena en el <canvas> de nuestro HTML.
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true // Esto hace que los bordes de los objetos se vean más suaves.
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // Mejora la calidad visual en pantallas de alta resolución.
        this.renderer.shadowMap.enabled = true; // Activamos las sombras para más realismo.

        // 2. ESCENA: Es el mundo virtual donde colocaremos todos nuestros objetos.
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Le damos un color de cielo azul.

        // 3. CÁMARA: Define nuestro punto de vista dentro de la escena.
        this.camera = new THREE.PerspectiveCamera(
            45, // Campo de visión (FOV). Un valor más bajo es como hacer zoom.
            window.innerWidth / window.innerHeight, // Relación de aspecto, para que no se deforme la imagen.
            0.1, // Distancia mínima que la cámara puede ver.
            1000 // Distancia máxima que la cámara puede ver.
        );
        this.camera.position.set(0, 150, 250); // Colocamos la cámara arriba y atrás para tener una buena vista del campo.

        // 4. CONTROLES: Permiten que movamos la cámara con el ratón (para probar y depurar).
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Añade un efecto suave de "inercia" al mover la cámara.
        this.controls.target.set(0, 0, 0); // Hacemos que la cámara siempre apunte al centro del campo.

        // 5. LUCES: Sin luces, nuestros objetos se verían negros.
        this.addLights();

        // 6. CAMPO DE FÚTBOL: Llamamos a la función que importamos de 'scene.js' para crear el campo.
        const soccerField = createSoccerField();
        this.scene.add(soccerField); // Añadimos el campo a nuestra escena.

        // 7. MANEJO DE REDIMENSIÓN: Hacemos que el juego se adapte si el usuario cambia el tamaño de la ventana.
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // 8. BUCLE DE ANIMACIÓN: Iniciamos la función que se ejecutará 60 veces por segundo para actualizar y dibujar el juego.
        this.animate();
    }

    addLights() {
        // Luz ambiental: ilumina todos los objetos de la escena por igual, para que no haya zonas completamente negras.
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Luz direccional: simula la luz del sol, viene de una dirección y proyecta sombras.
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-100, 100, 50); // La posicionamos arriba y a la izquierda.
        directionalLight.castShadow = true; // Le decimos a esta luz que genere sombras.
        directionalLight.shadow.mapSize.width = 2048; // Aumentamos la resolución de las sombras para que se vean mejor.
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    onWindowResize() {
        // Este método se llama cuando la ventana del navegador cambia de tamaño.
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix(); // Actualizamos la cámara.
        this.renderer.setSize(window.innerWidth, window.innerHeight); // Actualizamos el renderizador.
    }

    animate() {
        // El corazón del juego. Se llama a sí mismo en un bucle infinito.
        requestAnimationFrame(() => this.animate());

        this.controls.update(); // Actualizamos los controles de la cámara en cada fotograma.

        // Le decimos al renderizador que dibuje la escena desde el punto de vista de la cámara.
        this.renderer.render(this.scene, this.camera);
    }
}

// Finalmente, creamos una instancia de nuestro juego para que todo comience.
new Game();
