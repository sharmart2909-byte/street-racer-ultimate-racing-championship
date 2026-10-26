import * as THREE from 'three';
import { CAR_CATALOG, PAINT_COLORS } from '../game/ProgressManager.js';
import { LEVEL_DATA } from '../tracks/TrackData.js';
import { CarBuilder } from '../car/CarBuilder.js';

/**
 * MenuManager.js
 * Controls all UI states, modal navigation, interactive 3D garage preview,
 * track selection, results display, and settings.
 */

export class MenuManager {
  constructor(game, progressManager, audioManager) {
    this.game = game;
    this.progress = progressManager;
    this.audio = audioManager;

    // Screens & Modals
    this.mainMenuEl = document.getElementById('main-menu');
    this.levelSelectModal = document.getElementById('level-select-modal');
    this.garageModal = document.getElementById('garage-modal');
    this.controlsModal = document.getElementById('controls-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.resultsModal = document.getElementById('results-modal');

    // Garage 3D Turntable components
    this.garageScene = null;
    this.garageCamera = null;
    this.garageRenderer = null;
    this.garageCarData = null;
    this.garageCarGroup = null;
    this.garageSelectedCarId = this.progress.getSelectedCar().id;
    this.garageSelectedColor = this.progress.getSelectedCar().currentColorKey;
    this.isGarageOpen = false;

    this.bindEvents();
    this.updateMenuStats();
    this.initGarage3D();
  }

  bindEvents() {
    // Main Menu Buttons
    document.getElementById('btn-quick-play').addEventListener('click', () => {
      this.audio.init();
      const lastUnlocked = Math.max(...this.progress.data.unlockedLevels);
      this.game.startLevel(lastUnlocked);
    });

    document.getElementById('btn-open-levels').addEventListener('click', () => {
      this.audio.init();
      this.openLevelSelect();
    });

    document.getElementById('btn-open-garage').addEventListener('click', () => {
      this.audio.init();
      this.openGarage();
    });

    document.getElementById('btn-open-controls').addEventListener('click', () => {
      this.audio.init();
      this.openModal(this.controlsModal);
    });

    document.getElementById('btn-open-settings').addEventListener('click', () => {
      this.audio.init();
      this.openModal(this.settingsModal);
    });

    // Sound toggle
    const audioBtn = document.getElementById('btn-menu-audio-toggle');
    audioBtn.addEventListener('click', () => {
      this.audio.init();
      const enabled = this.audio.toggleMute();
      audioBtn.textContent = enabled ? 'ENABLED' : 'MUTED';
      audioBtn.classList.toggle('muted', !enabled);
      const settingInput = document.getElementById('setting-sound');
      if (settingInput) settingInput.checked = enabled;
      this.progress.updateSettings({ sound: enabled });
    });

    // Modal Close Buttons
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        const modal = document.getElementById(modalId);
        if (modal) this.closeModal(modal);
      });
    });

    // Pause Modal Buttons
    document.getElementById('btn-resume-race').addEventListener('click', () => {
      this.game.resumeGame();
    });
    document.getElementById('btn-hud-pause').addEventListener('click', () => {
      this.game.togglePause();
    });
    document.getElementById('btn-restart-race').addEventListener('click', () => {
      this.game.restartCurrentLevel();
    });
    document.getElementById('btn-quit-to-menu').addEventListener('click', () => {
      this.game.returnToMainMenu();
    });

    // Results Modal Buttons
    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.closeModal(this.resultsModal);
      const nextId = this.game.currentLevelId + 1;
      if (LEVEL_DATA[nextId] && this.progress.isLevelUnlocked(nextId)) {
        this.game.startLevel(nextId);
      } else {
        this.game.startLevel(this.game.currentLevelId);
      }
    });
    document.getElementById('btn-retry-level').addEventListener('click', () => {
      this.closeModal(this.resultsModal);
      this.game.restartCurrentLevel();
    });
    document.getElementById('btn-results-menu').addEventListener('click', () => {
      this.closeModal(this.resultsModal);
      this.game.returnToMainMenu();
    });

    // Settings switches
    const settingSound = document.getElementById('setting-sound');
    if (settingSound) {
      settingSound.checked = this.progress.getSettings().sound;
      settingSound.addEventListener('change', (e) => {
        this.audio.enabled = e.target.checked;
        audioBtn.textContent = e.target.checked ? 'ENABLED' : 'MUTED';
        audioBtn.classList.toggle('muted', !e.target.checked);
        this.progress.updateSettings({ sound: e.target.checked });
      });
    }

    const resetDataBtn = document.getElementById('btn-reset-saved-data');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all unlocked tracks and personal best times?')) {
          this.progress.resetAllProgress();
          this.updateMenuStats();
          this.closeModal(this.settingsModal);
          alert('Championship progress reset to default.');
        }
      });
    }

    // Garage Equip Button
    document.getElementById('btn-select-car').addEventListener('click', () => {
      this.progress.setSelectedCar(this.garageSelectedCarId);
      this.progress.setCarColor(this.garageSelectedCarId, this.garageSelectedColor);
      this.updateMenuStats();
      this.closeModal(this.garageModal);
      this.game.onCarChanged();
    });
  }

  openModal(modal) {
    if (modal) modal.classList.remove('hidden');
  }

  closeModal(modal) {
    if (modal) modal.classList.add('hidden');
    if (modal === this.garageModal) {
      this.isGarageOpen = false;
    }
  }

  updateMenuStats() {
    const selectedCar = this.progress.getSelectedCar();
    const carNameEl = document.getElementById('menu-current-car-name');
    if (carNameEl) carNameEl.textContent = selectedCar.name;

    const progressEl = document.getElementById('menu-progress-status');
    const unlockedCount = this.progress.data.unlockedLevels.length;
    if (progressEl) progressEl.textContent = `Track ${unlockedCount} / 4 Unlocked`;
  }

  showMainMenu() {
    this.mainMenuEl.classList.remove('hidden');
    this.updateMenuStats();
  }

  hideMainMenu() {
    this.mainMenuEl.classList.add('hidden');
  }

  // ==========================================
  // LEVEL SELECTION MODAL
  // ==========================================
  openLevelSelect() {
    const container = document.getElementById('track-cards-container');
    container.innerHTML = '';

    for (let id = 1; id <= 4; id++) {
      const level = LEVEL_DATA[id];
      const isUnlocked = this.progress.isLevelUnlocked(id);
      const bestTime = this.progress.getBestTime(id);
      const isCurrent = this.game.currentLevelId === id;

      const card = document.createElement('div');
      card.className = `track-card ${isUnlocked ? '' : 'locked'} ${isCurrent ? 'active-selected' : ''}`;

      card.innerHTML = `
        <div class="track-header">
          <span class="track-tier">TRACK ${id}</span>
          <span class="track-difficulty ${level.difficulty}">${level.diffText}</span>
        </div>
        <h3 class="track-title">${level.title}</h3>
        <p class="track-desc">${level.description}</p>
        <div class="track-specs-row">
          <span>LIMIT: <b>${level.targetTimeSec}s (01:10)</b></span>
          <span>BEST: <b>${bestTime ? bestTime + 's' : '--:--'}</b></span>
        </div>
        ${!isUnlocked ? `<div class="track-lock-overlay"><span>🔒 LOCKED</span><small>Complete Track ${id - 1} to unlock</small></div>` : ''}
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.closeModal(this.levelSelectModal);
          this.game.startLevel(id);
        });
      }

      container.appendChild(card);
    }

    this.openModal(this.levelSelectModal);
  }

  // ==========================================
  // 3D GARAGE & CAR VIEWER
  // ==========================================
  initGarage3D() {
    const container = document.getElementById('garage-3d-canvas-wrap');
    if (!container) return;

    this.garageScene = new THREE.Scene();
    this.garageCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.garageCamera.position.set(4.5, 2.5, 4.5);
    this.garageCamera.lookAt(0, 0.4, 0);

    this.garageRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.garageRenderer.setSize(container.clientWidth, container.clientHeight);
    this.garageRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.garageRenderer.shadowMap.enabled = true;
    container.appendChild(this.garageRenderer.domElement);

    // Garage lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.9);
    this.garageScene.add(amb);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 2.5);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    this.garageScene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xff0055, 1.8);
    backLight.position.set(-5, 4, -5);
    this.garageScene.add(backLight);

    // Turntable pedestal disc
    const discGeo = new THREE.CylinderGeometry(2.8, 3.0, 0.2, 32);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x121826,
      metalness: 0.8,
      roughness: 0.2,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.1;
    disc.receiveShadow = true;
    this.garageScene.add(disc);

    // Neon circle ring on pedestal
    const ringGeo = new THREE.RingGeometry(2.7, 2.78, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.01;
    this.garageScene.add(ring);

    this.renderGarageTurntable();
  }

  renderGarageTurntable() {
    requestAnimationFrame(() => this.renderGarageTurntable());

    if (this.isGarageOpen && this.garageCarGroup) {
      this.garageCarGroup.rotation.y += 0.012; // slow elegant turntable rotation
      this.garageRenderer.render(this.garageScene, this.garageCamera);
    }
  }

  openGarage() {
    const selected = this.progress.getSelectedCar();
    this.garageSelectedCarId = selected.id;
    this.garageSelectedColor = selected.currentColorKey;

    this.populateCarPills();
    this.populateColorSwatches();
    this.updateGarageCarPreview(selected.id, selected.currentColorHex);
    this.updateGarageSpecs(selected);

    this.isGarageOpen = true;
    this.openModal(this.garageModal);

    // Resize viewport if needed
    setTimeout(() => {
      const container = document.getElementById('garage-3d-canvas-wrap');
      if (container && this.garageRenderer) {
        this.garageCamera.aspect = container.clientWidth / container.clientHeight;
        this.garageCamera.updateProjectionMatrix();
        this.garageRenderer.setSize(container.clientWidth, container.clientHeight);
      }
    }, 50);
  }

  populateCarPills() {
    const pillsContainer = document.getElementById('car-select-pills');
    pillsContainer.innerHTML = '';

    CAR_CATALOG.forEach((car) => {
      const pill = document.createElement('div');
      pill.className = `car-pill ${car.id === this.garageSelectedCarId ? 'active' : ''}`;
      pill.textContent = car.name.toUpperCase();
      pill.addEventListener('click', () => {
        document.querySelectorAll('.car-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.garageSelectedCarId = car.id;
        const colorHex = PAINT_COLORS[this.garageSelectedColor] || car.primaryColor;
        this.updateGarageCarPreview(car.id, colorHex);
        this.updateGarageSpecs(car);
      });
      pillsContainer.appendChild(pill);
    });
  }

  populateColorSwatches() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      const colorKey = swatch.getAttribute('data-color');
      swatch.classList.toggle('active', colorKey === this.garageSelectedColor);

      swatch.onclick = () => {
        swatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        this.garageSelectedColor = colorKey;
        const colorHex = PAINT_COLORS[colorKey];
        if (this.garageCarData) {
          CarBuilder.setCarColor(this.garageCarData, colorHex);
        }
      };
    });
  }

  updateGarageCarPreview(carId, colorHex) {
    if (this.garageCarGroup) {
      this.garageScene.remove(this.garageCarGroup);
    }

    this.garageCarData = CarBuilder.buildSportsCar({
      primaryColor: colorHex,
    });
    this.garageCarGroup = this.garageCarData.carGroup;
    this.garageCarGroup.position.set(0, 0, 0);
    this.garageScene.add(this.garageCarGroup);
  }

  updateGarageSpecs(car) {
    document.getElementById('garage-car-name').textContent = car.name.toUpperCase();
    document.getElementById('garage-car-desc').textContent = car.desc;
    document.getElementById('stat-val-speed').textContent = `${car.topSpeedKmh} km/h`;
    document.getElementById('stat-bar-speed').style.width = `${(car.speedStat / 10) * 100}%`;
    document.getElementById('stat-val-accel').textContent = `${car.accelStat} / 10`;
    document.getElementById('stat-bar-accel').style.width = `${(car.accelStat / 10) * 100}%`;
    document.getElementById('stat-val-handling').textContent = `${car.handlingStat} / 10`;
    document.getElementById('stat-bar-handling').style.width = `${(car.handlingStat / 10) * 100}%`;
    document.getElementById('stat-val-nitro').textContent = `${(car.nitroStat * 10)}%`;
    document.getElementById('stat-bar-nitro').style.width = `${(car.nitroStat / 10) * 100}%`;
  }

  // ==========================================
  // PAUSE & RESULTS DISPLAY
  // ==========================================
  showPauseMenu() {
    this.openModal(this.pauseModal);
  }

  hidePauseMenu() {
    this.closeModal(this.pauseModal);
  }

  showResults(results) {
    const { isVictory, time, targetTime, reason, levelId, isNewRecord, bestTime } = results;

    const banner = document.getElementById('results-header-banner');
    const title = document.getElementById('results-title');
    const subtitle = document.getElementById('results-subtitle');

    if (isVictory) {
      banner.className = 'results-banner victory';
      title.textContent = 'TIME TRIAL WON!';
      subtitle.textContent = isNewRecord ? 'NEW TRACK RECORD ESTABLISHED!' : 'Track Completed Within Time Limit!';
      document.getElementById('btn-next-level').style.display = 'block';
    } else {
      banner.className = 'results-banner defeat';
      if (reason === 'TIME_UP') {
        title.textContent = 'TIME UP';
        subtitle.textContent = '70-second time limit expired before completing track!';
      } else {
        title.textContent = 'TRIAL FAILED';
        subtitle.textContent = 'Vehicle damaged beyond operational limits!';
      }
      document.getElementById('btn-next-level').style.display = 'none';
    }

    const posEl = document.getElementById('result-val-pos');
    if (posEl) {
      posEl.textContent = isVictory ? 'WIN' : (reason === 'TIME_UP' ? 'TIME UP' : 'FAILED');
    }
    document.getElementById('result-val-time').textContent = this.formatTime(time);
    document.getElementById('result-val-target').textContent = this.formatTime(targetTime);
    document.getElementById('result-val-best').textContent = this.formatTime(bestTime || time);

    const unlockNotify = document.getElementById('results-unlock-notify');
    const nextLevelId = levelId + 1;
    if (isVictory && nextLevelId <= 4) {
      const newlyUnlocked = this.progress.unlockLevel(nextLevelId);
      if (newlyUnlocked) {
        unlockNotify.classList.remove('hidden');
        unlockNotify.innerHTML = `🏆 <b>NEW TRACK UNLOCKED!</b> Track ${nextLevelId}: ${LEVEL_DATA[nextLevelId].title} is now open!`;
      } else {
        unlockNotify.classList.add('hidden');
      }
    } else {
      unlockNotify.classList.add('hidden');
    }

    this.openModal(this.resultsModal);
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}.${millis < 10 ? '0' + millis : millis}`;
  }
}
