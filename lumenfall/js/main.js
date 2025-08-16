import { Game } from './core/game.js';
import { UI } from './ui.js';

window.addEventListener('load', () => {
    const game = new Game();
    const ui = new UI(game);
    game.setUI(ui);
});
