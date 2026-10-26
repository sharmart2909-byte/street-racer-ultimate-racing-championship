import * as THREE from 'three';
import { CarBuilder } from './CarBuilder.js';
import { CarPhysics } from './CarPhysics.js';

/**
 * PlayerCar.js
 * High-level controller for the player vehicle: handles inputs, physics updates,
 * visual transforms, bounding volumes, nitro effects, and damage integrity.
 */

export class PlayerCar {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    // Vehicle specifications
    this.name = options.name || 'Vortex GT';
    this.primaryColor = options.primaryColor || 0xe62232;

    // Physics controller
    this.physics = new CarPhysics({
      topSpeedKmh: options.topSpeedKmh || 240,
      accelerationRate: options.accelerationRate || 28,
      brakingRate: options.brakingRate || 42,
      handling: options.handling || 1.0,
      driftFactor: options.driftFactor || 1.0,
    });

    // 3D Car hierarchy
    this.carData = CarBuilder.buildSportsCar({
      primaryColor: this.primaryColor,
    });
    this.mesh = this.carData.carGroup;
    this.scene.add(this.mesh);

    // Bounding Box for collision detection
    this.collider = new THREE.Box3();
    this.colliderSize = new THREE.Vector3(2.0, 1.2, 4.4);

    // Vehicle integrity / damage (100% to 0%)
    this.integrity = 100;

    // Headlight spot/point lights for night levels
    this.setupNightLights();

    // Checkpoint / lap tracking
    this.currentCheckpoint = 0;
    this.lapProgress = 0; // 0 to 1 along current track curve
    this.totalDistanceTraveled = 0;
  }

  /**
   * Sets up real-time forward spotlights for night / tunnel lighting
   */
  setupNightLights() {
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0, 30);
    this.mesh.add(this.headlightTarget);

    this.headlightBeam = new THREE.SpotLight(0xd0e8ff, 0, 50, Math.PI / 5, 0.4, 1.2);
    this.headlightBeam.position.set(0, 0.7, 2.0);
    this.headlightBeam.target = this.headlightTarget;
    this.mesh.add(this.headlightBeam);
  }

  /**
   * Turns headlights on/off depending on level lighting
   */
  setHeadlights(enabled, intensity = 4.0) {
    if (this.headlightBeam) {
      this.headlightBeam.intensity = enabled ? intensity : 0;
    }
  }

  /**
   * Updates player car each frame
   * @param {number} dt Delta time
   * @param {Object} input Input states
   * @param {Object} audioManager Audio manager instance
   * @param {Object} particleManager Particle effects instance
   */
  update(dt, input, audioManager, particleManager) {
    // 1. Update vehicle physics
    this.physics.update(dt, input, this.carData);

    // 2. Update mesh position and orientation
    // Move along current heading vector
    const moveDist = this.physics.speed * dt;
    this.mesh.position.x += Math.sin(this.physics.heading + this.physics.driftAngle) * moveDist;
    this.mesh.position.z += Math.cos(this.physics.heading + this.physics.driftAngle) * moveDist;
    this.mesh.rotation.y = this.physics.heading + this.physics.driftAngle;

    this.totalDistanceTraveled += Math.abs(moveDist);

    // 3. Update collision bounding box
    this.collider.setFromCenterAndSize(
      this.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
      this.colliderSize
    );

    // 4. Update dynamic brake light brightness
    const isBraking = input.brake > 0 && this.physics.speed > 0;
    CarBuilder.setBrakingState(this.carData, isBraking);

    // 5. Trigger particle effects
    if (particleManager) {
      // Tire smoke during drift or hard braking
      if (this.physics.isDrifting || (isBraking && this.physics.speed > 15)) {
        const rearL = this.mesh.localToWorld(new THREE.Vector3(-0.95, 0.1, -1.35));
        const rearR = this.mesh.localToWorld(new THREE.Vector3(0.95, 0.1, -1.35));
        particleManager.spawnTireSmoke(rearL);
        particleManager.spawnTireSmoke(rearR);
      }

      // Nitro exhaust flames
      if (this.physics.nitroActive) {
        const exhaustL = this.mesh.localToWorld(new THREE.Vector3(-0.45, 0.28, -2.2));
        const exhaustR = this.mesh.localToWorld(new THREE.Vector3(0.45, 0.28, -2.2));
        particleManager.spawnNitroFlame(exhaustL, this.physics.heading);
        particleManager.spawnNitroFlame(exhaustR, this.physics.heading);
      }
    }

    // 6. Audio updates
    if (audioManager) {
      audioManager.updateEngine(this.physics.getSpeedRatio(), input.throttle > 0);
      audioManager.setNitro(this.physics.nitroActive);
      audioManager.setDrift(this.physics.isDrifting, Math.abs(this.physics.steerAngle) * 2.0);
    }
  }

  /**
   * Applies collision damage and bounce
   */
  takeCollision(damage = 5, speedLossFrac = 0.35) {
    this.integrity = Math.max(0, this.integrity - damage);
    this.physics.applyImpact(speedLossFrac);
  }

  /**
   * Resets vehicle to a specific track coordinate and orientation
   */
  resetTo(position, heading = 0) {
    this.mesh.position.copy(position);
    this.mesh.position.y = 0; // ground level
    this.mesh.rotation.set(0, heading, 0);
    this.physics.reset(position.x, position.y, position.z, heading);
  }

  setColor(hexColor) {
    this.primaryColor = hexColor;
    CarBuilder.setCarColor(this.carData, hexColor);
  }

  getPosition() {
    return this.mesh.position;
  }

  getForwardVector() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyEuler(new THREE.Euler(0, this.physics.heading, 0));
    return forward;
  }

  dispose() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
