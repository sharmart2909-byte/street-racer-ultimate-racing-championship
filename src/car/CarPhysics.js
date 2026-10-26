import * as THREE from 'three';

/**
 * CarPhysics.js
 * Realistic arcade vehicle physics with momentum, drifting, suspension roll,
 * gear simulation, and collision responses.
 *
 * Computer Graphics & Physics Concepts:
 * - Delta-time based Euler numerical integration (frame-rate independent)
 * - Vector math (forward/up vectors, cross products, dot products)
 * - Friction, aerodynamic drag, lateral grip slip angles
 * - Suspension pitch and roll simulation on chassis scene graph
 */

export class CarPhysics {
  constructor(carConfig = {}) {
    // Car performance specifications
    this.topSpeedKmh = carConfig.topSpeedKmh || 240; // in km/h
    this.maxSpeed = this.topSpeedKmh / 3.6; // in m/s (240 km/h ≈ 66.6 m/s)
    this.accelerationRate = carConfig.accelerationRate || 28; // m/s²
    this.brakingRate = carConfig.brakingRate || 40; // m/s²
    this.reverseMaxSpeed = 16; // m/s (~58 km/h)
    this.handling = carConfig.handling || 1.0; // steering agility multiplier
    this.driftFactor = carConfig.driftFactor || 1.0;

    // Dynamic state
    this.speed = 0; // forward/backward linear speed in m/s
    this.steerAngle = 0; // current wheel steering angle in radians
    this.maxSteerAngle = 0.34; // ~19.5 degrees max steer (reduced by ~35% for gentler control)
    this.heading = 0; // rotation around Y axis in radians

    // Drift physics
    this.isDrifting = false;
    this.driftAngle = 0; // angle between heading and velocity
    this.lateralGrip = 0.94; // normal grip
    this.driftGrip = 0.42; // reduced grip during drift
    this.driftScore = 0;

    // Nitro boost
    this.nitroActive = false;
    this.nitroMultiplier = 1.32; // speed & accel multiplier during nitro
    this.nitroTank = 100; // 0 to 100%
    this.nitroDepletionRate = 22; // % per second
    this.nitroRechargeRate = 4; // passive recharge % per sec

    // Suspension simulation (Body pitch and roll angles)
    this.pitch = 0;
    this.roll = 0;

    // Gear simulation for tachometer RPM readout
    this.gear = 1;
    this.rpm = 0.2; // 0 to 1 ratio
  }

  /**
   * Updates car state for this frame
   * @param {number} dt Delta time in seconds
   * @param {Object} input Player input state { throttle, brake, steer, handbrake, nitro }
   * @param {Object} carData Car references (steerPivots, wheels, bodyGroup)
   */
  update(dt, input, carData) {
    if (dt > 0.1) dt = 0.1; // clamp delta time for stability

    // 1. NITRO BOOST LOGIC
    if (input.nitro && this.nitroTank > 5 && this.speed > 5) {
      this.nitroActive = true;
      this.nitroTank = Math.max(0, this.nitroTank - this.nitroDepletionRate * dt);
    } else {
      this.nitroActive = false;
      // Drift boosts nitro faster than passive
      const recharge = this.isDrifting ? this.nitroRechargeRate * 3.5 : this.nitroRechargeRate;
      this.nitroTank = Math.min(100, this.nitroTank + recharge * dt);
    }

    const currentMaxSpeed = this.nitroActive ? this.maxSpeed * this.nitroMultiplier : this.maxSpeed;
    const currentAccel = this.nitroActive ? this.accelerationRate * 1.4 : this.accelerationRate;

    // 2. ACCELERATION / BRAKING / REVERSE
    if (input.throttle > 0) {
      if (this.speed < 0) {
        // Braking while reversing
        this.speed += this.brakingRate * 1.5 * dt;
        if (this.speed > 0) this.speed = 0;
      } else {
        // Accelerating forward
        // Power curve: high torque at low speeds, tapering toward top speed
        const speedRatio = Math.min(1, Math.abs(this.speed) / currentMaxSpeed);
        const torqueMult = 1.0 - 0.5 * Math.pow(speedRatio, 1.8);
        this.speed += currentAccel * torqueMult * input.throttle * dt;
        if (this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
      }
    } else if (input.brake > 0) {
      if (this.speed > 0.5) {
        // Foot brake
        this.speed -= this.brakingRate * input.brake * dt;
        if (this.speed < 0) this.speed = 0;
      } else {
        // Reverse
        this.speed -= this.accelerationRate * 0.5 * input.brake * dt;
        if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
      }
    } else {
      // Natural rolling resistance and aerodynamic drag
      const drag = 1.8 + Math.abs(this.speed) * 0.04;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - drag * dt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + drag * dt);
      }
    }

