import * as THREE from 'three';

/**
 * TrackBuilder.js
 * Procedural continuous 3D road generator and environmental scenery builder.
 *
 * Computer Graphics Concepts:
 * - Parametric ribbon extrusion along CatmullRomCurve3
 * - Frenet-Serret frames (Tangent, Normal, Binormal) for road orientation
 * - Procedural UV texture coordinate mapping for seamless asphalt & stripes
 * - Instanced/hierarchical environment meshes (buildings, trees, lights, grandstands)
 * - Start/Finish gantry and holographic checkpoint gates
 */

export class TrackBuilder {
  /**
   * Builds the complete track world: road surface, kerbs, barriers, arches, scenery
   * @param {THREE.Scene} scene
   * @param {THREE.CatmullRomCurve3} spline
   * @param {Object} levelData
   * @returns {Object} { trackGroup, spline, checkpoints, roadSegments, samplePoints }
   */
  static buildTrack(scene, spline, levelData) {
    const trackGroup = new THREE.Group();
    trackGroup.name = 'TrackWorld';
    scene.add(trackGroup);

    const trackWidth = levelData.trackWidth || 14.0;
    const halfWidth = trackWidth / 2;
    const numSegments = 260; // smooth curve subdivision

    // 1. SAMPLE SPLINE POINTS & FRENET FRAMES
    const samplePoints = [];
    const tangents = [];
    const normals = [];

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= numSegments; i++) {
      const u = i / numSegments;
      const point = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u).normalize();
      // Normal is perpendicular to tangent on XZ plane
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      samplePoints.push(point);
      tangents.push(tangent);
      normals.push(normal);
    }

    // 2. GENERATE ROAD SURFACE GEOMETRY (Extruded Ribbon)
    const roadVertices = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    // Kerbs (Rumble strips) vertices
    const leftKerbVerts = [];
    const rightKerbVerts = [];
    const kerbIndices = [];

    const kerbWidth = 1.0;

    for (let i = 0; i <= numSegments; i++) {
      const p = samplePoints[i];
      const n = normals[i];

      // Road left and right boundary vertices
      const leftRoad = p.clone().sub(n.clone().multiplyScalar(halfWidth));
      const rightRoad = p.clone().add(n.clone().multiplyScalar(halfWidth));

      // Slightly lift above ground to avoid z-fighting
      leftRoad.y += 0.05;
      rightRoad.y += 0.05;

      roadVertices.push(leftRoad.x, leftRoad.y, leftRoad.z);
      roadVertices.push(rightRoad.x, rightRoad.y, rightRoad.z);

      roadNormals.push(0, 1, 0, 0, 1, 0);

      const v = (i / numSegments) * 50; // repeat road texture 50 times
      roadUvs.push(0, v, 1, v);

      // Kerb outer edges
      const outerLeftKerb = leftRoad.clone().sub(n.clone().multiplyScalar(kerbWidth));
      const outerRightKerb = rightRoad.clone().add(n.clone().multiplyScalar(kerbWidth));
      outerLeftKerb.y += 0.08;
      outerRightKerb.y += 0.08;

      leftKerbVerts.push(outerLeftKerb.x, outerLeftKerb.y, outerLeftKerb.z);
      leftKerbVerts.push(leftRoad.x, leftRoad.y, leftRoad.z);

      rightKerbVerts.push(rightRoad.x, rightRoad.y, rightRoad.z);
      rightKerbVerts.push(outerRightKerb.x, outerRightKerb.y, outerRightKerb.z);
    }

    // Construct quad indices
    for (let i = 0; i < numSegments; i++) {
      const row1 = i * 2;
      const row2 = (i + 1) * 2;

      // Road quad (two triangles)
      roadIndices.push(row1, row1 + 1, row2);
      roadIndices.push(row1 + 1, row2 + 1, row2);

      // Kerb quads
      kerbIndices.push(row1, row1 + 1, row2);
      kerbIndices.push(row1 + 1, row2 + 1, row2);
    }

    // Create Road Mesh
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);

    // Procedural asphalt shader/material
    const roadColor = levelData.theme === 'neon_night' ? 0x161a24 : 0x24272c;
    const roadMat = new THREE.MeshStandardMaterial({
      color: roadColor,
      roughness: 0.85,
      metalness: 0.1,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    trackGroup.add(roadMesh);

    // 3. ROAD MARKINGS (Dashed Center Line & Side Yellow Lines)
    this.createRoadMarkings(trackGroup, samplePoints, normals, halfWidth, numSegments, levelData);

    // 4. KERBS / RUMBLE STRIPS (Red and White alternating pattern)
    this.createKerbs(trackGroup, leftKerbVerts, rightKerbVerts, kerbIndices);

    // 5. GUARDRAIL BARRIERS (Left and Right continuous metal crash rails)
    this.createBarriers(trackGroup, samplePoints, normals, halfWidth + kerbWidth, numSegments, levelData);

    // 6. START / FINISH LINE & GANTRY
    this.createStartFinishGantry(trackGroup, samplePoints[0], tangents[0], normals[0], trackWidth);

    // 7. CHECKPOINT GATES (Distributed along spline)
    const checkpoints = this.createCheckpoints(trackGroup, spline, levelData);

    // 8. PROCEDURAL SCENERY & SURROUNDINGS
    this.createEnvironmentScenery(trackGroup, samplePoints, tangents, normals, levelData);

    // 9. SURROUNDING TERRAIN GROUND
    this.createGround(trackGroup, levelData);

    return {
      trackGroup,
      spline,
      checkpoints,
      samplePoints,
      trackWidth,
      halfWidth: halfWidth + kerbWidth,
      totalLength: spline.getLength(),
    };
  }

  /**
   * Creates center dashed line and solid side lines
   */
  static createRoadMarkings(trackGroup, samplePoints, normals, halfWidth, numSegments, levelData) {
    const isNeon = levelData.theme === 'neon_night';

    // Center dashed stripe
    const dashMat = new THREE.MeshBasicMaterial({
      color: isNeon ? 0x00f3ff : 0xffffff,
    });

    const sideMat = new THREE.MeshBasicMaterial({
      color: isNeon ? 0xff0055 : 0xffcc00,
    });

    for (let i = 0; i < numSegments; i += 2) {
      const p1 = samplePoints[i];
      const p2 = samplePoints[(i + 1) % numSegments];
      const n = normals[i];

      // Center dash
      const dashGeo = new THREE.PlaneGeometry(0.35, p1.distanceTo(p2));
      dashGeo.rotateX(-Math.PI / 2);
      const dashMesh = new THREE.Mesh(dashGeo, dashMat);
      dashMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
      dashMesh.position.y += 0.08;
      dashMesh.lookAt(p2.x, dashMesh.position.y, p2.z);
      trackGroup.add(dashMesh);

      // Side outer lines
      [-1, 1].forEach((side) => {
        const sideP1 = p1.clone().add(n.clone().multiplyScalar((halfWidth - 0.5) * side));
        const sideP2 = p2.clone().add(n.clone().multiplyScalar((halfWidth - 0.5) * side));
        const sideGeo = new THREE.PlaneGeometry(0.25, sideP1.distanceTo(sideP2));
        sideGeo.rotateX(-Math.PI / 2);
        const sideLine = new THREE.Mesh(sideGeo, sideMat);
        sideLine.position.copy(sideP1).add(sideP2).multiplyScalar(0.5);
        sideLine.position.y += 0.08;
        sideLine.lookAt(sideP2.x, sideLine.position.y, sideP2.z);
        trackGroup.add(sideLine);
      });
    }
  }

  /**
   * Alternating Red & White Rumble Kerbs
   */
  static createKerbs(trackGroup, leftVerts, rightVerts, indices) {
    const kerbMatRed = new THREE.MeshStandardMaterial({ color: 0xd91424, roughness: 0.6 });
    const kerbMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    const leftGeo = new THREE.BufferGeometry();
    leftGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftVerts, 3));
    leftGeo.setIndex(indices);
    leftGeo.computeVertexNormals();

    const rightGeo = new THREE.BufferGeometry();
    rightGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightVerts, 3));
    rightGeo.setIndex(indices);
    rightGeo.computeVertexNormals();

    trackGroup.add(new THREE.Mesh(leftGeo, kerbMatRed));
    trackGroup.add(new THREE.Mesh(rightGeo, kerbMatWhite));
  }

  /**
   * Continuous metal guardrails / crash barriers
   */
  static createBarriers(trackGroup, samplePoints, normals, barrierOffset, numSegments, levelData) {
    const isNeon = levelData.theme === 'neon_night';
    const barrierMat = new THREE.MeshStandardMaterial({
      color: isNeon ? 0x00f3ff : 0x8899aa,
      emissive: isNeon ? 0x007799 : 0x000000,
      emissiveIntensity: isNeon ? 0.6 : 0,
      metalness: 0.8,
      roughness: 0.3,
    });

    const railGeo = new THREE.BoxGeometry(0.2, 0.65, 3.8);

    for (let i = 0; i < numSegments; i += 2) {
      const p = samplePoints[i];
      const n = normals[i];

      [-1, 1].forEach((side) => {
        const railPos = p.clone().add(n.clone().multiplyScalar((barrierOffset + 0.3) * side));
        const rail = new THREE.Mesh(railGeo, barrierMat);
        rail.position.set(railPos.x, p.y + 0.45, railPos.z);

        const nextP = samplePoints[(i + 2) % numSegments];
        const nextRailPos = nextP.clone().add(normals[(i + 2) % numSegments].clone().multiplyScalar((barrierOffset + 0.3) * side));
        rail.lookAt(nextRailPos.x, rail.position.y, nextRailPos.z);
        rail.castShadow = true;
        trackGroup.add(rail);
      });
    }
  }

  /**
   * Start / Finish Gantry (Overhead truss bridge with checkered banner)
   */
  static createStartFinishGantry(trackGroup, pos, tangent, normal, trackWidth) {
    const gantry = new THREE.Group();
    gantry.position.copy(pos);

    const archWidth = trackWidth + 4;
    const archHeight = 6.5;

    // Truss columns (Left & Right)
    const colGeo = new THREE.BoxGeometry(0.7, archHeight, 0.7);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 });

    const leftCol = new THREE.Mesh(colGeo, metalMat);
    leftCol.position.copy(normal.clone().multiplyScalar(-archWidth / 2)).add(new THREE.Vector3(0, archHeight / 2, 0));

    const rightCol = new THREE.Mesh(colGeo, metalMat);
    rightCol.position.copy(normal.clone().multiplyScalar(archWidth / 2)).add(new THREE.Vector3(0, archHeight / 2, 0));

    // Overhead beam
    const beamGeo = new THREE.BoxGeometry(archWidth + 1, 1.2, 0.8);
    const beam = new THREE.Mesh(beamGeo, metalMat);
    beam.position.set(0, archHeight, 0);

    // Banner board
    const bannerGeo = new THREE.BoxGeometry(archWidth - 2, 0.9, 0.2);
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x004466,
      emissiveIntensity: 0.5,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, archHeight, 0.4);

    gantry.add(leftCol, rightCol, beam, banner);

    // Align gantry rotation with track direction
    const lookTarget = pos.clone().add(tangent.clone().multiplyScalar(10));
    gantry.lookAt(lookTarget);

    trackGroup.add(gantry);

    // Checkered start line decal on asphalt
    const startLineGeo = new THREE.PlaneGeometry(trackWidth, 2.5);
    startLineGeo.rotateX(-Math.PI / 2);
    const startMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });
    const startLine = new THREE.Mesh(startLineGeo, startMat);
    startLine.position.set(pos.x, pos.y + 0.09, pos.z);
    startLine.lookAt(lookTarget.x, startLine.position.y, lookTarget.z);
    trackGroup.add(startLine);
  }

  /**
   * Checkpoint holographic arches around the course
   */
  static createCheckpoints(trackGroup, spline, levelData) {
    const checkpoints = [];
    const numCheckpoints = 6;
    const trackWidth = levelData.trackWidth || 14.0;

    for (let i = 1; i <= numCheckpoints; i++) {
      const u = i / (numCheckpoints + 1);
      const pos = spline.getPointAt(u);
      const tangent = spline.getTangentAt(u).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Checkpoint visual gate
      const gateGroup = new THREE.Group();
      gateGroup.position.copy(pos);

      const postGeo = new THREE.CylinderGeometry(0.25, 0.25, 5.5);
      const gateMat = new THREE.MeshStandardMaterial({
        color: 0x00f3ff,
        emissive: 0x00f3ff,
        emissiveIntensity: 1.0,
      });

      const leftPost = new THREE.Mesh(postGeo, gateMat);
      leftPost.position.copy(normal.clone().multiplyScalar(-(trackWidth / 2 + 1))).add(new THREE.Vector3(0, 2.75, 0));

      const rightPost = new THREE.Mesh(postGeo, gateMat);
      rightPost.position.copy(normal.clone().multiplyScalar(trackWidth / 2 + 1)).add(new THREE.Vector3(0, 2.75, 0));

      // Overhead laser beam
      const laserGeo = new THREE.CylinderGeometry(0.08, 0.08, trackWidth + 2);
      laserGeo.rotateZ(Math.PI / 2);
      const laser = new THREE.Mesh(laserGeo, gateMat);
      laser.position.set(0, 5.4, 0);

      gateGroup.add(leftPost, rightPost, laser);
      gateGroup.lookAt(pos.clone().add(tangent.clone().multiplyScalar(10)));
      trackGroup.add(gateGroup);

      checkpoints.push({
        id: i,
        u,
        position: pos,
        tangent,
        normal,
        radius: trackWidth * 0.7,
        passed: false,
      });
    }

    return checkpoints;
  }

  /**
   * Procedural scenery populated based on level theme
   */
  static createEnvironmentScenery(trackGroup, samplePoints, tangents, normals, levelData) {
    const theme = levelData.theme;
    const numPoints = samplePoints.length;

    if (theme === 'city_day') {
      // Modern skyscrapers and roadside palm trees
      this.populateCityScenery(trackGroup, samplePoints, normals, numPoints, false);
    } else if (theme === 'mountain_sunset') {
      // Rocks, mountain cliffs, bridges, pine trees
      this.populateMountainScenery(trackGroup, samplePoints, normals, numPoints);
    } else if (theme === 'neon_night') {
      // Cyberpunk towers with glowing windows and billboards
      this.populateCityScenery(trackGroup, samplePoints, normals, numPoints, true);
    } else if (theme === 'stadium_championship') {
      // Grandstands, floodlights, tire barriers
      this.populateStadiumScenery(trackGroup, samplePoints, normals, numPoints);
    }
  }

  /**
   * City Buildings, Palm Trees, and Streetlights
   */
  static populateCityScenery(trackGroup, samplePoints, normals, numPoints, isNeon) {
    const buildingColors = isNeon
      ? [0x0d1222, 0x11162b, 0x080c18]
      : [0x4a607a, 0x5c728e, 0x829bb5, 0x3d4e63];

    const windowColors = isNeon
      ? [0x00f3ff, 0xff0055, 0xffaa00, 0x9900ff]
      : [0xfffaed, 0xd0e8ff];

    for (let i = 0; i < numPoints; i += 6) {
      const p = samplePoints[i];
      const n = normals[i];

      [-1, 1].forEach((side) => {
        // Buildings set back from road
        const dist = 28 + Math.random() * 35;
        const bPos = p.clone().add(n.clone().multiplyScalar(dist * side));

        const width = 14 + Math.random() * 16;
        const depth = 14 + Math.random() * 16;
        const height = 30 + Math.random() * 80;

        const bGeo = new THREE.BoxGeometry(width, height, depth);
        const bMat = new THREE.MeshStandardMaterial({
          color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
          metalness: 0.3,
          roughness: 0.6,
        });

        const building = new THREE.Mesh(bGeo, bMat);
        building.position.set(bPos.x, height / 2, bPos.z);
        building.castShadow = true;
        building.receiveShadow = true;
        trackGroup.add(building);

        // Glowing window bands
        if (isNeon || Math.random() > 0.4) {
          const winGeo = new THREE.BoxGeometry(width + 0.2, 0.8, depth + 0.2);
          const winMat = new THREE.MeshStandardMaterial({
            color: windowColors[Math.floor(Math.random() * windowColors.length)],
            emissive: windowColors[Math.floor(Math.random() * windowColors.length)],
            emissiveIntensity: isNeon ? 1.5 : 0.6,
          });
          for (let y = 6; y < height - 6; y += 8 + Math.random() * 6) {
            const winBand = new THREE.Mesh(winGeo, winMat);
            winBand.position.set(bPos.x, y, bPos.z);
            trackGroup.add(winBand);
          }
        }

        // Roadside streetlights
        const lightPos = p.clone().add(n.clone().multiplyScalar((10.5) * side));
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5.0);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(lightPos.x, p.y + 2.5, lightPos.z);
        trackGroup.add(pole);

        // Lamp head
        const lampGeo = new THREE.BoxGeometry(0.4, 0.2, 0.8);
        const lampMat = new THREE.MeshStandardMaterial({
          color: isNeon ? 0x00f3ff : 0xfffaed,
          emissive: isNeon ? 0x00f3ff : 0xfffaed,
          emissiveIntensity: 1.2,
        });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(lightPos.x, p.y + 5.0, lightPos.z);
        trackGroup.add(lamp);
      });
    }
  }

  /**
   * Mountain cliffs, pine trees, rocks
   */
  static populateMountainScenery(trackGroup, samplePoints, normals, numPoints) {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f3822, roughness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2417, roughness: 0.9 });

    for (let i = 0; i < numPoints; i += 5) {
      const p = samplePoints[i];
      const n = normals[i];

      [-1, 1].forEach((side) => {
        const dist = 14 + Math.random() * 25;
        const pos = p.clone().add(n.clone().multiplyScalar(dist * side));

        if (Math.random() > 0.4) {
          // Pine tree
          const treeGroup = new THREE.Group();
          treeGroup.position.set(pos.x, p.y, pos.z);

          const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3.0);
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = 1.5;
          treeGroup.add(trunk);

          // Foliage cones
          for (let f = 0; f < 3; f++) {
            const coneGeo = new THREE.ConeGeometry(2.4 - f * 0.5, 2.8, 8);
            const cone = new THREE.Mesh(coneGeo, pineMat);
            cone.position.y = 3.2 + f * 1.8;
            treeGroup.add(cone);
          }
          trackGroup.add(treeGroup);
        } else {
          // Rock boulder
          const rockGeo = new THREE.DodecahedronGeometry(3 + Math.random() * 4, 1);
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.position.set(pos.x, p.y + 2, pos.z);
          rock.scale.set(1 + Math.random() * 0.8, 0.8 + Math.random() * 1.2, 1 + Math.random() * 0.8);
          trackGroup.add(rock);
        }
      });
    }
  }

  /**
   * Stadium bleachers, floodlight towers, tire stacks
   */
  static populateStadiumScenery(trackGroup, samplePoints, normals, numPoints) {
    const grandstandMat = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.6 });
    const crowdMat = new THREE.MeshStandardMaterial({ color: 0xdd4455, roughness: 0.7 });

    for (let i = 0; i < numPoints; i += 12) {
      const p = samplePoints[i];
      const n = normals[i];

      [-1, 1].forEach((side) => {
        const dist = 22 * side;
        const gPos = p.clone().add(n.clone().multiplyScalar(dist));

        // Grandstand structure (stepped bleachers)
        const stand = new THREE.Group();
        stand.position.set(gPos.x, p.y, gPos.z);

        const baseGeo = new THREE.BoxGeometry(22, 8, 12);
        const base = new THREE.Mesh(baseGeo, grandstandMat);
        base.position.y = 4;
        stand.add(base);

        // Crowd color band
        const crowdGeo = new THREE.BoxGeometry(21.5, 2, 10);
        const crowd = new THREE.Mesh(crowdGeo, crowdMat);
        crowd.position.y = 8.5;
        stand.add(crowd);

        trackGroup.add(stand);

        // Stadium floodlight towers
        if (i % 24 === 0) {
          const towerPos = p.clone().add(n.clone().multiplyScalar(32 * side));
          const poleGeo = new THREE.CylinderGeometry(0.4, 0.8, 22);
          const pole = new THREE.Mesh(poleGeo, grandstandMat);
          pole.position.set(towerPos.x, p.y + 11, towerPos.z);
          trackGroup.add(pole);

          // Floodlight head with glowing panels
          const headGeo = new THREE.BoxGeometry(5, 3, 1);
          const headMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.8,
          });
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.set(towerPos.x, p.y + 22, towerPos.z);
          head.lookAt(p.x, p.y + 2, p.z);
          trackGroup.add(head);
        }
      });
    }
  }

  /**
   * Ground terrain plane
   */
  static createGround(trackGroup, levelData) {
    const groundGeo = new THREE.PlaneGeometry(1400, 1400, 16, 16);
    groundGeo.rotateX(-Math.PI / 2);

    let groundColor = 0x223322;
    if (levelData.theme === 'mountain_sunset') groundColor = 0x2e241c;
    else if (levelData.theme === 'neon_night') groundColor = 0x080b12;
    else if (levelData.theme === 'stadium_championship') groundColor = 0x141a16;

    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    trackGroup.add(ground);
  }
}
