import * as THREE from 'three';
import { LEVEL_DATA, createTrackSpline } from '../tracks/TrackData.js';
import { TrackBuilder } from '../tracks/TrackBuilder.js';
import { PlayerCar } from '../car/PlayerCar.js';
import { AICar } from '../car/AICar.js';
import { FollowCamera } from '../camera/FollowCamera.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ParticleEffects } from '../effects/ParticleEffects.js';
import { CollisionManager } from './CollisionManager.js';
import { InputManager } from './InputManager.js';
import { ProgressManager } from './ProgressManager.js';
import { HUD } from '../ui/HUD.js';
import { MenuManager } from '../ui/MenuManager.js';
import { CarBuilder } from '../car/CarBuilder.js';

/**
 * Game.js
 * Master 3D WebGL Game Engine for Street Racer: Ultimate Racing Championship.
 *
 * Computer Graphics Architecture:
 * - Render Loop: requestAnimationFrame with THREE.Clock delta time
 * - PBR Lighting: ACES Filmic Tone Mapping, Directional Shadow Cascades, Ambient & Fog
 * - Dynamic View Frustum & Perspective Camera Management
 * - Multi-agent scene graph updates: Player, AI Competitors, Extruded Tracks, Particles
 */

export class Game {
  constructor() {
    this.container = document.getElementById('canvas-wrapper');

    // Game states: 'MENU', 'COUNTDOWN', 'RACING', 'PAUSED', 'RESULTS'
    this.state = 'MENU';

    // Core Managers
    this.progress = new ProgressManager();
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.hud = new HUD();

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Level & Gameplay state
    this.currentLevelId = 1;
    this.levelData = null;
    this.trackSpline = null;
    this.trackData = null;
    this.playerCar = null;
    this.aiCars = [];
    this.followCamera = null;
    this.particles = null;
    this.collisionManager = null;

    // Race metrics
    this.raceTime = 0;
    this.currentLap = 1;
    this.totalLaps = 1;
    this.targetTime = 70;

    // Mobile & Touch detection
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    this.touchControlsEl = document.getElementById('mobile-touch-controls');
    this.orientationNoticeEl = document.getElementById('orientation-notice');
    this.orientationDismissed = false;

    // Initialize engine
    this.initThree();
    this.menuManager = new MenuManager(this, this.progress, this.audio);
    this.setupMenuShowcase();
    this.setupInputCallbacks();
    this.setupMobileFeatures();

    // Start animation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  /**
   * Initializes Three.js WebGL Scene, Camera, Shadows, and Tone Mapping
   */
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c12);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 1200);
    this.camera.position.set(0, 3, -8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Optimized pixel ratio for mobile performance
    const maxPixelRatio = this.isTouchDevice ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

    // High quality rendering
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Particle manager
    this.particles = new ParticleEffects(this.scene);

    // Lighting setup
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.sunLight.position.set(120, 220, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = this.isTouchDevice ? 1024 : 2048;
    this.sunLight.shadow.mapSize.height = this.isTouchDevice ? 1024 : 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 600;
    const shadowD = 90;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Resize handler
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onWindowResize(), 150);
    });
  }

  setupMobileFeatures() {
    // Touch audio unlock on first user interaction
    const unlockAudio = () => {
      this.audio.init();
      this.audio.ensureRunning();
    };
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });

    // Dismiss orientation banner button
    const dismissBtn = document.getElementById('btn-dismiss-orientation');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.orientationDismissed = true;
        if (this.orientationNoticeEl) this.orientationNoticeEl.classList.add('hidden');
      });
    }

    this.checkOrientation();
  }

  checkOrientation() {
    if (!this.orientationNoticeEl) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    if (this.isTouchDevice && isPortrait && !this.orientationDismissed) {
      this.orientationNoticeEl.classList.remove('hidden');
    } else {
      this.orientationNoticeEl.classList.add('hidden');
    }
  }

  updateTouchControlsVisibility() {
    if (!this.touchControlsEl) return;
    const shouldShow = (this.state === 'RACING' || this.state === 'COUNTDOWN') && (this.isTouchDevice || window.innerWidth < 1024);
    if (shouldShow) {
      this.touchControlsEl.classList.remove('hidden');
    } else {
      this.touchControlsEl.classList.add('hidden');
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const maxPixelRatio = this.isTouchDevice ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    this.checkOrientation();
    this.updateTouchControlsVisibility();
  }

  setupInputCallbacks() {
    this.input.onPauseToggle = () => {
      if (this.state === 'RACING') this.togglePause();
      else if (this.state === 'PAUSED') this.resumeGame();
    };

    this.input.onResetCar = () => {
      if (this.state === 'RACING') this.resetCarToTrack();
    };

    this.input.onCameraToggle = () => {
      if (this.followCamera) this.followCamera.toggleViewMode();
    };
  }

  /**
   * Sets up 3D animated showcase car for the main menu background
   */
  setupMenuShowcase() {
    this.clearMenuShowcase();

    this.menuShowcaseGroup = new THREE.Group();
    const selectedCar = this.progress.getSelectedCar();

    const carData = CarBuilder.buildSportsCar({
      primaryColor: selectedCar.currentColorHex,
    });
    this.menuShowcaseGroup.add(carData.carGroup);

    // Platform ring underneath
    const ringGeo = new THREE.RingGeometry(3.5, 3.65, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.02;
    this.menuShowcaseGroup.add(ring);

    this.menuShowcaseGroup.position.set(2, 0, 0);
    this.scene.add(this.menuShowcaseGroup);

    // Menu camera framing
    this.camera.position.set(5.5, 2.2, 5.5);
    this.camera.lookAt(0.5, 0.8, 0);
  }

  clearMenuShowcase() {
    if (this.menuShowcaseGroup) {
      this.scene.remove(this.menuShowcaseGroup);
      this.menuShowcaseGroup = null;
    }
  }

  onCarChanged() {
    if (this.state === 'MENU') {
      this.setupMenuShowcase();
    }
  }

  // ==========================================
  // LEVEL INITIALIZATION & LIFECYCLE
  // ==========================================
  async startLevel(levelId) {
    this.currentLevelId = Number(levelId);
    this.levelData = LEVEL_DATA[this.currentLevelId] || LEVEL_DATA[1];

    // Clean up previous scene objects
    this.clearLevel();
    this.clearMenuShowcase();

    // 1. Environmental setup (Fog, Sky color, Lights)
    this.scene.background = new THREE.Color(this.levelData.bgColor);
    this.scene.fog = new THREE.Fog(
      this.levelData.fogColor,
      this.levelData.fogNear,
      this.levelData.fogFar
    );

    this.ambientLight.color.setHex(this.levelData.ambientLight);
    this.ambientLight.intensity = this.levelData.ambientIntensity;
    this.sunLight.color.setHex(this.levelData.dirLightColor);
    this.sunLight.intensity = this.levelData.dirLightIntensity;

    // 2. Generate Track Spline & 3D Procedural Mesh
    this.trackSpline = createTrackSpline(this.currentLevelId);
    this.trackData = TrackBuilder.buildTrack(this.scene, this.trackSpline, this.levelData);

    // 3. Spawn Player Vehicle
    const selectedCar = this.progress.getSelectedCar();
    this.playerCar = new PlayerCar(this.scene, {
      name: selectedCar.name,
      primaryColor: selectedCar.currentColorHex,
      topSpeedKmh: selectedCar.topSpeedKmh,
      accelerationRate: selectedCar.accelerationRate,
      brakingRate: selectedCar.brakingRate,
      handling: selectedCar.handling,
      driftFactor: selectedCar.driftFactor,
    });

    // Position player at start line, aligned with track direction
    const startPoint = this.trackData.samplePoints[0];
    const startTangent = this.trackSpline.getTangentAt(0.001).normalize();
    const startHeading = Math.atan2(startTangent.x, startTangent.z);

    this.playerCar.resetTo(startPoint, startHeading);

    // Enable headlights for night tracks
    this.playerCar.setHeadlights(this.levelData.theme === 'neon_night', 4.5);

    // 4. Solo Time Trial Mode: No Rival AI Racers or background traffic
    this.aiCars = [];

    // 5. Follow Camera & Collision Manager
    this.followCamera = new FollowCamera(this.camera, this.playerCar);
    this.followCamera.snapToTarget();

    this.collisionManager = new CollisionManager(
      this.trackData,
      this.audio,
      this.particles,
      this.followCamera
    );

    // 6. Reset Race Metrics (Strict 70-second / 01:10 Solo Time Trial)
    this.raceTime = 0;
    this.currentLap = 1;
    this.totalLaps = 1;
    this.targetTime = 70; // Exactly 70 seconds across all levels

    // 7. Transition UI
    this.menuManager.hideMainMenu();
    this.hud.show();
    this.state = 'COUNTDOWN';
    this.updateTouchControlsVisibility();

    // 8. Play 3, 2, 1, GO Countdown!
    await this.hud.playCountdown(this.audio);
    this.clock.getDelta(); // flush elapsed time during countdown
    this.state = 'RACING';
    this.updateTouchControlsVisibility();
  }

  clearLevel() {
    if (this.trackData && this.trackData.trackGroup) {
      this.scene.remove(this.trackData.trackGroup);
      this.trackData = null;
    }

    if (this.playerCar) {
      this.playerCar.dispose();
      this.playerCar = null;
    }

    for (const ai of this.aiCars) {
      ai.dispose();
    }
    this.aiCars = [];

    if (this.particles) {
      this.particles.clearAll();
    }
  }

  // ==========================================
  // GAME LOOP & TICK EXECUTION
  // ==========================================
  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'RACING') {
      this.updateRacing(dt);
    } else if (this.state === 'COUNTDOWN') {
      this.updateCountdown(dt);
    } else if (this.state === 'MENU') {
      this.updateMenu(dt);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateMenu(dt) {
    if (this.menuShowcaseGroup) {
      this.menuShowcaseGroup.rotation.y += 0.008;
    }
  }

  updateCountdown(dt) {
    // Keep camera updated during countdown
    if (this.followCamera) {
      this.followCamera.update(dt);
    }
  }

  updateRacing(dt) {
    this.raceTime += dt;

    // 1. Gather player input
    const inputState = this.input.getState();

    // 2. Update Player Car
    this.playerCar.update(dt, inputState, this.audio, this.particles);

    // Calculate approximate lap progress [0, 1]
    if (this.trackSpline && this.trackData.totalLength > 0) {
      this.playerCar.lapProgress = (this.playerCar.totalDistanceTraveled % this.trackData.totalLength) / this.trackData.totalLength;
    }

    // 3. Update Rival AI Cars
    for (const ai of this.aiCars) {
      ai.update(dt);
    }

    // 4. Shadow light follows player vehicle
    if (this.sunLight && this.playerCar) {
      const pPos = this.playerCar.getPosition();
      this.sunLight.position.set(pPos.x + 80, pPos.y + 160, pPos.z + 80);
      this.sunLight.target = this.playerCar.mesh;
    }

    // 5. Update Collision Detection
    this.collisionManager.update(
      dt,
      this.playerCar,
      this.aiCars,
      (cpIndex, total) => this.onCheckpointPassed(cpIndex, total),
      () => this.onLapCompleted()
    );

    // 6. Update Follow Camera
    this.followCamera.update(dt);

    // 7. Update Particles & Speed Lines
    this.particles.update(dt);
    this.particles.updateSpeedLines(
      this.playerCar.physics.getSpeedRatio(),
      this.playerCar.physics.nitroActive
    );

    // 8. Update HUD Metrics
    this.hud.update({
      playerCar: this.playerCar,
      raceTime: this.raceTime,
      targetTime: this.targetTime,
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      levelData: this.levelData,
      totalCheckpoints: this.trackData.checkpoints ? this.trackData.checkpoints.length : 6,
      aiCars: this.aiCars,
      trackData: this.trackData,
    });

    // 9. Failure condition check: strict 70-second time limit expired or vehicle destroyed
    if (this.raceTime >= this.targetTime) {
      this.raceTime = this.targetTime;
      this.finishRace(false, 'TIME_UP');
      return;
    } else if (this.playerCar.integrity <= 0) {
      this.finishRace(false, 'DESTROYED');
      return;
    }
  }

  onCheckpointPassed(cpIndex, total) {
    this.hud.showBanner(`CHECKPOINT ${cpIndex}/${total}!`);
    // Bonus nitro on checkpoint
    this.playerCar.physics.nitroTank = Math.min(100, this.playerCar.physics.nitroTank + 15);
  }

  onLapCompleted() {
    if (this.currentLap < this.totalLaps) {
      this.currentLap++;
      this.hud.showBanner(`LAP ${this.currentLap}! FINAL LAP!`);
    } else {
      // Completed track within time limit! VICTORY!
      this.finishRace(true, 'COMPLETED');
    }
  }

  finishRace(isVictory, reason = 'COMPLETED') {
    if (this.state === 'RESULTS') return; // Prevent duplicate finish screens or events
    this.state = 'RESULTS';
    this.audio.stopAll();
    this.updateTouchControlsVisibility();

    if (isVictory) {
      this.audio.playVictory();
      // Victory confetti shower!
      this.particles.spawnConfettiShower(this.playerCar.getPosition(), 140);
    } else {
      this.audio.playDefeat();
    }

    let isNewRecord = false;
    let bestTime = this.progress.getBestTime(this.currentLevelId);
    if (isVictory) {
      const recordResult = this.progress.recordRaceTime(this.currentLevelId, this.raceTime);
      isNewRecord = recordResult.isNewRecord;
      bestTime = recordResult.bestTime;
    }

    setTimeout(() => {
      this.menuManager.showResults({
        isVictory,
        time: this.raceTime,
        targetTime: this.targetTime,
        reason,
        levelId: this.currentLevelId,
        isNewRecord,
        bestTime,
      });
    }, 600);
  }

  resetCarToTrack() {
    if (!this.playerCar || !this.trackData) return;

    // Find closest track sample point
    const carPos = this.playerCar.getPosition();
    const samplePoints = this.trackData.samplePoints;
    let closestDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < samplePoints.length; i++) {
      const d = carPos.distanceToSquared(samplePoints[i]);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    const resetPt = samplePoints[closestIdx];
    const nextPt = samplePoints[(closestIdx + 1) % samplePoints.length];
    const forward = nextPt.clone().sub(resetPt).normalize();
    const heading = Math.atan2(forward.x, forward.z);

    this.playerCar.resetTo(resetPt, heading);
    this.followCamera.snapToTarget();
    this.hud.showBanner('CAR RESET TO TRACK', 1000);
  }

  togglePause() {
    if (this.state === 'RACING') {
      this.state = 'PAUSED';
      this.audio.stopAll();
      this.updateTouchControlsVisibility();
      this.menuManager.showPauseMenu();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.state === 'PAUSED') {
      this.clock.getDelta(); // flush delta time elapsed while paused
      this.state = 'RACING';
      this.updateTouchControlsVisibility();
      this.menuManager.hidePauseMenu();
    }
  }

  restartCurrentLevel() {
    this.menuManager.hidePauseMenu();
    this.menuManager.closeModal(this.menuManager.resultsModal);
    this.startLevel(this.currentLevelId);
  }

  returnToMainMenu() {
    this.state = 'MENU';
    this.audio.stopAll();
    this.clearLevel();
    this.hud.hide();
    this.updateTouchControlsVisibility();
    this.menuManager.hidePauseMenu();
    this.setupMenuShowcase();
    this.menuManager.showMainMenu();
  }
}
