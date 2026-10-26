import * as THREE from 'three';

/**
 * ParticleEffects.js
 * Particle systems for tire smoke, nitro exhaust flames, collision sparks,
 * victory confetti, and 2D canvas speed warp lines.
 *
 * Computer Graphics Concepts:
 * - Particle physics: position integration with velocity and drag
 * - Alpha blending, scale expansion, and color fading over lifetime
 * - Procedural canvas drawing for screen-space warp motion lines
 */

export class ParticleEffects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Shared geometries and materials for performance
    this.smokeGeo = new THREE.SphereGeometry(0.2, 6, 6);
    this.sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.flameGeo = new THREE.ConeGeometry(0.12, 0.45, 8);
    this.confettiGeo = new THREE.PlaneGeometry(0.18, 0.18);

    // Speed Lines Canvas
    this.speedCanvas = document.getElementById('speed-lines-canvas');
    if (this.speedCanvas) {
      this.speedCtx = this.speedCanvas.getContext('2d');
      this.resizeSpeedCanvas();
      window.addEventListener('resize', () => this.resizeSpeedCanvas());
    }

    this.confettiColors = [0xff0055, 0x00f3ff, 0xffaa00, 0x00ff66, 0xffffff, 0xb800ff];
  }

  resizeSpeedCanvas() {
    if (!this.speedCanvas) return;
    this.speedCanvas.width = window.innerWidth;
    this.speedCanvas.height = window.innerHeight;
  }

  /**
   * Spawns tire smoke puff at a specific 3D coordinate
   */
  spawnTireSmoke(position) {
    if (this.particles.length > 250) return; // limit count for steady 60fps

    const mat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.15;

    // Random slight velocity
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      0.8 + Math.random() * 1.2,
      (Math.random() - 0.5) * 1.5
    );

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      mat,
      velocity,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 0.8,
      type: 'smoke',
      growthRate: 3.5,
    });
  }

  /**
   * Spawns glowing nitro flame cone from exhaust
   */
  spawnNitroFlame(position, heading) {
    const isCyan = Math.random() > 0.35;
    const mat = new THREE.MeshBasicMaterial({
      color: isCyan ? 0x00f3ff : 0xff7700,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.flameGeo, mat);
    mesh.position.copy(position);
    mesh.rotation.y = heading;
    mesh.rotation.x = Math.PI / 2;

    const velocity = new THREE.Vector3(
      -Math.sin(heading) * (8 + Math.random() * 5),
      (Math.random() - 0.5) * 0.5,
      -Math.cos(heading) * (8 + Math.random() * 5)
    );

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      mat,
      velocity,
      life: 0.15,
      maxLife: 0.15,
      type: 'flame',
      growthRate: 1.0,
    });
  }

  /**
   * Spawns collision sparks burst
   */
  spawnSparks(position, count = 15) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xffcc00 : 0xff3300,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(position);

      const speed = 6 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.2) * Math.PI;

      const velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elev) * speed,
        Math.sin(elev) * speed + 3,
        Math.sin(angle) * Math.cos(elev) * speed
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        velocity,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        type: 'spark',
        gravity: -20,
      });
    }
  }

  /**
   * Spawns victory confetti shower
   */
  spawnConfettiShower(centerPos, count = 120) {
    for (let i = 0; i < count; i++) {
      const col = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(this.confettiGeo, mat);

      mesh.position.set(
        centerPos.x + (Math.random() - 0.5) * 35,
        centerPos.y + 12 + Math.random() * 15,
        centerPos.z + (Math.random() - 0.5) * 35
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        -2.5 - Math.random() * 3.5,
        (Math.random() - 0.5) * 5
      );

      const rotSpeed = new THREE.Vector3(
        Math.random() * 8,
        Math.random() * 8,
        Math.random() * 8
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        velocity,
        rotSpeed,
        life: 4.5 + Math.random() * 2.0,
        maxLife: 6.5,
        type: 'confetti',
      });
    }
  }

  /**
   * Updates all active 3D particles each frame
   */
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.mesh.position.addScaledVector(p.velocity, dt);

      if (p.gravity) {
        p.velocity.y += p.gravity * dt;
      }

      if (p.rotSpeed) {
        p.mesh.rotation.x += p.rotSpeed.x * dt;
        p.mesh.rotation.y += p.rotSpeed.y * dt;
        p.mesh.rotation.z += p.rotSpeed.z * dt;
      }

      // Visual fade and scale dynamics
      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'smoke') {
        p.mat.opacity = lifeRatio * 0.55;
        const scale = 1 + (1 - lifeRatio) * p.growthRate;
        p.mesh.scale.set(scale, scale, scale);
      } else if (p.type === 'flame') {
        p.mat.opacity = lifeRatio;
        const scale = lifeRatio;
        p.mesh.scale.set(scale, scale, scale);
      } else if (p.type === 'spark') {
        p.mat.opacity = lifeRatio * 0.95;
      } else if (p.type === 'confetti') {
        if (p.mesh.position.y < 0.2) {
          p.mesh.position.y = 0.2;
          p.velocity.set(0, 0, 0);
        }
        if (p.life < 1.0) {
          p.mat.opacity = p.life;
        }
      }
    }
  }

  /**
   * Renders 2D speed warp lines on high speed or nitro
   */
  updateSpeedLines(speedRatio, isNitro) {
    if (!this.speedCanvas || !this.speedCtx) return;

    if (!isNitro && speedRatio < 0.75) {
      this.speedCanvas.style.opacity = '0';
      return;
    }

    const intensity = isNitro ? 1.0 : (speedRatio - 0.75) / 0.25;
    this.speedCanvas.style.opacity = `${intensity * 0.85}`;

    const w = this.speedCanvas.width;
    const h = this.speedCanvas.height;
    const ctx = this.speedCtx;

    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.55;
    const lineCount = isNitro ? 45 : 22;

    ctx.lineWidth = isNitro ? 2.5 : 1.5;
    ctx.strokeStyle = isNitro ? 'rgba(0, 243, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)';

    for (let i = 0; i < lineCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const innerRadius = 180 + Math.random() * 120;
      const length = 120 + Math.random() * 260;

      const x1 = cx + Math.cos(angle) * innerRadius;
      const y1 = cy + Math.sin(angle) * innerRadius;
      const x2 = cx + Math.cos(angle) * (innerRadius + length);
      const y2 = cy + Math.sin(angle) * (innerRadius + length);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  clearAll() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      this.scene.remove(p.mesh);
      p.mat.dispose();
    }
    this.particles = [];
    if (this.speedCanvas) {
      this.speedCanvas.style.opacity = '0';
    }
  }
}
