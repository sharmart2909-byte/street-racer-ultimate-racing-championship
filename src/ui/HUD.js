/**
 * HUD.js
 * Heads-Up Display controller: digital cluster speedometer, RPM meter,
 * nitro gauge, dynamic 2D canvas minimap, position tracker, and countdown.
 */

export class HUD {
  constructor() {
    this.hudElement = document.getElementById('hud');
    this.speedValEl = document.getElementById('hud-speed-val');
    this.gearValEl = document.getElementById('hud-gear-val');
    this.rpmBarEl = document.getElementById('rpm-meter-fill');
    this.nitroBarEl = document.getElementById('nitro-bar-fill');
    this.nitroPctEl = document.getElementById('nitro-percent');
    this.timerEl = document.getElementById('hud-timer');
    this.targetTimeEl = document.getElementById('hud-target-time');
    this.elapsedTimeEl = document.getElementById('hud-elapsed-time');
    this.trackNameEl = document.getElementById('hud-track-name');
    this.lapInfoEl = document.getElementById('hud-lap-info');
    this.cpCountEl = document.getElementById('hud-checkpoint-count');
    this.damageValEl = document.getElementById('hud-damage-val');
    this.damageBarEl = document.getElementById('hud-damage-bar');

    this.bannerEl = document.getElementById('hud-banner');
    this.driftBannerEl = document.getElementById('hud-drift-banner');
    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');

    // Minimap canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
    }

    this.bannerTimeout = null;
    this.driftTimeout = null;
  }

  show() {
    if (this.hudElement) this.hudElement.classList.remove('hidden');
  }

  hide() {
    if (this.hudElement) this.hudElement.classList.add('hidden');
  }

  /**
   * Updates in-game dashboard metrics every frame
   */
  update(gameState) {
    if (!this.hudElement || this.hudElement.classList.contains('hidden')) return;

    const { playerCar, raceTime, targetTime, levelData } = gameState;
    if (!playerCar) return;

    // 1. SPEED & GEAR
    const kmh = Math.round(Math.abs(playerCar.physics.getSpeedKmh()));
    this.speedValEl.textContent = kmh < 100 ? (kmh < 10 ? `00${kmh}` : `0${kmh}`) : `${kmh}`;
    this.gearValEl.textContent = playerCar.physics.speed < -0.5 ? 'R' : (kmh < 3 ? '1' : `${playerCar.physics.gear}`);

    // 2. RPM TACHOMETER
    const rpmPct = Math.min(100, Math.max(5, playerCar.physics.rpm * 100));
    this.rpmBarEl.style.width = `${rpmPct}%`;

    // 3. NITRO GAUGE
    const nitroPct = Math.round(playerCar.physics.nitroTank);
    this.nitroBarEl.style.width = `${nitroPct}%`;
    this.nitroPctEl.textContent = `${nitroPct}%`;

    // 4. TIMERS (Time Remaining Countdown & Elapsed Time)
    const remainingTime = Math.max(0, targetTime - raceTime);
    this.timerEl.textContent = this.formatTime(remainingTime);
    this.targetTimeEl.textContent = this.formatTime(targetTime);
    if (this.elapsedTimeEl) {
      this.elapsedTimeEl.textContent = this.formatTime(raceTime);
    }

    // 5. TRACK & MODE
    this.trackNameEl.textContent = levelData ? levelData.title.toUpperCase() : 'TRACK';
    this.lapInfoEl.textContent = 'SOLO TIME TRIAL';

    // 6. CHECKPOINTS
    const totalCP = gameState.totalCheckpoints || 6;
    this.cpCountEl.textContent = `${playerCar.currentCheckpoint}/${totalCP}`;

    // 7. VEHICLE DAMAGE / INTEGRITY
    const integrity = Math.round(playerCar.integrity);
    this.damageValEl.textContent = `${integrity}%`;
    this.damageBarEl.style.width = `${integrity}%`;

    // 8. DRIFT BANNER
    if (playerCar.physics.isDrifting && kmh > 25) {
      this.showDriftBanner(`DRIFTING +${playerCar.physics.driftScore}`);
    }

    // 9. MINIMAP UPDATE
    this.drawMinimap(gameState);
  }

  showBanner(text, durationMs = 1500) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('hidden');

    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.bannerEl.classList.add('hidden');
    }, durationMs);
  }

  showDriftBanner(text) {
    if (!this.driftBannerEl) return;
    this.driftBannerEl.textContent = text;
    this.driftBannerEl.classList.remove('hidden');

    if (this.driftTimeout) clearTimeout(this.driftTimeout);
    this.driftTimeout = setTimeout(() => {
      this.driftBannerEl.classList.add('hidden');
    }, 400);
  }

  /**
   * Renders real-time 2D minimap of the track spline and all cars
   */
  drawMinimap(gameState) {
    if (!this.minimapCtx || !gameState.trackData) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const samplePoints = gameState.trackData.samplePoints;
    if (!samplePoints || samplePoints.length === 0) return;

    ctx.clearRect(0, 0, w, h);

    // Compute bounding box of track coordinates
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of samplePoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const trackWidth = maxX - minX || 1;
    const trackDepth = maxZ - minZ || 1;
    const padding = 20;

    const scale = Math.min((w - padding * 2) / trackWidth, (h - padding * 2) / trackDepth);

    // Mapping 3D world (X, Z) to 2D canvas (x, y)
    const toCanvasX = (wx) => padding + (wx - minX) * scale;
    const toCanvasY = (wz) => padding + (wz - minZ) * scale;

    // Draw Track Path
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const startX = toCanvasX(samplePoints[0].x);
    const startY = toCanvasY(samplePoints[0].z);
    ctx.moveTo(startX, startY);

    for (let i = 1; i < samplePoints.length; i++) {
      ctx.lineTo(toCanvasX(samplePoints[i].x), toCanvasY(samplePoints[i].z));
    }
    ctx.closePath();
    ctx.stroke();

    // Draw Start / Finish gate dot
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(startX, startY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw Player dot (Bright Cyan Glow)
    const pPos = gameState.playerCar.getPosition();
    const px = toCanvasX(pPos.x);
    const py = toCanvasY(pPos.z);

    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }

  /**
   * Plays the 3, 2, 1, GO! countdown animation
   */
  async playCountdown(audioManager) {
    if (!this.countdownOverlay || !this.countdownText) return;

    this.countdownOverlay.classList.remove('hidden');

    const steps = ['3', '2', '1', 'GO!'];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.countdownText.textContent = step;
      this.countdownText.style.animation = 'none';
      void this.countdownText.offsetWidth; // trigger reflow
      this.countdownText.style.animation = 'countdownPop 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards';

      if (audioManager) {
        audioManager.playCountdown(step === 'GO!');
      }

      await new Promise((res) => setTimeout(res, 850));
    }

    this.countdownOverlay.classList.add('hidden');
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);

    const mStr = mins < 10 ? `0${mins}` : `${mins}`;
    const sStr = secs < 10 ? `0${secs}` : `${secs}`;
    const msStr = millis < 10 ? `0${millis}` : `${millis}`;

    return `${mStr}:${sStr}.${msStr}`;
  }
}
