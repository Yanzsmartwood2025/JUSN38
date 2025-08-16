export const assetUrls = {
    runningSprite: '../assets/images/LumenFall.png',
    attackSprite: '../assets/images/hoja_de_sprites (2).png',
    jumpSprite: '../assets/images/saltando.png', // Assuming this filename is correct
    flameParticle: '../assets/images/fuego.png',
    wallTexture: '../assets/images/pared-calabozo.png',
    doorTexture: '../assets/images/puerta-calabozo.png',
    floorTexture: '../assets/images/piso-calabozo.png',
    torchTexture: '../assets/images/antorcha.png',
    specterTexture: '../assets/images/fantasma.png',
    introImage: '../assets/images/Intro.jpg',
    menuBackgroundImage: '../assets/images/menu-principal.jpg',
    animatedEnergyBar: '../assets/images/barra-de-energia.png',
    halleyStatueTexture: '../assets/images/Halley-piedra.png',
    pasosAudio: '../assets/mp3/LUMENFALL/Pasos-Joziel.mp3',
    ambienteAudio: '../assets/mp3/LUMENFALL/calabozo_de_piedra.mp3'
};

export const totalRunningFrames = 8;
export const totalAttackFrames = 6;
export const totalJumpFrames = 4;
export const totalSpecterFrames = 5;
export const animationSpeed = 80;
export const specterAnimationSpeed = 120;
export const moveSpeed = 0.2;
export const playableAreaWidth = 120;
export const roomDepth = 15;

export const translations = {
    es: {
        start: "Empezar",
        loading: "Cargando...",
        play: "JUGAR",
        languageLabel: "IDIOMA:",
        settings: "Configuración",
        musicVolume: "Música Ambiental:",
        sfxVolume: "Pasos:",
        resume: "Reanudar",
        gamepadConnected: "Control Conectado",
        audioControls: "Controles de Audio",
        halleyStatueDialogue: "Esta es la estatua de Halley, la primera guardiana. Su luz guió a los perdidos.",
        shoot: "Disparar",
        attack: "Atacar",
        activateGamepad: "Activar Control",
        deactivateGamepad: "Activar Táctil",
        toggleVibrationOn: "Vibración: ON",
        toggleVibrationOff: "Vibración: OFF"
    },
    en: {
        start: "Start",
        loading: "Loading...",
        play: "PLAY",
        languageLabel: "LANGUAGE:",
        settings: "Settings",
        musicVolume: "Ambient Music:",
        sfxVolume: "Footsteps:",
        resume: "Resume",
        gamepadConnected: "Gamepad Connected",
        audioControls: "Audio Controls",
        halleyStatueDialogue: "This is the statue of Halley, the first guardian. Her light guided the lost.",
        shoot: "Shoot",
        attack: "Attack",
        activateGamepad: "Activate Gamepad",
        deactivateGamepad: "Activate Touch",
        toggleVibrationOn: "Vibration: ON",
        toggleVibrationOff: "Vibration: OFF"
    }
};

export const MAPS = {
    dungeon_1: {
        id: 'dungeon_1',
        name: 'El Salón Principal',
        gates: [
            { id: 'gate_1', x: -50, destination: 'room_1', numeral: 'I' },
            { id: 'gate_2', x: -30, destination: 'room_2', numeral: 'II' },
            { id: 'gate_3', x: -10, destination: 'room_3', numeral: 'III' },
            { id: 'gate_4', x: 10, destination: 'room_4', numeral: 'IV' },
            { id: 'gate_5', x: 30, destination: 'room_5', numeral: 'V' },
            { id: 'gate_boss', x: 55, destination: 'boss_room', numeral: 'VI' },
        ],
        specters: [ { type: 'fear', x: 45, y: 3.5 } ],
    },
    room_1: { id: 'room_1', name: 'Habitación 1', gates: [{ id: 'return_1', x: 0, destination: 'dungeon_1', numeral: 'I' }], specters: [], puzzles: [{x: 15}] },
    room_2: { id: 'room_2', name: 'Habitación 2', gates: [{ id: 'return_2', x: 0, destination: 'dungeon_1', numeral: 'II' }], specters: [] },
    room_3: { id: 'room_3', name: 'Habitación 3', gates: [{ id: 'return_3', x: 0, destination: 'dungeon_1', numeral: 'III' }], specters: [] },
    room_4: { id: 'room_4', name: 'Habitación 4', gates: [{ id: 'return_4', x: 0, destination: 'dungeon_1', numeral: 'IV' }], specters: [] },
    room_5: {
        id: 'room_5',
        name: 'Habitación 5',
        gates: [{ id: 'return_5', x: 0, destination: 'dungeon_1', numeral: 'V' }],
        specters: [],
        statues: [{
            x: 15,
            y: 3,
            textureUrl: assetUrls.halleyStatueTexture,
            dialogueKey: 'halleyStatueDialogue'
        }]
    },
    boss_room: { id: 'boss_room', name: 'Sala del Jefe', gates: [{ id: 'return_boss', x: 0, destination: 'dungeon_1', numeral: 'VI' }], specters: [] },
};
