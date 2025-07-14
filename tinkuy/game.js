// --- Configuración y Constantes ---
let scene, camera, renderer, clock;
let player1, player2, platform;
let p1Controller, p2Controller;

const GRAVITY = -0.025, JUMP_FORCE = 0.6, MOVE_SPEED = 0.12;
const COMBO_WINDOW = 400; 
const DASH_WINDOW = 280;

// --- Estado del Juego ---
let gameState = 'MAIN_MENU';
let gameSettings = { rounds: 3, time: 99 };
let currentRound = 1, player1Wins = 0, player2Wins = 0;
let p1Char, p2Char;
let timerValue, timerInterval;

// --- Lógica de Menús ---
let activeMenuItem = 0;
let charSelectState = { p1_cursor: 0, p2_cursor: 1, turn: 'P1' };
const characterRoster = [
    { name: 'Juanchis', color: 0x33ff33, unlocked: true }, 
    { name: 'Joziel', color: 0xff33ff, unlocked: true },
    { name: 'Cotti', color: 0x3333ff, unlocked: true }, 
    { name: 'Aria', color: 0xff3333, unlocked: true },
    ...Array(16).fill({ name: '?', unlocked: false })
];

// --- Audio ---
let punchSynth, kickSynth, hitSynth, menuMoveSynth, menuSelectSynth;
let audioInitialized = false;
function initAudio() {
    if (audioInitialized || !window.Tone) return; 
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    punchSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination();
    kickSynth = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination();
    hitSynth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination();
    menuMoveSynth = new Tone.Synth({ oscillator: {type: 'sine'}, envelope: {attack: 0.01, decay: 0.1, sustain: 0.01, release: 0.1}}).toDestination();
    menuSelectSynth = new Tone.Synth({ oscillator: {type: 'sawtooth'}, envelope: {attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2}}).toDestination();
    audioInitialized = true;
}

// --- Inicialización 3D ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1d2951);
    scene.fog = new THREE.Fog(0x1d2951, 15, 40);
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').insertBefore(renderer.domElement, document.getElementById('main-menu'));
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    const platformGeometry = new THREE.BoxGeometry(30, 1, 10);
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x555560, roughness: 0.8 });
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.5;
    platform.receiveShadow = true;
    scene.add(platform);
    
    setupControls();
    updateMainMenuUI();
    buildCharGrid();
    animate();
}

// --- Creación de Jugadores ---
function createMannequinPlayer(color, positionX, movesetName) {
    const playerGroup = new THREE.Group();
    playerGroup.name = "playerGroup";
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.2 });
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
    const createLimbPart = (h, r) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), bodyMaterial);
    const createJoint = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), jointMaterial);
    const hips = createJoint(0.35); hips.name = "hips"; hips.position.y = 1.2; playerGroup.add(hips);
    const torso = createLimbPart(1.2, 0.5); torso.name = "torso"; torso.position.y = 0.6; torso.castShadow = true; hips.add(torso);
    const neck = createJoint(0.2); neck.position.y = 0.7; torso.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 16), bodyMaterial); head.position.y = 0.3; head.castShadow = true; neck.add(head);
    ['left', 'right'].forEach(side => {
        const x = side === 'left' ? -0.65 : 0.65;
        const shoulder = createJoint(0.25); shoulder.name = `${side}_shoulder`; shoulder.position.set(x, 0.5, 0); torso.add(shoulder);
        const upperArm = createLimbPart(0.8, 0.15); upperArm.name = `${side}_upper_arm`; upperArm.position.y = -0.5; upperArm.castShadow = true; shoulder.add(upperArm);
        const elbow = createJoint(0.2); elbow.name = `${side}_elbow`; elbow.position.y = -0.4; upperArm.add(elbow);
        const lowerArm = createLimbPart(0.8, 0.15); lowerArm.name = `${side}_lower_arm`; lowerArm.position.y = -0.5; lowerArm.castShadow = true; elbow.add(lowerArm);
    });
    ['left', 'right'].forEach(side => {
        const x = side === 'left' ? -0.25 : 0.25;
        const hipJoint = createJoint(0.28); hipJoint.name = `${side}_hip`; hipJoint.position.set(x, -0.1, 0); hips.add(hipJoint);
        const upperLeg = createLimbPart(1.0, 0.2); upperLeg.name = `${side}_upper_leg`; upperLeg.position.y = -0.6; upperLeg.castShadow = true; hipJoint.add(upperLeg);
        const knee = createJoint(0.22); knee.name = `${side}_knee`; knee.position.y = -0.5; upperLeg.add(knee);
        const lowerLeg = createLimbPart(1.0, 0.2); lowerLeg.name = `${side}_lower_leg`; lowerLeg.position.y = -0.6; lowerLeg.castShadow = true; knee.add(lowerLeg);
    });
    playerGroup.position.set(positionX, 0, 0);
    
    const baseY = 1.1; 
    playerGroup.userData = { 
        health: 100, power: 0, 
        velocity: new THREE.Vector3(0, 0, 0), 
        facingDirection: 1, 
        isJumping: false, isCrouching: false, isBlocking: false,
        state: 'IDLE',
        baseY: baseY,
        movesetName: movesetName,
        currentAttack: null
    };
    
    return playerGroup;
}

