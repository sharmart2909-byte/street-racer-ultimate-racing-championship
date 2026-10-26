import { Game } from './game/Game.js';

/**
 * main.js
 * Application entry point for Street Racer: Ultimate Racing Championship.
 */

window.addEventListener('DOMContentLoaded', () => {
  console.log('🏎️ Initializing Street Racer: Ultimate Racing Championship 3D Engine...');
  const game = new Game();
  window.__STREET_RACER_GAME__ = game; // Exposed for debugging / inspection
});
