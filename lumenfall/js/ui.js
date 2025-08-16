import { setAudioVolume, audioSources, playAudio, stopAudio, audioContext } from './utils/audio.js';
import { translations } from './utils/constants.js';

export class UI {
    constructor(game) {
        this.game = game;
        this.currentLanguage = 'es';
        this.joystickTouchId = null;

        this.dom = {
            startButtonContainer: document.getElementById('start-button-container'),
            startButton: document.getElementById('start-button'),
            introScreen: document.getElementById('intro-screen'),
            introImage: document.getElementById('intro-image'),
            menuScreen: document.getElementById('menu-screen'),
            playButton: document.getElementById('play-button'),
            languageSelect: document.getElementById('language-select'),
            pauseLanguageSelect: document.getElementById('pause-language-select'),
            btnAttack: document.getElementById('btn-attack'),
            btnShoot: document.getElementById('btn-shoot'),
            doorPromptFlame: document.getElementById('door-prompt-flame'),
            jozielHalo: document.getElementById('joziel-halo'),
            pauseMenu: document.getElementById('pause-menu'),
            resumeButton: document.getElementById('resume-button'),
            musicVolumeSlider: document.getElementById('music-volume'),
            sfxVolumeSlider: document.getElementById('sfx-volume'),
            musicToggleButton: document.getElementById('music-toggle'),
            sfxToggleButton: document.getElementById('sfx-toggle'),
            transitionOverlay: document.getElementById('transition-overlay'),
            loadingText: document.getElementById('loading-text'),
            numeralsContainer: document.getElementById('numerals-container'),
            dialogueBox: document.getElementById('dialogue-box'),
            gamepadStatus: document.getElementById('gamepad-status'),
            gamepadToggleButton: document.getElementById('gamepad-toggle'),
            vibrationToggleButton: document.getElementById('vibration-toggle'),
            controlsContainer: document.getElementById('controls'),
            joystickContainer: document.getElementById('joystick-container'),
            joystickKnob: document.getElementById('joystick-knob')
        };

        this.initListeners();
        this.updateUIText();
        this.handleResize();
    }

    initListeners() {
        this.dom.startButton.addEventListener('click', () => this.showIntro());
        this.dom.playButton.addEventListener('click', () => this.startGame());

        this.dom.jozielHalo.addEventListener('click', () => {
            this.game.pause();
            this.dom.pauseMenu.classList.add('active');
        });

        this.dom.resumeButton.addEventListener('click', () => {
            this.game.resume();
            this.dom.pauseMenu.classList.remove('active');
        });

        this.dom.languageSelect.addEventListener('change', (e) => this.handleLanguageChange(e));
        this.dom.pauseLanguageSelect.addEventListener('change', (e) => this.handleLanguageChange(e));

        this.dom.gamepadToggleButton.addEventListener('click', () => this.toggleGamepadMode());
        this.dom.vibrationToggleButton.addEventListener('click', () => this.toggleVibration());

        this.dom.musicVolumeSlider.addEventListener('input', (e) => setAudioVolume('ambiente', e.target.value));
        this.dom.sfxVolumeSlider.addEventListener('input', (e) => setAudioVolume('pasos', e.target.value));
        this.dom.musicToggleButton.addEventListener('click', () => this.toggleMusic());
        this.dom.sfxToggleButton.addEventListener('click', () => this.toggleSfx());

        this.initJoystickListeners();
        this.initButtonListeners();

        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener("gamepadconnected", () => this.dom.gamepadStatus.style.display = 'block');
        window.addEventListener("gamepaddisconnected", () => this.dom.gamepadStatus.style.display = 'none');
    }

    initJoystickListeners() {
        const { joystickContainer } = this.dom;
        joystickContainer.addEventListener('mousedown', (e) => this.handleJoystickStart(e.clientX, e.clientY));
        document.addEventListener('mousemove', (e) => this.handleJoystickMove(e.clientX, e.clientY, e));
        document.addEventListener('mouseup', (e) => this.handleJoystickEnd(e));

        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            this.handleJoystickStart(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleJoystickMove(0, 0, e);
        }, { passive: false });

