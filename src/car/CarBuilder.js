import * as THREE from 'three';

/**
 * CarBuilder.js
 * Procedural 3D Sports Car Generator using Three.js Geometries & PBR Materials.
 *
 * Computer Graphics Concepts:
 * - Hierarchical Scene Graph: Chassis -> Cockpit, Wheels (Pivots & Spin Groups), Wing, Lights
 * - PBR Shading (Physically Based Rendering): MeshStandardMaterial with roughness, metalness, clearcoat
 * - Procedural compound shapes assembled through transformations (translation, rotation, scale)
 * - Emissive materials for LED headlights and dynamic glowing brake lights
 */

export class CarBuilder {
  /**
   * Constructs a high-detail sports car mesh hierarchy
   * @param {Object} options Custom options: primaryColor, style, etc.
   * @returns {Object} { carGroup, wheels: { fl, fr, rl, rr }, steerPivots: [flPivot, frPivot], brakeLights, exhaustPipes: [leftExhaust, rightExhaust], headlights }
   */
  static buildSportsCar(options = {}) {
    const primaryColor = options.primaryColor || 0xe62232;
    const accentColor = options.accentColor || 0x111111;
    const wheelRimsColor = options.rimsColor || 0xdddddd;

    const carGroup = new THREE.Group();
    carGroup.name = 'SportsCar';

    // ==========================================
    // 1. MATERIALS (Physically-Based Materials)
    // ==========================================
    // Glossy clearcoat car paint
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: primaryColor,
      metalness: 0.6,
      roughness: 0.2,
      envMapIntensity: 1.5,
    });

    // Dark carbon fiber / matte trim
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.2,
      roughness: 0.7,
    });

    // Tinted reflective glass
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x111622,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    // Chrome / metallic alloy
    const alloyMaterial = new THREE.MeshStandardMaterial({
      color: wheelRimsColor,
      metalness: 0.85,
      roughness: 0.15,
    });

    // Rubber tires
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Brake caliper (Racing red)
    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: 0xd91424,
      metalness: 0.5,
      roughness: 0.3,
    });

    // Headlights (Ice-blue emissive)
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x90e0ef,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });

    // Tail lights (Bright red emissive)
    const tailLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0xff0022,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    // Interior cockpit dark material
    const interiorMaterial = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.9,
    });

    // ==========================================
    // 2. CHASSIS & BODYWORK
    // ==========================================
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'CarBody';
    carGroup.add(bodyGroup);

    // Main lower chassis
    const lowerBodyGeo = new THREE.BoxGeometry(1.9, 0.45, 4.3);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMaterial);
    lowerBody.position.y = 0.42;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    bodyGroup.add(lowerBody);

    // Front wedge nose / hood scoop
    const hoodGeo = new THREE.BoxGeometry(1.82, 0.22, 1.4);
    const hood = new THREE.Mesh(hoodGeo, paintMaterial);
    hood.position.set(0, 0.58, 1.35);
    hood.rotation.x = 0.08;
    hood.castShadow = true;
    bodyGroup.add(hood);

    // Front aerodynamic splitter / chin
    const splitterGeo = new THREE.BoxGeometry(1.95, 0.08, 0.5);
    const splitter = new THREE.Mesh(splitterGeo, trimMaterial);
    splitter.position.set(0, 0.22, 2.15);
    bodyGroup.add(splitter);

    // Front radiator grille intake
    const grilleGeo = new THREE.BoxGeometry(1.4, 0.2, 0.1);
    const grille = new THREE.Mesh(grilleGeo, trimMaterial);
    grille.position.set(0, 0.34, 2.16);
    bodyGroup.add(grille);

    // Side skirts (Left & Right)
    const skirtGeo = new THREE.BoxGeometry(0.1, 0.12, 2.3);
    const leftSkirt = new THREE.Mesh(skirtGeo, trimMaterial);
    leftSkirt.position.set(-0.95, 0.22, 0);
    const rightSkirt = new THREE.Mesh(skirtGeo, trimMaterial);
    rightSkirt.position.set(0.95, 0.22, 0);
    bodyGroup.add(leftSkirt, rightSkirt);

    // Rear diffuser (aerodynamic underbody channels)
    const diffuserGeo = new THREE.BoxGeometry(1.85, 0.16, 0.6);
    const diffuser = new THREE.Mesh(diffuserGeo, trimMaterial);
    diffuser.position.set(0, 0.24, -2.1);
    diffuser.rotation.x = -0.15;
    bodyGroup.add(diffuser);

    // ==========================================
    // 3. CABIN & GREENHOUSE (Roof, Windows)
    // ==========================================
    const cabinGroup = new THREE.Group();
    cabinGroup.position.set(0, 0.85, -0.2);

    // Cabin roof top
    const roofGeo = new THREE.BoxGeometry(1.35, 0.45, 1.9);
    const roof = new THREE.Mesh(roofGeo, paintMaterial);
    roof.position.y = 0.05;
    roof.castShadow = true;
    cabinGroup.add(roof);

    // Front windshield (angled forward)
    const windshieldGeo = new THREE.BoxGeometry(1.36, 0.5, 0.08);
    const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
    windshield.position.set(0, 0.02, 0.98);
    windshield.rotation.x = -0.55;
    cabinGroup.add(windshield);

    // Rear rear-window (sloping fastback)
    const rearWindowGeo = new THREE.BoxGeometry(1.34, 0.52, 0.08);
    const rearWindow = new THREE.Mesh(rearWindowGeo, glassMaterial);
    rearWindow.position.set(0, 0.04, -0.98);
    rearWindow.rotation.x = 0.55;
    cabinGroup.add(rearWindow);

    // Side windows (Left and Right)
    const sideWinGeo = new THREE.BoxGeometry(0.06, 0.4, 1.7);
    const leftWin = new THREE.Mesh(sideWinGeo, glassMaterial);
    leftWin.position.set(-0.68, 0.02, 0);
    const rightWin = new THREE.Mesh(sideWinGeo, glassMaterial);
    rightWin.position.set(0.68, 0.02, 0);
    cabinGroup.add(leftWin, rightWin);

    // Roof air intake scoop
    const scoopGeo = new THREE.BoxGeometry(0.4, 0.1, 0.6);
    const scoop = new THREE.Mesh(scoopGeo, trimMaterial);
    scoop.position.set(0, 0.32, 0.2);
    cabinGroup.add(scoop);

    bodyGroup.add(cabinGroup);

    // Racing center stripe
    const stripeGeo = new THREE.BoxGeometry(0.25, 0.02, 4.28);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.66, 0.05);
    bodyGroup.add(stripe);

    // ==========================================
    // 4. REAR GT SPOILER / WING
    // ==========================================
    const spoilerGroup = new THREE.Group();
    spoilerGroup.position.set(0, 0.9, -1.9);

    // Main horizontal wing blade
    const wingBladeGeo = new THREE.BoxGeometry(1.9, 0.06, 0.45);
    const wingBlade = new THREE.Mesh(wingBladeGeo, trimMaterial);
    wingBlade.rotation.x = 0.1;
    wingBlade.castShadow = true;
    spoilerGroup.add(wingBlade);

    // Left & Right aerodynamic wing endplates
    const endplateGeo = new THREE.BoxGeometry(0.04, 0.25, 0.48);
    const leftPlate = new THREE.Mesh(endplateGeo, paintMaterial);
    leftPlate.position.set(-0.95, 0, 0);
    const rightPlate = new THREE.Mesh(endplateGeo, paintMaterial);
    rightPlate.position.set(0.95, 0, 0);
    spoilerGroup.add(leftPlate, rightPlate);

    // Vertical mounting stanchions
    const strutGeo = new THREE.BoxGeometry(0.06, 0.35, 0.15);
    const leftStrut = new THREE.Mesh(strutGeo, trimMaterial);
    leftStrut.position.set(-0.55, -0.16, 0);
    const rightStrut = new THREE.Mesh(strutGeo, trimMaterial);
    rightStrut.position.set(0.55, -0.16, 0);
    spoilerGroup.add(leftStrut, rightStrut);

    bodyGroup.add(spoilerGroup);

    // Side mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.22, 0.1, 0.15);
    const leftMirror = new THREE.Mesh(mirrorGeo, trimMaterial);
    leftMirror.position.set(-1.0, 0.8, 0.5);
    const rightMirror = new THREE.Mesh(mirrorGeo, trimMaterial);
    rightMirror.position.set(1.0, 0.8, 0.5);
    bodyGroup.add(leftMirror, rightMirror);

    // ==========================================
    // 5. LIGHTS (Headlights & Taillights)
    // ==========================================
    // Headlight strips
    const headlightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.12);
    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    leftHeadlight.position.set(-0.65, 0.52, 2.12);
    leftHeadlight.rotation.y = -0.15;

    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    rightHeadlight.position.set(0.65, 0.52, 2.12);
    rightHeadlight.rotation.y = 0.15;
    bodyGroup.add(leftHeadlight, rightHeadlight);

    // Dynamic brake/tail lights
    const tailLightGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
    const leftTail = new THREE.Mesh(tailLightGeo, tailLightMaterial);
    leftTail.position.set(-0.65, 0.55, -2.14);

    const rightTail = new THREE.Mesh(tailLightGeo, tailLightMaterial);
    rightTail.position.set(0.65, 0.55, -2.14);
    bodyGroup.add(leftTail, rightTail);

    // Center full-width brake strip
    const centerBrakeGeo = new THREE.BoxGeometry(0.8, 0.04, 0.08);
    const centerBrake = new THREE.Mesh(centerBrakeGeo, tailLightMaterial);
    centerBrake.position.set(0, 0.6, -2.14);
    bodyGroup.add(centerBrake);

    // ==========================================
    // 6. EXHAUST PIPES (For Nitro Flames)
    // ==========================================
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 12);
    exhaustGeo.rotateX(Math.PI / 2);
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.2,
    });

    const leftExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    leftExhaust.position.set(-0.45, 0.26, -2.16);

    const rightExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    rightExhaust.position.set(0.45, 0.26, -2.16);
    bodyGroup.add(leftExhaust, rightExhaust);

    // ==========================================
    // 7. WHEEL ASSEMBLIES (Tires, Rims, Calipers)
    // ==========================================
    // Helper to build a wheel with realistic rim and tire
    const buildWheel = (isFront) => {
      const wheelAssembly = new THREE.Group();

      // Tire (Cylinder oriented along X-axis)
      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMaterial);
      tire.castShadow = true;
      wheelAssembly.add(tire);

      // Alloy Rim center
      const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.32, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, alloyMaterial);
      wheelAssembly.add(rim);

      // Rim spokes (5-star sport pattern)
      for (let i = 0; i < 5; i++) {
        const spokeGeo = new THREE.BoxGeometry(0.31, 0.24, 0.05);
        const spoke = new THREE.Mesh(spokeGeo, alloyMaterial);
        spoke.rotation.x = (i * Math.PI) / 2.5;
        wheelAssembly.add(spoke);
      }

      // Brake disc
      const discGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
      discGeo.rotateZ(Math.PI / 2);
      const discMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
      const disc = new THREE.Mesh(discGeo, discMat);
      wheelAssembly.add(disc);

      // Brake Caliper
      const caliperGeo = new THREE.BoxGeometry(0.12, 0.12, 0.1);
      const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
      caliper.position.set(0, 0.18, 0);
      wheelAssembly.add(caliper);

      return wheelAssembly;
    };

    // Positions for 4 wheels
    // Front track width: 1.82m, Wheelbase: 2.7m
    const frontZ = 1.35;
    const rearZ = -1.35;
    const halfTrack = 0.95;
    const wheelY = 0.38;

    // FRONT LEFT WHEEL (Steering Pivot -> Spin Group -> Mesh)
    const flPivot = new THREE.Group();
    flPivot.position.set(-halfTrack, wheelY, frontZ);
    const flWheelSpin = new THREE.Group();
    const flWheel = buildWheel(true);
    flWheelSpin.add(flWheel);
    flPivot.add(flWheelSpin);
    carGroup.add(flPivot);

    // FRONT RIGHT WHEEL
    const frPivot = new THREE.Group();
    frPivot.position.set(halfTrack, wheelY, frontZ);
    const frWheelSpin = new THREE.Group();
    const frWheel = buildWheel(true);
    frWheelSpin.add(frWheel);
    frPivot.add(frWheelSpin);
    carGroup.add(frPivot);

    // REAR LEFT WHEEL
    const rlWheelSpin = new THREE.Group();
    rlWheelSpin.position.set(-halfTrack, wheelY, rearZ);
    const rlWheel = buildWheel(false);
    rlWheelSpin.add(rlWheel);
    carGroup.add(rlWheelSpin);

    // REAR RIGHT WHEEL
    const rrWheelSpin = new THREE.Group();
    rrWheelSpin.position.set(halfTrack, wheelY, rearZ);
    const rrWheel = buildWheel(false);
    rrWheelSpin.add(rrWheel);
    carGroup.add(rrWheelSpin);

    return {
      carGroup,
      bodyGroup,
      materials: {
        paint: paintMaterial,
        trim: trimMaterial,
        glass: glassMaterial,
        tailLight: tailLightMaterial,
        headlight: headlightMaterial,
      },
      wheels: {
        fl: flWheelSpin,
        fr: frWheelSpin,
        rl: rlWheelSpin,
        rr: rrWheelSpin,
      },
      steerPivots: [flPivot, frPivot],
      brakeLights: [leftTail, rightTail, centerBrake],
      tailLightMaterial,
      exhaustPipes: [leftExhaust, rightExhaust],
      headlights: [leftHeadlight, rightHeadlight],
    };
  }

  /**
   * Updates paint color dynamically (e.g., in Garage or Car Select)
   */
  static setCarColor(carData, hexColor) {
    if (carData && carData.materials && carData.materials.paint) {
      carData.materials.paint.color.setHex(hexColor);
    }
  }

  /**
   * Sets brake light brightness (brighter when braking)
   */
  static setBrakingState(carData, isBraking) {
    if (carData && carData.tailLightMaterial) {
      carData.tailLightMaterial.emissiveIntensity = isBraking ? 2.5 : 0.8;
      carData.tailLightMaterial.color.setHex(isBraking ? 0xff0000 : 0x880000);
    }
  }
}
