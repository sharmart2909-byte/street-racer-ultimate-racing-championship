import * as THREE from 'three';
import { CarBuilder } from './CarBuilder.js';

/**
 * AICar.js
 * Rival AI racer that navigates track splines, maintains race speeds,
 * maneuvers around bends, spins wheels, and participates in vehicle collisions.
 *
 * Computer Graphics Concepts:
 * - Parametric curve evaluation: Spline progress `u` [0, 1]
 * - Tangent & normal vector calculations for path alignment
 * - Autonomous agent steering along spline trajectories
 */

export class AICar {
  constructor(scene, trackCurve, options = {}) {
    this.scene = scene;
    this.trackCurve = trackCurve;

    this.name = options.name || 'Rival Racer';
    this.primaryColor = options.primaryColor || 0x00d2ff;
    this.targetSpeedKmh = options.targetSpeedKmh || 190;
    this.speed = (this.targetSpeedKmh / 3.6); // in m/s
    this.laneOffset = options.laneOffset !== undefined ? options.laneOffset : (Math.random() * 4 - 2);

    // Track progression (0.0 to 1.0 along spline)
    this.progressU = options.initialProgress || 0.05;
    this.trackLength = this.trackCurve ? this.trackCurve.getLength() : 1000;

    // 3D Car Model
    this.carData = CarBuilder.buildSportsCar({
      primaryColor: this.primaryColor,
      accentColor: 0x0a0a0a,
      rimsColor: 0xcccccc,
    });
    this.mesh = this.carData.carGroup;
    this.scene.add(this.mesh);

    // Collision Bounding Box
    this.collider = new THREE.Box3();
    this.colliderSize = new THREE.Vector3(2.0, 1.2, 4.4);

    // Positioning
    this.updatePositionOnTrack(0);
  }

  /**
   * Updates AI position along track spline
   * @param {number} dt Delta time
   */
  update(dt) {
    if (!this.trackCurve || this.trackLength <= 0) return;

    // Advance progress along spline
    const distanceStep = this.speed * dt;
    this.progressU += distanceStep / this.trackLength;
    if (this.progressU > 1.0) {
      this.progressU -= 1.0; // loop track
    }

    this.updatePositionOnTrack(dt);

    // Spin wheels
    const wheelRot = (this.speed / 0.38) * dt;
    if (this.carData.wheels) {
      this.carData.wheels.fl.rotation.x += wheelRot;
      this.carData.wheels.fr.rotation.x += wheelRot;
      this.carData.wheels.rl.rotation.x += wheelRot;
      this.carData.wheels.rr.rotation.x += wheelRot;
    }

    // Update bounding box
    this.collider.setFromCenterAndSize(
      this.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
      this.colliderSize
    );
  }

  /**
   * Evaluates spline point, tangent, and normal to place vehicle in lane
   */
  updatePositionOnTrack(dt) {
    const u = Math.min(0.999, Math.max(0.001, this.progressU));
    const point = this.trackCurve.getPointAt(u);
    const tangent = this.trackCurve.getTangentAt(u).normalize();

    // Normal vector perpendicular to tangent on XZ plane
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Position with lane offset
    const finalPos = point.clone().add(normal.clone().multiplyScalar(this.laneOffset));
    this.mesh.position.set(finalPos.x, point.y, finalPos.z);

    // Smooth heading orientation
    const lookTarget = finalPos.clone().add(tangent.clone().multiplyScalar(10));
    this.mesh.lookAt(lookTarget);
  }

  /**
   * Collision response when hitting player or barrier
   */
  applyImpact(speedReduction = 0.25) {
    this.speed = Math.max(15, this.speed * (1 - speedReduction));
    // Lane twitch
    this.laneOffset += (Math.random() - 0.5) * 1.5;
    this.laneOffset = Math.max(-4, Math.min(4, this.laneOffset));
  }

  getPosition() {
    return this.mesh.position;
  }

  dispose() {
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