        document.addEventListener('touchend', (e) => this.handleJoystickEnd(e));
        document.addEventListener('touchcancel', (e) => this.handleJoystickEnd(e));
    }

    handleJoystickStart(clientX, clientY) {
        if (this.game.isPaused || this.game.isGamepadModeActive) return;
        this.game.isDraggingJoystick = true;
        this.dom.joystickKnob.style.transition = 'none';
        this.updateJoystickDimensions();
        this.moveJoystick(clientX, clientY);
    }

    handleJoystickMove(clientX, clientY, event) {
        if (!this.game.isDraggingJoystick || this.game.isGamepadModeActive) return;

        if (this.joystickTouchId !== null && event.changedTouches) {
            for (let i = 0; i < event.changedTouches.length; i++) {
                const touch = event.changedTouches[i];
                if (touch.identifier === this.joystickTouchId) {
                    this.moveJoystick(touch.clientX, touch.clientY);
                    break;
                }
            }
        } else if (this.joystickTouchId === null) {
            this.moveJoystick(clientX, clientY);
        }
    }

    handleJoystickEnd(event) {
        if (!this.game.isDraggingJoystick) return;

        if (this.joystickTouchId !== null && event.changedTouches) {
             for (let i = 0; i < event.changedTouches.length; i++) {
                if (event.changedTouches[i].identifier === this.joystickTouchId) {
                    this.game.isDraggingJoystick = false;
                    this.joystickTouchId = null;
                    this.resetJoystick();
                    break;
                }
            }
        } else if (this.joystickTouchId === null) {
            this.game.isDraggingJoystick = false;
            this.resetJoystick();
        }
    }

    updateJoystickDimensions() {
        this.joystickRect = this.dom.joystickContainer.getBoundingClientRect();
        this.joystickRadius = this.dom.joystickContainer.clientWidth / 2 - this.dom.joystickKnob.clientWidth / 2;
    }

    moveJoystick(clientX, clientY) {
        let deltaX = clientX - (this.joystickRect.left + this.joystickRect.width / 2);
        let deltaY = clientY - (this.joystickRect.top + this.joystickRect.height / 2);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > this.joystickRadius) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = this.joystickRadius * Math.cos(angle);
            deltaY = this.joystickRadius * Math.sin(angle);
        }
        this.dom.joystickKnob.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;
        const deadZone = 10;
        this.game.joyVector.x = Math.abs(deltaX) > deadZone ? deltaX / this.joystickRadius : 0;
        this.game.joyVector.y = Math.abs(deltaY) > deadZone ? -deltaY / this.joystickRadius : 0;
    }

    resetJoystick() {
        this.dom.joystickKnob.style.transition = 'transform 0.1s ease-out';
        this.dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
        this.game.joyVector.set(0, 0);
    }

    initButtonListeners() {
        const { btnAttack, btnShoot, doorPromptFlame } = this.dom;

        btnAttack.addEventListener('mousedown', () => this.handleAttackPressStart());
        btnAttack.addEventListener('mouseup', () => this.handleAttackPressEnd());
        btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleAttackPressStart(); }, { passive: false });
        btnAttack.addEventListener('touchend', () => this.handleAttackPressEnd());

        btnShoot.addEventListener('mousedown', () => this.handleShoot());
        btnShoot.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleShoot(); }, { passive: false });

        doorPromptFlame.addEventListener('mousedown', (e) => { e.preventDefault(); this.game.interactPressed = true; });
        doorPromptFlame.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.interactPressed = true; }, { passive: false });
    }

    handleAttackPressStart() {
        if (this.game.isPaused || this.game.isGamepadModeActive) return;
        this.game.isAttackButtonPressed = true;
        this.game.attackPressStartTime = Date.now();
    }

    handleAttackPressEnd() {
        if (this.game.isPaused || this.game.isGamepadModeActive) return;
        this.game.isAttackButtonPressed = false;
    }

    handleShoot() {
        if (this.game.isPaused || this.game.isGamepadModeActive || !this.game.player) return;
        this.game.player.shoot(this.game.joyVector, this.game.allProjectiles, this.game.isVibrationEnabled);
    }

    showIntro() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        this.dom.startButtonContainer.style.display = 'none';
        this.dom.introImage.src = assetUrls.introImage;
        this.dom.introScreen.style.opacity = 0;
        this.dom.introScreen.addEventListener('transitionend', () => {
            this.dom.introScreen.style.display = 'none';
            this.dom.menuScreen.style.backgroundImage = `url('${assetUrls.menuBackgroundImage}')`;
            this.dom.menuScreen.style.display = 'flex';
            setTimeout(() => this.dom.menuScreen.style.opacity = 1, 10);
        }, { once: true });
    }

    startGame() {
        this.dom.menuScreen.style.opacity = 0;
        this.dom.menuScreen.addEventListener('transitionend', () => {
            this.dom.menuScreen.style.display = 'none';
            document.getElementById('bg-canvas').style.display = 'block';
            document.getElementById('ui-container').style.display = 'flex';
            this.game.start();
        }, { once: true });
    }

    setInitialAudioVolume() {
        setAudioVolume('ambiente', this.dom.musicVolumeSlider.value);
        setAudioVolume('pasos', this.dom.sfxVolumeSlider.value);
    }

    toggleMusic() {
        if (audioSources['ambiente']) {
            stopAudio('ambiente');
            this.dom.musicToggleButton.textContent = '▶';
        } else {
            playAudio('ambiente', true);
            this.dom.musicToggleButton.textContent = '❚❚';
        }
    }

    toggleSfx() {
        if (audioSources['pasos']) {
            stopAudio('pasos');
            this.dom.sfxToggleButton.textContent = '▶';
        } else {
            playAudio('pasos', true);
            this.dom.sfxToggleButton.textContent = '❚❚';
        }
    }

    handleLanguageChange(e) {
        this.currentLanguage = e.target.value;
        this.dom.languageSelect.value = this.currentLanguage;
        this.dom.pauseLanguageSelect.value = this.currentLanguage;
        this.updateUIText();
    }

    toggleGamepadMode() {
        this.game.isGamepadModeActive = !this.game.isGamepadModeActive;
        this.dom.controlsContainer.style.opacity = this.game.isGamepadModeActive ? '0' : '1';
        this.dom.controlsContainer.style.pointerEvents = this.game.isGamepadModeActive ? 'none' : 'auto';
        this.updateUIText();
    }

    toggleVibration() {
        this.game.isVibrationEnabled = !this.game.isVibrationEnabled;
        this.updateUIText();
    }

    updateUIText() {
        const lang = translations[this.currentLanguage];
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.dataset.translateKey;
            if (lang[key]) {
                el.textContent = lang[key];
            }
        });
        this.dom.gamepadToggleButton.textContent = this.game.isGamepadModeActive ? lang.deactivateGamepad : lang.activateGamepad;
        this.dom.vibrationToggleButton.textContent = this.game.isVibrationEnabled ? lang.toggleVibrationOn : lang.toggleVibrationOff;
        if (this.dom.transitionOverlay.classList.contains('visible')) {
            this.dom.loadingText.textContent = lang.loading;
        }
    }

    showDialogue(dialogueKey, duration) {
        if (this.dom.dialogueBox.classList.contains('visible')) return;
        const message = translations[this.currentLanguage][dialogueKey] || "Dialogue not found.";
        this.dom.dialogueBox.textContent = message;
        this.dom.dialogueBox.classList.add('visible');
        setTimeout(() => {
            this.dom.dialogueBox.classList.remove('visible');
        }, duration);
    }

    triggerTransition(destinationId, spawnX = null) {
        if (this.game.isTransitioning) return;
        this.game.isTransitioning = true;
        this.dom.loadingText.textContent = translations[this.currentLanguage].loading;
        this.dom.transitionOverlay.classList.add('visible');
        setTimeout(() => {
            this.game.loadLevelById(destinationId, spawnX);
            setTimeout(() => {
                this.dom.transitionOverlay.classList.remove('visible');
                this.game.isTransitioning = false;
            }, 1000);
        }, 400);
    }

    checkInteractions() {
        let isNearInteractable = false;
        let interactableObject = null;

        this.game.allGates.forEach(gate => {
            const distanceX = Math.abs(this.game.player.mesh.position.x - gate.mesh.position.x);
            if (distanceX < 4) {
                isNearInteractable = true;
                interactableObject = {type: 'gate', object: gate};
            }
            const screenPosition = gate.mesh.position.clone();
            screenPosition.y += 6.8;
            const vector = screenPosition.project(this.game.camera);
            const x = (vector.x * 0.5 + 0.5) * this.game.renderer.domElement.clientWidth;
            const y = (-vector.y * 0.5 + 0.5) * this.game.renderer.domElement.clientHeight;
            gate.numeralElement.style.left = `${x}px`;
            gate.numeralElement.style.top = `${y}px`;
        });

        this.game.allPuzzles.forEach(puzzle => {
            if (!puzzle.isSolved) {
                const distanceX = Math.abs(this.game.player.mesh.position.x - puzzle.mesh.position.x);
                if (distanceX < 5) {
                    isNearInteractable = true;
                    interactableObject = {type: 'puzzle', object: puzzle};
                }
            }
        });

        this.game.allStatues.forEach(statue => {
            const distanceX = Math.abs(this.game.player.mesh.position.x - statue.mesh.position.x);
            if (distanceX < 5) {
                isNearInteractable = true;
                interactableObject = {type: 'statue', object: statue};
            }
        });

        if (isNearInteractable) {
            this.updatePromptFlame(interactableObject);
            if (this.game.interactPressed) {
                this.handleInteraction(interactableObject);
            }
        } else {
            this.dom.doorPromptFlame.style.display = 'none';
        }
    }

    updatePromptFlame(interactableObject) {
        const screenPosition = interactableObject.object.mesh.position.clone();
        screenPosition.y += (interactableObject.type === 'gate' ? 5 : 4);
        const vector = screenPosition.project(this.game.camera);
        const x = (vector.x * 0.5 + 0.5) * this.game.renderer.domElement.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * this.game.renderer.domElement.clientHeight;
        this.dom.doorPromptFlame.style.left = `${x}px`;
        this.dom.doorPromptFlame.style.top = `${y}px`;
        this.dom.doorPromptFlame.style.display = 'block';
    }

    handleInteraction(interactableObject) {
        if (interactableObject.type === 'gate') {
            const gate = interactableObject.object;
            const destinationId = gate.destination;
            let spawnX = null;
            if (destinationId === 'dungeon_1') {
                const roomNumber = gate.id.split('_')[1];
                const targetGateId = `gate_${roomNumber}`;
                const targetGate = MAPS.dungeon_1.gates.find(g => g.id === targetGateId);
                if (targetGate) {
                    spawnX = targetGate.x;
                }
            }
            this.triggerTransition(destinationId, spawnX);
        } else if (interactableObject.type === 'puzzle') {
            interactableObject.object.solve();
        } else if (interactableObject.type === 'statue') {
            interactableObject.object.interact();
        }
    }

    handleFootsteps(isGrounded, joyVector) {
        const isMoving = Math.abs(joyVector.x) > 0.1;
        if (isMoving && isGrounded) {
            if (!audioSources['pasos']) playAudio('pasos', true);
        } else {
            if (audioSources['pasos']) stopAudio('pasos');
        }
    }

    createNumeral(text, isLit, isRoom) {
        const numeralElement = document.createElement('div');
        numeralElement.className = 'door-numeral';
        numeralElement.textContent = text;
        if (!isLit && !isRoom) {
            numeralElement.classList.add('off');
        }
        this.dom.numeralsContainer.appendChild(numeralElement);
        return numeralElement;
    }

    handleResize() {
        this.updateJoystickDimensions();
        this.game.renderer.setSize(window.innerWidth, window.innerHeight);
        this.game.camera.aspect = window.innerWidth / window.innerHeight;

        if (this.game.camera.aspect < 1) {
            this.game.camera.zoom = 1.2;
        } else {
            this.game.camera.zoom = 1.0;
        }

        this.game.camera.updateProjectionMatrix();
    }
}
