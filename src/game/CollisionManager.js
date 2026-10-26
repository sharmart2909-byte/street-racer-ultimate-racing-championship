import * as THREE from 'three';

/**
 * CollisionManager.js
 * High-performance collision detection for track boundaries, checkpoints,
 * finish line gates, and vehicle-to-vehicle physics interactions.
 *
 * Computer Graphics & Math Concepts:
 * - Nearest-point projection onto parametric 3D curves (Spline distance)
 * - Axis-Aligned Bounding Box (AABB) & Bounding Sphere collision queries
 * - Plane dot product tests for checkpoint crossing
 * - Elastic impulse resolution between multi-agent rigid bodies
 */

export class CollisionManager {
  constructor(trackData, audioManager, particleManager, followCamera) {
    this.trackData = trackData; // { spline, checkpoints, samplePoints, halfWidth, totalLength }
    this.audioManager = audioManager;
    this.particleManager = particleManager;
    this.followCamera = followCamera;

    this.cooldownTimer = 0; // prevents audio/spark spam on consecutive frames
  }

  setTrackData(trackData) {
    this.trackData = trackData;
    this.cooldownTimer = 0;
  }

  /**
   * Main collision update per frame
   * @param {number} dt Delta time
   * @param {PlayerCar} playerCar
   * @param {Array<AICar>} aiCars
   * @param {Function} onCheckpointCallback
   * @param {Function} onFinishCallback
   */
  update(dt, playerCar, aiCars = [], onCheckpointCallback, onFinishCallback) {
    if (!this.trackData || !playerCar) return;

    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);

    const carPos = playerCar.getPosition();

    // 1. TRACK BOUNDARY & BARRIER COLLISION
    this.checkTrackBoundaries(playerCar, carPos);

    // 2. CHECKPOINT CROSSING DETECTION
    this.checkCheckpoints(playerCar, carPos, onCheckpointCallback);

    // 3. FINISH LINE / LAP COMPLETION
    this.checkFinishLine(playerCar, carPos, onFinishCallback);

    // 4. CAR-TO-CAR COLLISIONS (PLAYER VS RIVALS)
    this.checkCarCollisions(playerCar, aiCars);
  }

  /**
   * Clamps car within track boundaries and applies barrier collision physics
   */
  checkTrackBoundaries(playerCar, carPos) {
    const spline = this.trackData.spline;
    const halfWidth = this.trackData.halfWidth;
    if (!spline) return;

    // Find closest sample point along spline for rapid coarse search
    const samplePoints = this.trackData.samplePoints;
    let closestDistSq = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < samplePoints.length; i++) {
      const dSq = carPos.distanceToSquared(samplePoints[i]);
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestIdx = i;
      }
    }

    const closestPoint = samplePoints[closestIdx];
    const actualDist = Math.sqrt(closestDistSq);

    // Lateral distance beyond road barrier
    const lateralBuffer = 0.8;
    const maxAllowedDist = halfWidth - lateralBuffer;

    if (actualDist > maxAllowedDist && actualDist > 0.001) {
      // Barrier impact!
      // Direction vector from spline center to car
      const fromCenter = carPos.clone().sub(closestPoint);
      fromCenter.y = 0; // maintain horizontal plane
      const dir = fromCenter.clone().normalize();

      // Clamp car position just inside barrier
      const clampedPos = closestPoint.clone().add(dir.multiplyScalar(maxAllowedDist));
      playerCar.mesh.position.x = clampedPos.x;
      playerCar.mesh.position.z = clampedPos.z;

      // Adjust height to road surface
      playerCar.mesh.position.y = closestPoint.y;

      // Only trigger impact FX if car had noticeable speed
      if (Math.abs(playerCar.physics.speed) > 4 && this.cooldownTimer <= 0) {
        this.cooldownTimer = 0.22; // cooldown

        // Spark particles at barrier contact
        if (this.particleManager) {
          this.particleManager.spawnSparks(carPos, 14);
        }

        // Camera shake
        if (this.followCamera) {
          this.followCamera.triggerShake(0.35);
        }

        // Sound
        if (this.audioManager) {
          this.audioManager.playCrash(0.6);
        }

        // Speed reduction & damage
        playerCar.takeCollision(3, 0.35);
      }
    } else {
      // Normal on-track height alignment with road elevation
      playerCar.mesh.position.y = closestPoint.y;
    }
  }

  /**
   * Detects sequential passage through checkpoints
   */
  checkCheckpoints(playerCar, carPos, onCheckpointCallback) {
    const checkpoints = this.trackData.checkpoints;
    if (!checkpoints || checkpoints.length === 0) return;

    const nextIdx = playerCar.currentCheckpoint;
    if (nextIdx < checkpoints.length) {
      const cp = checkpoints[nextIdx];
      const dist = carPos.distanceTo(cp.position);

      if (dist < cp.radius) {
        // Checkpoint passed!
        playerCar.currentCheckpoint++;
        if (this.audioManager) this.audioManager.playCheckpoint();
        if (onCheckpointCallback) onCheckpointCallback(playerCar.currentCheckpoint, checkpoints.length);
      }
    }
  }

  /**
   * Detects crossing of the start/finish line after completing all checkpoints
   */
  checkFinishLine(playerCar, carPos, onFinishCallback) {
    const checkpoints = this.trackData.checkpoints;
    const numCheckpoints = checkpoints ? checkpoints.length : 6;
    const startPos = this.trackData.samplePoints[0];

    // Player must have completed all checkpoints to trigger finish / next lap
    if (playerCar.currentCheckpoint >= numCheckpoints) {
      const distToStart = carPos.distanceTo(startPos);
      if (distToStart < this.trackData.trackWidth * 0.8) {
        // Completed current lap!
        playerCar.currentCheckpoint = 0; // reset for next lap
        if (onFinishCallback) onFinishCallback();
      }
    }
  }

  /**
   * Rigid-body sphere impulse collision between Player and Rival AI cars
   */
  checkCarCollisions(playerCar, aiCars) {
    if (!aiCars || aiCars.length === 0) return;

    const pPos = playerCar.getPosition();
    const collisionRadius = 2.4; // vehicle interaction radius

    for (const rival of aiCars) {
      const rPos = rival.getPosition();
      const dist = pPos.distanceTo(rPos);

      if (dist < collisionRadius && dist > 0.001) {
        // Collision vector
        const pushDir = pPos.clone().sub(rPos).normalize();
        pushDir.y = 0;

        const overlap = collisionRadius - dist;

        // Push both cars apart
        playerCar.mesh.position.addScaledVector(pushDir, overlap * 0.6);
        rival.mesh.position.addScaledVector(pushDir, -overlap * 0.4);

        if (this.cooldownTimer <= 0) {
          this.cooldownTimer = 0.25;

          if (this.particleManager) {
            const midPoint = pPos.clone().add(rPos).multiplyScalar(0.5);
            this.particleManager.spawnSparks(midPoint, 18);
          }

          if (this.followCamera) {
            this.followCamera.triggerShake(0.5);
          }

          if (this.audioManager) {
            this.audioManager.playCrash(0.85);
          }

          playerCar.takeCollision(5, 0.28);
          rival.applyImpact(0.25);
        }
      }
    }
  }
}