    // 3. STEERING & DRIFT LOGIC
    // Reduce steering sensitivity smoothly as speed increases to maintain high-speed stability
    const speedRatio = Math.min(1, Math.abs(this.speed) / this.maxSpeed);
    const speedSteerFactor = 1.0 / (1.0 + Math.pow(speedRatio, 1.1) * 2.8);
    const targetSteer = input.steer * this.maxSteerAngle * speedSteerFactor;

    // Smooth progressive steering response (frame-rate independent via delta time)
    // Slower, progressive ramp-up when turning in (2.8); smooth self-centering spring when released (5.2)
    // When quickly countering left-to-right, transition through center without snapping (3.8)
    const isReversingSign = (targetSteer * this.steerAngle < 0);
    const isReturning = Math.abs(targetSteer) < Math.abs(this.steerAngle) || targetSteer === 0;
    const steerLerpSpeed = isReturning ? 5.2 : (isReversingSign ? 3.8 : 2.8);
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, steerLerpSpeed * dt);

    // Drift conditions:
    // Only allow drifting when moving forward above 10 m/s (~36 km/h)
    // Triggered intentionally via handbrake/drift button, or high-speed intentional power slide
    const isForwardAtSpeed = this.speed > 10;
    const isHandbrakeDrift = input.handbrake && isForwardAtSpeed && Math.abs(this.steerAngle) > 0.04;
    const isHardTurn = isForwardAtSpeed && this.speed > 22 && Math.abs(input.steer) > 0.8 && Math.abs(this.steerAngle) > this.maxSteerAngle * 0.75;

    if (isHandbrakeDrift || isHardTurn) {
      this.isDrifting = true;
      // Drift yaw oversteer: gentle, controllable angle that avoids sudden sideways snaps
      const driftDirection = this.steerAngle > 0 ? 1 : -1;
      const targetDrift = driftDirection * 0.10 * this.driftFactor; // reduced from 0.25 to 0.10 rad (~5.7 deg)
      this.driftAngle += (targetDrift - this.driftAngle) * Math.min(1.0, 3.2 * dt);
      // Gentle speed scrub during drift
      this.speed = Math.max(0, this.speed - 2.5 * dt);
      this.driftScore += Math.floor(Math.abs(this.speed) * dt * 25);
    } else {
      this.isDrifting = false;
      this.driftAngle += (0 - this.driftAngle) * Math.min(1.0, 5.0 * dt);
    }

    // 4. HEADING INTEGRATION (Turn car based on steer angle and speed)
    // Kinematic model with dynamic understeer damping at high speeds
    // - Steer Left (steerAngle > 0): turnRate is positive -> heading increases -> turns Left
    // - Steer Right (steerAngle < 0): turnRate is negative -> heading decreases -> turns Right
    if (Math.abs(this.speed) > 0.1) {
      if (this.speed > 0) {
        // Forward motion: understeer curve prevents excessive angular velocity at high speed
        const understeer = 1.0 + Math.pow(speedRatio, 1.2) * 0.85;
        const maxTurnRate = 1.75; // clamped to ~100 deg/s max (reduced from 2.8 rad/s)
        let turnRate = ((this.speed / 2.7) / understeer) * Math.tan(this.steerAngle) * this.handling;
        turnRate = Math.max(-maxTurnRate, Math.min(maxTurnRate, turnRate));
        const driftTurnBonus = this.isDrifting ? 1.15 : 1.0; // reduced bonus from 1.35 to 1.15
        this.heading += turnRate * driftTurnBonus * dt;
      } else {
        // Reverse motion: natural kinematics capped to prevent violent spins
        const maxReverseTurnRate = 1.2; // rad/s
        let turnRate = (this.speed / 2.7) * Math.tan(this.steerAngle) * this.handling;
        turnRate = Math.max(-maxReverseTurnRate, Math.min(maxReverseTurnRate, turnRate));
        this.heading += turnRate * dt;
      }
    }

    // 5. SUSPENSION ROLL & PITCH SIMULATION
    // Pitch: nose up when accelerating, nose down when braking
    let targetPitch = 0;
    if (input.throttle > 0 && this.speed >= 0) targetPitch = -0.04;
    else if (input.brake > 0 && this.speed > 0) targetPitch = 0.06;
    this.pitch += (targetPitch - this.pitch) * 8.0 * dt;

    // Roll: body leans outside the turn (centrifugal force)
    const targetRoll = (this.steerAngle * speedRatio) * 0.12;
    this.roll += (targetRoll - this.roll) * 8.0 * dt;

    if (carData && carData.bodyGroup) {
      carData.bodyGroup.rotation.x = this.pitch;
      carData.bodyGroup.rotation.z = this.roll;
    }

    // 6. ANIMATE WHEELS (Steer pivots & rolling rotation)
    if (carData) {
      // Front steer pivots: steerAngle < 0 points left, steerAngle > 0 points right
      if (carData.steerPivots) {
        carData.steerPivots[0].rotation.y = this.steerAngle;
        carData.steerPivots[1].rotation.y = this.steerAngle;
      }

      // Roll all 4 wheels based on travel distance
      // angular velocity = v / r (radius ≈ 0.38m)
      const wheelRotation = (this.speed / 0.38) * dt;
      if (carData.wheels) {
        carData.wheels.fl.rotation.x += wheelRotation;
        carData.wheels.fr.rotation.x += wheelRotation;
        carData.wheels.rl.rotation.x += wheelRotation;
        carData.wheels.rr.rotation.x += wheelRotation;
      }
    }

    // 7. GEAR & RPM COMPUTATION (For HUD)
    this.updateGears();
  }

  /**
   * Calculates gear (1-5) and simulated engine RPM for tachometer
   */
  updateGears() {
    const kmh = Math.abs(this.getSpeedKmh());
    if (kmh < 1) {
      this.gear = 1;
      this.rpm = 0.15;
    } else if (kmh < 45) {
      this.gear = 1;
      this.rpm = 0.2 + (kmh / 45) * 0.75;
    } else if (kmh < 95) {
      this.gear = 2;
      this.rpm = 0.3 + ((kmh - 45) / 50) * 0.65;
    } else if (kmh < 155) {
      this.gear = 3;
      this.rpm = 0.35 + ((kmh - 95) / 60) * 0.6;
    } else if (kmh < 215) {
      this.gear = 4;
      this.rpm = 0.4 + ((kmh - 155) / 60) * 0.55;
    } else {
      this.gear = 5;
      this.rpm = Math.min(1.0, 0.45 + ((kmh - 215) / 90) * 0.5);
    }
  }

  /**
   * Applies an impulse reaction when hitting a barrier or rival
   * @param {number} speedLossFrac fraction of speed lost (e.g. 0.35)
   */
  applyImpact(speedLossFrac = 0.3) {
    this.speed *= (1 - speedLossFrac);
    // Slight counter-steer jitter
    this.heading += (Math.random() - 0.5) * 0.08;
  }

  getSpeedKmh() {
    return this.speed * 3.6;
  }

  getSpeedRatio() {
    return Math.min(1, Math.abs(this.speed) / this.maxSpeed);
  }

  reset(x = 0, y = 0, z = 0, heading = 0) {
    this.speed = 0;
    this.steerAngle = 0;
    this.heading = heading;
    this.driftAngle = 0;
    this.isDrifting = false;
    this.pitch = 0;
    this.roll = 0;
  }
}
