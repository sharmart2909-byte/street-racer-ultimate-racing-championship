/**
 * InputManager.js
 * Captures keyboard and mobile multi-touch pointer inputs and translates them
 * into normalized vehicle control values.
 */

export class InputManager {
  constructor() {
    this.keys = {};

    // Touch control state
    this.touchState = {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false,
      nitro: false,
    };

    // Action triggers (single press events)
    this.onPauseToggle = null;
    this.onResetCar = null;
    this.onCameraToggle = null;

    // Track active pointers to prevent stuck controls
    this.activePointers = new Map();

    this.setupListeners();
    this.setupTouchListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scrolling from gameplay keys (Arrow keys, Spacebar)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      this.keys[e.code] = true;

      if (e.code === 'Escape') {
        if (this.onPauseToggle) this.onPauseToggle();
      }

      if (e.code === 'KeyR') {
        if (this.onResetCar) this.onResetCar();
      }

      if (e.code === 'KeyC') {
        if (this.onCameraToggle) this.onCameraToggle();
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Reset keys on window blur or visibility loss
    window.addEventListener('blur', () => {
      this.resetAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.resetAll();
      }
    });
  }

  /**
   * Sets up multi-touch Pointer Events for mobile buttons
   */
  setupTouchListeners() {
    // Helper to bind a continuous hold touch button
    const bindHoldButton = (elementId, onPress, onRelease) => {
      const el = document.getElementById(elementId);
      if (!el) return;

      const handlePress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('touch-pressed');
        try {
          el.setPointerCapture(e.pointerId);
        } catch (_) {}
        this.activePointers.set(e.pointerId, () => {
          el.classList.remove('touch-pressed');
          onRelease();
        });
        onPress();
      };

      const handleRelease = (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('touch-pressed');
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (_) {}
        this.activePointers.delete(e.pointerId);
        onRelease();
      };

      el.addEventListener('pointerdown', handlePress, { passive: false });
      el.addEventListener('pointerup', handleRelease, { passive: false });
      el.addEventListener('pointercancel', handleRelease, { passive: false });
      el.addEventListener('pointerleave', (e) => {
        // If pointer is captured, leave doesn't mean release, but if not captured release cleanly
        if (!el.hasPointerCapture || !el.hasPointerCapture(e.pointerId)) {
          handleRelease(e);
        }
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    // Helper to bind a single-tap action button (Pause, Cam, Reset)
    const bindTapButton = (elementId, callback) => {
      const el = document.getElementById(elementId);
      if (!el) return;

      const handleTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('touch-pressed');
        setTimeout(() => el.classList.remove('touch-pressed'), 150);
        if (callback) callback();
      };

      el.addEventListener('pointerdown', handleTap, { passive: false });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    // Bind continuous drive/steer controls
    // Steer Left: steer = +1.0 (turns car to the LEFT on screen)
    bindHoldButton('touch-btn-left', () => { this.touchState.steer = 1.0; }, () => {
      if (this.touchState.steer > 0) this.touchState.steer = 0;
    });

    // Steer Right: steer = -1.0 (turns car to the RIGHT on screen)
    bindHoldButton('touch-btn-right', () => { this.touchState.steer = -1.0; }, () => {
      if (this.touchState.steer < 0) this.touchState.steer = 0;
    });

    // Accelerate / Gas
    bindHoldButton('touch-btn-gas', () => { this.touchState.throttle = 1.0; }, () => {
      this.touchState.throttle = 0;
    });

    // Brake / Reverse
    bindHoldButton('touch-btn-brake', () => { this.touchState.brake = 1.0; }, () => {
      this.touchState.brake = 0;
    });

    // Nitro Boost
    bindHoldButton('touch-btn-nitro', () => { this.touchState.nitro = true; }, () => {
      this.touchState.nitro = false;
    });

    // Handbrake / Drift
    bindHoldButton('touch-btn-drift', () => { this.touchState.handbrake = true; }, () => {
      this.touchState.handbrake = false;
    });

    // Tap buttons
    bindTapButton('touch-btn-camera', () => {
      if (this.onCameraToggle) this.onCameraToggle();
    });

    bindTapButton('touch-btn-reset', () => {
      if (this.onResetCar) this.onResetCar();
    });

    bindTapButton('touch-btn-pause', () => {
      if (this.onPauseToggle) this.onPauseToggle();
    });

    // Global pointer cancel safety
    window.addEventListener('pointercancel', () => this.resetTouch());
  }

  resetTouch() {
    this.activePointers.forEach((cleanFn) => {
      try { cleanFn(); } catch (_) {}
    });
    this.activePointers.clear();
    this.touchState.throttle = 0;
    this.touchState.brake = 0;
    this.touchState.steer = 0;
    this.touchState.handbrake = false;
    this.touchState.nitro = false;
    document.querySelectorAll('.touch-pressed').forEach((el) => el.classList.remove('touch-pressed'));
  }

  resetAll() {
    this.keys = {};
    this.resetTouch();
  }

  /**
   * Returns current continuous control state combining keyboard & touch inputs.
   * Standard convention:
   * - Steer: -1.0 is LEFT, +1.0 is RIGHT
   * - Throttle: 0.0 to 1.0
   * - Brake: 0.0 to 1.0
   * @returns {Object} { throttle, brake, steer, handbrake, nitro }
   */
  getState() {
    let throttle = this.touchState.throttle;
    let brake = this.touchState.brake;
    let steer = this.touchState.steer;

    // Keyboard Throttle (W or Up Arrow)
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      throttle = 1.0;
    }

    // Keyboard Brake / Reverse (S or Down Arrow)
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      brake = 1.0;
    }

    // Keyboard Steering (A / Left Arrow is LEFT: +1.0; D / Right Arrow is RIGHT: -1.0)
    let keySteer = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      keySteer += 1.0;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      keySteer -= 1.0;
    }

    if (keySteer !== 0) {
      steer = keySteer;
    }

    // Handbrake / Drift (Spacebar or Touch button)
    const handbrake = !!this.keys['Space'] || this.touchState.handbrake;

    // Nitro Boost (Shift key or Touch button)
    const nitro = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) || this.touchState.nitro;

    return {
      throttle,
      brake,
      steer,
      handbrake,
      nitro,
    };
  }

  reset() {
    this.resetAll();
  }
}