function createPlayers() {
    if(player1) scene.remove(player1);
    if(player2) scene.remove(player2);

    const p1Moveset = movesets[p1Char.name] || juanchisMoveset;
    const p2Moveset = movesets[p2Char.name] || juanchisMoveset;
    
    player1 = createMannequinPlayer(p1Char.color, -5, p1Moveset.name);
    player2 = createMannequinPlayer(p2Char.color, 5, p2Moveset.name);
    
    scene.add(player1);
    scene.add(player2);

    const p1Controls = { up: 'w', down: 's', left: 'a', right: 'd', punch: 'q', kick: 'e' };
    const p2Controls = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', punch: 'o', kick: 'p' };
    
    p1Controller = new CharacterController(player1, p1Moveset, p1Controls);
    p2Controller = new CharacterController(player2, p2Moveset, p2Controls);
}

// --- Lógica de Controles ---
function setupControls() {
    let lastKeyTime = 0;
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (gameState === 'FIGHTING') {
            p1Controller?.handleKeyDown(key);
            p2Controller?.handleKeyDown(key);
            return;
        }
        const now = Date.now();
        if (now - lastKeyTime < 150) return;
        lastKeyTime = now;
        if (gameState === 'MAIN_MENU') handleMenuInput(key);
        else if (gameState === 'CHAR_SELECT') handleCharSelectInput(key);
        else if (gameState === 'GAME_OVER' && (key === 'enter' || key === 'q' || key === 'o')) {
            returnToMainMenu();
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
         if (gameState === 'FIGHTING') {
            p1Controller?.handleKeyUp(key);
            p2Controller?.handleKeyUp(key);
        }
    });

    document.querySelectorAll('.menu-item').forEach((item, index) => {
        item.addEventListener('click', () => handleMenuItemClick(index));
    });
    document.getElementById('char-grid').addEventListener('click', (e) => {
        const slot = e.target.closest('.char-slot.unlocked');
        if (slot) handleCharSlotClick(parseInt(slot.dataset.index));
    });
    
    const buttonMappings = [
        { id: 'p1-up', key: 'w', controller: 'p1' }, { id: 'p1-left', key: 'a', controller: 'p1' }, { id: 'p1-down', key: 's', controller: 'p1' }, { id: 'p1-right', key: 'd', controller: 'p1' }, { id: 'p1-punch', key: 'q', controller: 'p1' }, { id: 'p1-kick', key: 'e', controller: 'p1' },
        { id: 'p2-up', key: 'arrowup', controller: 'p2' }, { id: 'p2-left', key: 'arrowleft', controller: 'p2' }, { id: 'p2-down', key: 'arrowdown', controller: 'p2' }, { id: 'p2-right', key: 'arrowright', controller: 'p2' }, { id: 'p2-punch', key: 'o', controller: 'p2' }, { id: 'p2-kick', key: 'p', controller: 'p2' }
    ];
    buttonMappings.forEach(map => {
        const el = document.getElementById(map.id);
        const press = (e) => { e.preventDefault(); if (gameState === 'FIGHTING') { (map.controller === 'p1' ? p1Controller : p2Controller)?.handleKeyDown(map.key); } };
        const release = (e) => { e.preventDefault(); if (gameState === 'FIGHTING') { (map.controller === 'p1' ? p1Controller : p2Controller)?.handleKeyUp(map.key); } };
        el.addEventListener('mousedown', press);
        el.addEventListener('mouseup', release);
        el.addEventListener('mouseleave', release);
        el.addEventListener('touchstart', press);
        el.addEventListener('touchend', release);
    });
}

