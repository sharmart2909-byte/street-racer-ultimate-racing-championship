import * as THREE from 'three';

/**
 * FollowCamera.js
 * Cinematic third-person follow camera with spring-damper interpolation,
 * dynamic speed FOV, collision camera shake, and multiple selectable viewpoints.
 *
 * Computer Graphics Concepts:
 * - Perspective projection: Dynamic field of view (FOV) based on velocity
 * - Camera transformation matrices: View matrix interpolation using Lerp/Slerp
 * - LookAt vector calculation with predictive forward targeting
 * - Procedural camera shake using damped harmonic oscillation
 */

export class FollowCamera {
  constructor(camera, targetCar) {
    this.camera = camera;
    this.targetCar = targetCar;

    // Camera modes: 'chase' (3rd person) or 'hood' (first person cockpit)
    this.mode = 'chase';

    // Chase mode offsets
    this.chaseDistance = 8.2;
    this.chaseHeight = 3.2;
    this.lookAheadDistance = 14.0;
    this.lookAboveHeight = 1.2;

    // Hood mode offsets
    this.hoodDistance = -0.3;
    this.hoodHeight = 1.15;
    this.hoodLookDistance = 25.0;

    // Smoothed state
    this.currentPos = new THREE.Vector3(0, 5, -10);
    this.currentLookAt = new THREE.Vector3(0, 1, 0);

    // Dynamic FOV
    this.baseFov = 62;
    this.maxFov = 78;
    this.currentFov = 62;

    // Camera shake
    this.shakeIntensity = 0;
    this.shakeDecay = 4.5; // per second
  }

  setTarget(car) {
    this.targetCar = car;
  }

  toggleViewMode() {
    this.mode = this.mode === 'chase' ? 'hood' : 'chase';
  }

  triggerShake(intensity = 0.4) {
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + intensity);
  }

  /**
   * Updates camera position and perspective each frame
   * @param {number} dt Delta time
   */
  update(dt) {
    if (!this.targetCar || !this.camera) return;

    const carPos = this.targetCar.getPosition();
    const forward = this.targetCar.getForwardVector();
    const speedRatio = this.targetCar.physics.getSpeedRatio();
    const isNitro = this.targetCar.physics.nitroActive;

    // 1. CALCULATE DESIRED CAMERA POSITION & LOOKAT
    let idealPos = new THREE.Vector3();
    let idealLookAt = new THREE.Vector3();

    if (this.mode === 'chase') {
      // Behind the car along inverted forward vector
      idealPos.copy(carPos)
        .sub(forward.clone().multiplyScalar(this.chaseDistance))
        .add(new THREE.Vector3(0, this.chaseHeight, 0));

      // Look slightly ahead of car
      idealLookAt.copy(carPos)
        .add(forward.clone().multiplyScalar(this.lookAheadDistance))
        .add(new THREE.Vector3(0, this.lookAboveHeight, 0));
    } else {
      // Hood / Bumper camera
      idealPos.copy(carPos)
        .add(forward.clone().multiplyScalar(this.hoodDistance))
        .add(new THREE.Vector3(0, this.hoodHeight, 0));

      idealLookAt.copy(carPos)
        .add(forward.clone().multiplyScalar(this.hoodLookDistance))
        .add(new THREE.Vector3(0, 0.8, 0));
    }

    // 2. SMOOTH INTERPOLATION (Critically damped lerp)
    const posLerpFactor = this.mode === 'chase' ? Math.min(1, 10.0 * dt) : Math.min(1, 25.0 * dt);
    const lookLerpFactor = Math.min(1, 14.0 * dt);

    this.currentPos.lerp(idealPos, posLerpFactor);
    this.currentLookAt.lerp(idealLookAt, lookLerpFactor);

    // 3. PROCEDURAL CAMERA SHAKE
    if (this.shakeIntensity > 0.005) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.4;

      this.currentPos.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
    }

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    // 4. DYNAMIC FIELD OF VIEW (Speed & Nitro sense of motion)
    const targetFov = isNitro ? this.maxFov : (this.baseFov + speedRatio * 8);
    this.currentFov += (targetFov - this.currentFov) * 5.0 * dt;

    if (Math.abs(this.camera.fov - this.currentFov) > 0.1) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Snaps camera instantly to target without lerp (e.g. at race start / reset)
   */
  snapToTarget() {
    if (!this.targetCar) return;
    const carPos = this.targetCar.getPosition();
    const forward = this.targetCar.getForwardVector();

    this.currentPos.copy(carPos)
      .sub(forward.clone().multiplyScalar(this.chaseDistance))
      .add(new THREE.Vector3(0, this.chaseHeight, 0));

    this.currentLookAt.copy(carPos)
      .add(forward.clone().multiplyScalar(this.lookAheadDistance))
      .add(new THREE.Vector3(0, this.lookAboveHeight, 0));

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
