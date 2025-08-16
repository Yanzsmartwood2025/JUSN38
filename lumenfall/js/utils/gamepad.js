export function vibrateGamepad(isVibrationEnabled, duration = 50, strong = 0.8, weak = 0.8) {
    if (!isVibrationEnabled) return;
    const gp = navigator.getGamepads()[0];
    if (gp && gp.vibrationActuator) {
        gp.vibrationActuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: duration,
            weakMagnitude: weak,
            strongMagnitude: strong,
        });
    }
}