// --- Lógica de Menús (sin cambios) ---
function handleMenuItemClick(index) { initAudio(); activeMenuItem = index; const action = document.querySelectorAll('.menu-item')[index].dataset.action; if (action === 'rounds') { menuMoveSynth.triggerAttackRelease('E4', '8n'); gameSettings.rounds = (gameSettings.rounds % 5) + 1; } else if (action === 'time') { menuMoveSynth.triggerAttackRelease('E4', '8n'); const times = [99, 60, 30, 0]; let currentIndex = times.indexOf(gameSettings.time); gameSettings.time = times[(currentIndex + 1) % times.length]; } else if (action === 'fight') { menuSelectSynth.triggerAttackRelease('G4', '8n'); gameState = 'CHAR_SELECT'; document.getElementById('main-menu').style.display = 'none'; document.getElementById('char-select-screen').style.display = 'flex'; updateCharSelectUI(); } updateMainMenuUI(); }
function handleCharSlotClick(index) { initAudio(); if (!characterRoster[index].unlocked) return; let cursor = charSelectState.turn === 'P1' ? 'p1_cursor' : 'p2_cursor'; charSelectState[cursor] = index; menuMoveSynth.triggerAttackRelease('C4', '8n'); menuSelectSynth.triggerAttackRelease('G4', '8n'); if (charSelectState.turn === 'P1') { p1Char = characterRoster[index]; charSelectState.turn = 'P2'; document.getElementById('char-select-title').textContent = 'P2 Elige'; if (charSelectState.p1_cursor === charSelectState.p2_cursor) { charSelectState.p2_cursor = (charSelectState.p2_cursor + 1) % characterRoster.length; } } else { p2Char = characterRoster[index]; document.getElementById('char-select-screen').style.display = 'none'; startGame(); } updateCharSelectUI(); }
function handleMenuInput(key) { const menuItems = document.querySelectorAll('.menu-item'); if (key === 'arrowdown') { activeMenuItem = (activeMenuItem + 1) % menuItems.length; menuMoveSynth.triggerAttackRelease('C4', '8n'); } else if (key === 'arrowup') { activeMenuItem = (activeMenuItem - 1 + menuItems.length) % menuItems.length; menuMoveSynth.triggerAttackRelease('C4', '8n'); } else if (key === 'enter' || key === 'q' || key === 'o') { handleMenuItemClick(activeMenuItem); } else if (key === 'arrowleft' || key === 'arrowright') { const action = menuItems[activeMenuItem].dataset.action; if (action === 'rounds' || action === 'time') { handleMenuItemClick(activeMenuItem); } } updateMainMenuUI(); }
function handleCharSelectInput(key) { const cols = 5; let cursor = charSelectState.turn === 'P1' ? 'p1_cursor' : 'p2_cursor'; let currentPos = charSelectState[cursor]; let moved = false; if (key === 'arrowdown') { currentPos = (currentPos + cols) % characterRoster.length; moved = true; } else if (key === 'arrowup') { currentPos = (currentPos - cols + characterRoster.length) % characterRoster.length; moved = true; } else if (key === 'arrowleft') { currentPos = (currentPos - 1 + characterRoster.length) % characterRoster.length; moved = true; } else if (key === 'arrowright') { currentPos = (currentPos + 1) % characterRoster.length; moved = true; } else if (key === 'enter' || key === 'q' || key === 'o') { handleCharSlotClick(currentPos); } if(moved) { charSelectState[cursor] = currentPos; menuMoveSynth.triggerAttackRelease('C4', '8n'); updateCharSelectUI(); } }
function updateMainMenuUI() { document.querySelectorAll('.menu-item').forEach((item, index) => { item.classList.toggle('active', index === activeMenuItem); if (item.dataset.action === 'rounds') item.querySelector('span').textContent = `< ${gameSettings.rounds} >`; if (item.dataset.action === 'time') item.querySelector('span').textContent = `< ${gameSettings.time === 0 ? '∞' : gameSettings.time} >`; }); }
function buildCharGrid() { const grid = document.getElementById('char-grid'); grid.innerHTML = ''; characterRoster.forEach((char, index) => { const slot = document.createElement('div'); slot.className = 'char-slot'; slot.dataset.index = index; if(char.unlocked) { slot.classList.add('unlocked'); slot.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), radial-gradient(circle, ${new THREE.Color(char.color).getStyle()} 0%, #1A202C 150%)`; } else { slot.textContent = '?'; } grid.appendChild(slot); }); }
function updateCharSelectUI() { document.querySelectorAll('.char-slot').forEach(slot => { const index = parseInt(slot.dataset.index); slot.classList.remove('p1-cursor', 'p2-cursor', 'p1-selected', 'p2-selected'); if (p1Char && characterRoster[index] === p1Char) slot.classList.add('p1-selected'); if (p2Char && characterRoster[index] === p2Char) slot.classList.add('p2-selected'); if (charSelectState.p1_cursor === index) slot.classList.add('p1-cursor'); if (charSelectState.turn === 'P2' && charSelectState.p2_cursor === index) slot.classList.add('p2-cursor'); }); const p1CharData = characterRoster[charSelectState.p1_cursor]; document.getElementById('p1-name').textContent = p1CharData.name; document.getElementById('p1-portrait').style.backgroundColor = p1CharData.unlocked ? new THREE.Color(p1CharData.color).getStyle() : '#1A202C'; if (charSelectState.turn === 'P2') { const p2CharData = characterRoster[charSelectState.p2_cursor]; document.getElementById('p2-name').textContent = p2CharData.name; document.getElementById('p2-portrait').style.backgroundColor = p2CharData.unlocked ? new THREE.Color(p2CharData.color).getStyle() : '#1A202C'; } else { document.getElementById('p2-name').textContent = 'Esperando...'; document.getElementById('p2-portrait').style.backgroundColor = '#1A202C'; } }
function setUIVisibility(isVisible) { const visibility = isVisible ? 'visible' : 'hidden'; document.getElementById('ui-container').style.visibility = visibility; document.getElementById('timer-container').style.visibility = visibility; document.getElementById('controls-container').style.display = isVisible ? 'flex' : 'none'; }

// --- Lógica del Juego (StateMachine) ---
function startGame() { initAudio(); setUIVisibility(true); createPlayers(); currentRound = 1; player1Wins = 0; player2Wins = 0; startNewRound(); }
function startNewRound() { 
    setupRoundWinsUI(); 
    const roundDisplay = document.getElementById('round-display'); 
    roundDisplay.textContent = `ROUND ${currentRound}`; 
    roundDisplay.style.display = 'block'; 
    resetPlayersState(); 
    document.getElementById('player1-name-hud').textContent = p1Char.name;
    document.getElementById('player2-name-hud').textContent = p2Char.name;
    gameState = 'ROUND_START'; 
    setTimeout(() => { 
        roundDisplay.style.display = 'none'; 
        startTimer(); 
        gameState = 'FIGHTING'; 
    }, 2000); 
}
function endRound(winner) { gameState = 'ROUND_OVER'; clearInterval(timerInterval); if (winner === player1) player1Wins++; else if (winner === player2) player2Wins++; setupRoundWinsUI(); const roundsToWin = Math.ceil(gameSettings.rounds / 2); if (player1Wins >= roundsToWin || player2Wins >= roundsToWin) { setTimeout(() => endGame(winner), 2000); } else { currentRound++; setTimeout(startNewRound, 3000); } }
function endGame(winner) { gameState = 'GAME_OVER'; setUIVisibility(false); const screen = document.getElementById('game-over-screen'); const winnerName = winner === player1 ? p1Char.name : (winner === player2 ? p2Char.name : null); document.getElementById('game-over-title').textContent = winner ? 'GANADOR' : 'EMPATE'; document.getElementById('winner-text').textContent = winner ? `${winnerName} Gana` : "Empate por Tiempo"; screen.style.display = 'flex'; let countdown = 9; const countdownText = document.getElementById('countdown-text'); countdownText.textContent = `Volviendo al menú en ${countdown}`; const countdownInterval = setInterval(() => { if (gameState !== 'GAME_OVER') { clearInterval(countdownInterval); return; } countdown--; countdownText.textContent = `Volviendo al menú en ${countdown}`; if (countdown <= 0) { clearInterval(countdownInterval); returnToMainMenu(); } }, 1000); }
function returnToMainMenu() { gameState = 'MAIN_MENU'; document.getElementById('game-over-screen').style.display = 'none'; document.getElementById('main-menu').style.display = 'flex'; p1Char = null; p2Char = null; charSelectState = { p1_cursor: 0, p2_cursor: 1, turn: 'P1' }; document.getElementById('char-select-title').textContent = 'Elige a tu Luchador'; }
function startTimer() { if (gameSettings.time === 0) { document.getElementById('timer').innerText = '∞'; return; } timerValue = gameSettings.time; document.getElementById('timer').innerText = timerValue; timerInterval = setInterval(() => { if (gameState !== 'FIGHTING') { clearInterval(timerInterval); return; } timerValue--; document.getElementById('timer').innerText = timerValue; if (timerValue <= 0) { if (player1.userData.health > player2.userData.health) endRound(player1); else if (player2.userData.health > player1.userData.health) endRound(player2); else endRound(null); } }, 1000); }
function resetPlayersState() { [p1Controller, p2Controller].forEach((controller, i) => { if (!controller) return; const p = controller.player; p.position.set(i === 0 ? -5 : 5, p.userData.baseY, 0); p.userData.health = 100; p.userData.power = 0; p.userData.velocity.set(0,0,0); p.userData.isCrouching = false; p.getObjectByName("torso", true).scale.y = 1; controller.reset(); }); updateUI(); }
function setupRoundWinsUI() { const p1WinsUI = document.getElementById('p1-round-wins'); const p2WinsUI = document.getElementById('p2-round-wins'); p1WinsUI.innerHTML = ''; p2WinsUI.innerHTML = ''; const roundsToWin = Math.ceil(gameSettings.rounds / 2); for(let i = 0; i < roundsToWin; i++) { p1WinsUI.innerHTML += `<div class="round-dot ${i < player1Wins ? 'won' : ''}"></div>`; p2WinsUI.innerHTML += `<div class="round-dot ${i < player2Wins ? 'won' : ''}"></div>`; } }

// --- Bucle de Actualización y Lógica de Combate ---
function update(delta) {
    if (gameState !== 'FIGHTING' || !player1 || !player2) return;
    
    updatePlayerOrientation(player1, player2); 
    updatePlayerOrientation(player2, player1);
    
    p1Controller?.update(delta);
    p2Controller?.update(delta);

    updatePlayerState(player1, p1Controller); 
    updatePlayerState(player2, p2Controller); 
    
    updateIdleAnimation(player1); 
    updateIdleAnimation(player2);
    
    checkCollisions(); 
    updateUI();
}

function updatePlayerState(player, controller) {
    const canMove = player.userData.state !== 'ATTACKING' && player.userData.state !== 'DASHING';
    
    if (canMove) {
        if (controller.keys[controller.controls.left]) player.userData.velocity.x = -MOVE_SPEED;
        else if (controller.keys[controller.controls.right]) player.userData.velocity.x = MOVE_SPEED;
        else player.userData.velocity.x = 0;
    } else {
         player.userData.velocity.x *= 0.9;
    }
    
    player.userData.isCrouching = controller.keys[controller.controls.down] && !player.userData.isJumping;
    player.userData.velocity.y += GRAVITY; 
    player.position.add(player.userData.velocity);
    
    if (player.position.y < player.userData.baseY) { 
        player.position.y = player.userData.baseY; 
        player.userData.velocity.y = 0; 
        if (player.userData.isJumping) {
            player.userData.isJumping = false;
            player.userData.state = 'IDLE';
        }
    }
    
    const platformEdge = 14.5; 
    player.position.x = Math.max(-platformEdge, Math.min(platformEdge, player.position.x)); 
    player.position.z = 0;
    
    const torso = player.getObjectByName("torso", true); 
    const targetScale = player.userData.isCrouching && !player.userData.isJumping ? 0.6 : 1.0;
    if(torso) torso.scale.y += (targetScale - torso.scale.y) * 0.2;
}

// --- LÓGICA DE ORIENTACIÓN, ANIMACIÓN Y COLISIONES ---

function updatePlayerOrientation(player, opponent) {
    const targetRotationY = player.position.x > opponent.position.x ? Math.PI : 0;
    player.rotation.y = targetRotationY;
    player.userData.facingDirection = player.position.x > opponent.position.x ? -1 : 1;
}

function updateIdleAnimation(player) {
    if (gameState !== 'FIGHTING' || player.userData.state !== 'IDLE' || player.userData.velocity.x !== 0) return;
    
    const time = clock.getElapsedTime() + player.id * 10;
    const breath = Math.sin(time * 4) * 0.02;
    const dir = player.userData.facingDirection;

    const hips = player.getObjectByName("hips", true);
    const torso = player.getObjectByName("torso", true);
    const leftShoulder = player.getObjectByName("left_shoulder", true);
    const rightShoulder = player.getObjectByName("right_shoulder", true);
    const leftElbow = player.getObjectByName("left_elbow", true);
    const rightElbow = player.getObjectByName("right_elbow", true);
    const leftHip = player.getObjectByName("left_hip", true);
    const rightHip = player.getObjectByName("right_hip", true);
    const leftKnee = player.getObjectByName("left_knee", true);
    const rightKnee = player.getObjectByName("right_knee", true);

    [torso, leftShoulder, rightShoulder, leftElbow, rightElbow, leftHip, rightHip, leftKnee, rightKnee].forEach(part => part?.rotation.set(0,0,0));

    if (player.userData.movesetName === 'Joziel') {
        if (hips) hips.position.y = player.userData.baseY - 0.25 + breath;
        if (torso) torso.rotation.y = (Math.PI / 6) * dir;
        if (leftHip) leftHip.rotation.z = 0.4;
        if (rightHip) rightHip.rotation.z = -0.4;
        if (leftKnee) leftKnee.rotation.x = 0.8;
        if (rightKnee) rightKnee.rotation.x = 0.8;
        if (leftShoulder) leftShoulder.rotation.set(0.2, 0.5 * dir, 1.5);
        if (rightShoulder) rightShoulder.rotation.set(0.2, -0.5 * dir, -1.5);

    } else if (player.userData.movesetName === 'Juanchis') {
        const frontShoulder = dir === 1 ? leftShoulder : rightShoulder;
        const backShoulder = dir === 1 ? rightShoulder : leftShoulder;
        const frontElbow = dir === 1 ? leftElbow : rightElbow;
        const backElbow = dir === 1 ? rightElbow : leftElbow;
        const frontHip = dir === 1 ? leftHip : rightHip;
        const backHip = dir === 1 ? rightHip : leftHip;
        const frontKnee = dir === 1 ? leftKnee : rightKnee;
        const backKnee = dir === 1 ? rightKnee : leftKnee;

        if (hips) hips.position.y = player.userData.baseY - 0.15 + breath;
        if (torso) torso.rotation.y = (Math.PI / 2.5) * dir;
        
        if (frontHip) frontHip.rotation.x = -0.3;
        if (backHip) backHip.rotation.x = 0.3;
        if (frontKnee) frontKnee.rotation.x = 0.6;
        if (backKnee) backKnee.rotation.x = 0.6;

        if (frontShoulder) frontShoulder.rotation.set(0, 0, 0.9 * dir);
        if (frontElbow) frontElbow.rotation.set(1.8, 0.5 * dir, 0);
        if (backShoulder) backShoulder.rotation.set(0, 0, -0.7 * dir);
        if (backElbow) backElbow.rotation.set(1.2, -0.3 * dir, 0);
    }
}

function checkCollisions() { if (!player1 || !player2) return; const distance = player1.position.distanceTo(player2.position); if (distance < 1.2) { const overlap = 1.2 - distance; const direction = new THREE.Vector3().subVectors(player1.position, player2.position).normalize(); player1.position.add(direction.clone().multiplyScalar(overlap / 2)); player2.position.add(direction.clone().multiplyScalar(-overlap / 2)); } handleHitDetection(p1Controller, p2Controller); handleHitDetection(p2Controller, p1Controller); }

function handleHitDetection(attackerController, defenderController) {
    const attacker = attackerController.player;
    const defender = defenderController.player;
    if (attacker.userData.state !== 'ATTACKING' || !attacker.userData.currentAttack) return;
    
    const attackRange = attacker.userData.currentAttack.range || 1.8;
    const distance = attacker.position.distanceTo(defender.position);

    if (distance < attackRange) {
        if(audioInitialized) hitSynth.triggerAttackRelease('A2', '8n');
        let currentDamage = attacker.userData.currentAttack.damage * (defender.userData.isBlocking ? 0.2 : 1);
        defender.userData.health = Math.max(0, defender.userData.health - currentDamage);
        attacker.userData.power = Math.min(100, attacker.userData.power + (defender.userData.isBlocking ? 2 : 10));
        defender.userData.power = Math.min(100, defender.userData.power + 5);
        if (!defender.userData.isBlocking) { defender.userData.velocity.x = Math.sign(defender.position.x - attacker.position.x) * 0.2; defender.userData.velocity.y = 0.1; }
        
        attacker.userData.currentAttack = null; 
        
        if (defender.userData.health <= 0) endRound(attacker);
    }
}

function updateCamera(delta) { if (!player1 || !player2) { camera.position.set(0, 5, 20); camera.lookAt(0, 2, 0); return; }; const midpoint = new THREE.Vector3().addVectors(player1.position, player2.position).multiplyScalar(0.5); const distance = Math.max(player1.position.distanceTo(player2.position), 8); const targetZ = 8 + (distance * 1.5); const targetY = 4 + (distance * 0.2); const targetX = midpoint.x * 0.7; const targetPosition = new THREE.Vector3(targetX, Math.min(targetY, 10), Math.min(targetZ, 30)); const lookAtPosition = new THREE.Vector3(midpoint.x, 2, 0); camera.position.lerp(targetPosition, delta * 2.5); camera.lookAt(lookAtPosition); }
function updateUI() { if(!player1 || !player2 || (gameState !== 'FIGHTING' && gameState !== 'ROUND_OVER')) return; document.getElementById('player1-health').style.width = player1.userData.health + '%'; document.getElementById('player1-power').style.width = player1.userData.power + '%'; document.getElementById('player2-health').style.width = player2.userData.health + '%'; document.getElementById('player2-power').style.width = player2.userData.power + '%'; }
function animate() { requestAnimationFrame(animate); const delta = clock.getDelta(); if (gameState.includes('FIGHT') || gameState.includes('ROUND')) { update(delta); } updateCamera(delta); renderer.render(scene, camera); }
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// ==================================================================
// --- SISTEMA DE CONTROL AVANZADO Y MOVIMIENTOS (MOVESETS) ---
// ==================================================================

function animatePart(part, targetRotation, duration, onComplete = () => {}) {
    if (!part) return;
    const initialRotation = part.rotation.clone();
    part.rotation.set(targetRotation.x, targetRotation.y, targetRotation.z);
    setTimeout(() => {
        part.rotation.copy(initialRotation);
        onComplete();
    }, duration);
}

const juanchisMoveset = {
    name: 'Juanchis',
    punch: (p) => {
        if(audioInitialized) punchSynth.triggerAttackRelease('D4', '8n');
        p.userData.currentAttack = { damage: 9, range: 2.0 };
        const dir = p.userData.facingDirection;
        const frontShoulder = p.getObjectByName(dir === 1 ? 'left_shoulder' : 'right_shoulder');
        animatePart(frontShoulder, new THREE.Euler(0, 0, 1.5 * dir), 200);
    },
    kick: (p) => {
        if(audioInitialized) kickSynth.triggerAttackRelease('F3', '8n');
        p.userData.currentAttack = { damage: 14, range: 2.4 };
        const dir = p.userData.facingDirection;
        const backHip = p.getObjectByName(dir === 1 ? 'right_hip' : 'left_hip');
        animatePart(backHip, new THREE.Euler(-Math.PI / 2, 0, 0), 350);
    },
    combo: (p) => {
        if(audioInitialized) kickSynth.triggerAttackRelease('B4', '8n');
        p.userData.currentAttack = { damage: 22, range: 2.7 };
        animatePart(p.getObjectByName('torso'), new THREE.Euler(Math.PI / 8, 0, 0), 500);
        animatePart(p.getObjectByName('left_hip'), new THREE.Euler(-Math.PI, 0, -Math.PI / 3), 500);
        animatePart(p.getObjectByName('left_knee'), new THREE.Euler(Math.PI / 1.5, 0, 0), 500);
    },
    dashForward: (p) => { p.userData.velocity.x += MOVE_SPEED * 2.5 * p.userData.facingDirection; },
    dashBackward: (p) => { p.userData.velocity.x -= MOVE_SPEED * 4 * p.userData.facingDirection; },
};

const jozielMoveset = {
    name: 'Joziel',
    punch: (p) => {
        if(audioInitialized) punchSynth.triggerAttackRelease('C4', '8n');
        p.userData.currentAttack = { damage: 8, range: 1.9 };
        const shoulder = p.getObjectByName('right_shoulder');
        animatePart(shoulder, new THREE.Euler(0, 0, -1.8), 200);
    },
    kick: (p) => {
        if(audioInitialized) kickSynth.triggerAttackRelease('G3', '8n');
        p.userData.currentAttack = { damage: 12, range: 2.3 };
        const hip = p.getObjectByName('right_hip');
        animatePart(hip, new THREE.Euler(-Math.PI / 2, 0, 0), 400);
    },
    combo: (p) => {
        if(audioInitialized) kickSynth.triggerAttackRelease('A4', '8n');
        p.userData.currentAttack = { damage: 25, range: 2.6 };
        const torso = p.getObjectByName('torso');
        const hip = p.getObjectByName('left_hip');
        animatePart(torso, new THREE.Euler(0, Math.PI * 2 * p.userData.facingDirection, 0), 500);
        animatePart(hip, new THREE.Euler(-Math.PI / 2, 0, Math.PI / 4), 500);
    },
    dashForward: (p) => { p.userData.velocity.x += MOVE_SPEED * 3 * p.userData.facingDirection; },
    dashBackward: (p) => { p.userData.velocity.x -= MOVE_SPEED * 2 * p.userData.facingDirection; },
};

const movesets = {
    'Juanchis': juanchisMoveset,
    'Joziel': jozielMoveset,
    'Cotti': juanchisMoveset,
    'Aria': jozielMoveset,   
};

class CharacterController {
    constructor(player, moveset, controls) {
        this.player = player;
        this.moveset = moveset;
        this.controls = controls;
        this.keys = {};
        this.inputBuffer = [];
        this.comboTimeout = null;
        this.lastMoveKey = null;
        this.dashTimeout = null;
        this.controlKeys = Object.values(controls);
    }

    reset() {
        this.clearInputBuffer();
        this.player.userData.state = 'IDLE';
        this.player.userData.isBlocking = false;
    }

    handleKeyDown(key) {
        if (!this.controlKeys.includes(key)) return;

        if (this.keys[key]) return;
        this.keys[key] = true;
        
        const pData = this.player.userData;
        if (pData.state === 'ATTACKING' || pData.state === 'DASHING' || pData.isJumping) return;
        
        if (key === this.controls.left || key === this.controls.right) this.handleDash(key);
        
        if (key === this.controls.up && !pData.isJumping) {
            pData.velocity.y = JUMP_FORCE;
            pData.isJumping = true;
            pData.state = 'JUMPING';
            this.clearInputBuffer();
        }

        if (key === this.controls.punch || key === this.controls.kick) {
            pData.state = 'ATTACKING';
            this.addToBuffer(key);
            this.checkCombosAndAttacks();
            setTimeout(() => {
                if (pData.state === 'ATTACKING') {
                    pData.state = 'IDLE';
                    if(!pData.currentAttack) pData.currentAttack = null;
                }
            }, 500);
        }
    }

    handleKeyUp(key) { 
        if (!this.controlKeys.includes(key)) return;
        this.keys[key] = false; 
    }
    
    update(delta) {
        const pData = this.player.userData;
        const isFacingRight = pData.facingDirection === 1;
        const isWalkingBackwards = (isFacingRight && this.keys[this.controls.left]) || (!isFacingRight && this.keys[this.controls.right]);
        pData.isBlocking = isWalkingBackwards && !pData.isJumping;
    }

    handleDash(key) {
        const isForwardDash = (this.player.userData.facingDirection === 1 && key === this.controls.right) || (this.player.userData.facingDirection === -1 && key === this.controls.left);
        if (this.lastMoveKey === key && this.dashTimeout) {
            clearTimeout(this.dashTimeout);
            this.dashTimeout = null;
            this.lastMoveKey = null;
            this.player.userData.state = 'DASHING';
            if (isForwardDash) this.moveset.dashForward(this.player);
            else this.moveset.dashBackward(this.player);
            setTimeout(() => { this.player.userData.state = 'IDLE'; }, 250);
        } else {
            this.lastMoveKey = key;
            clearTimeout(this.dashTimeout);
            this.dashTimeout = setTimeout(() => {
                this.lastMoveKey = null;
                this.dashTimeout = null;
            }, DASH_WINDOW);
        }
    }

    addToBuffer(key) {
        this.inputBuffer.push(this.controls.punch === key ? 'G' : 'P');
        clearTimeout(this.comboTimeout);
        this.comboTimeout = setTimeout(() => this.clearInputBuffer(), COMBO_WINDOW);
    }
    
    clearInputBuffer() {
        this.inputBuffer = [];
        clearTimeout(this.comboTimeout);
    }

    checkCombosAndAttacks() {
        const bufferString = this.inputBuffer.join('');
        
        if (bufferString.endsWith('GGP')) {
            this.moveset.combo(this.player);
            this.clearInputBuffer();
            return;
        }

        const lastKey = this.inputBuffer[this.inputBuffer.length - 1];

        if (lastKey === 'P') {
            this.moveset.kick(this.player);
            return;
        }

        if (lastKey === 'G') {
            this.moveset.punch(this.player);
        }
    }
}

init();
