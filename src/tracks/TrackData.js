import * as THREE from 'three';

/**
 * TrackData.js
 * Definitions and waypoint spline curves for the 4 progressive championship tracks.
 *
 * Computer Graphics Concepts:
 * - Parametric 3D curves using CatmullRomCurve3
 * - Centripetal spline interpolation for smooth derivatives without loops
 * - Environmental lighting, fog, and sky dome settings per level
 */

export const LEVEL_DATA = {
  1: {
    id: 1,
    title: 'Rookie Rush',
    subtitle: 'Sunlit Coastal Metropolis',
    difficulty: 'diff-easy',
    diffText: 'EASY',
    theme: 'city_day',
    trackWidth: 15.0,
    laps: 1,
    targetTimeSec: 70,
    ambientLight: 0xffffff,
    ambientIntensity: 0.8,
    dirLightColor: 0xfffaed,
    dirLightIntensity: 1.8,
    fogColor: 0x9be2ff,
    fogNear: 150,
    fogFar: 600,
    bgColor: 0x87ceeb,
    description: 'Wide boulevard with gentle turns and clear visibility. 70s solo time trial course.',
    aiRacers: [],
    // Spline control points (X, Y, Z)
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 150),
      new THREE.Vector3(40, 0, 280),
      new THREE.Vector3(120, 0, 380),
      new THREE.Vector3(220, 0, 420),
      new THREE.Vector3(340, 0, 360),
      new THREE.Vector3(400, 0, 240),
      new THREE.Vector3(420, 0, 80),
      new THREE.Vector3(360, 0, -80),
      new THREE.Vector3(240, 0, -180),
      new THREE.Vector3(120, 0, -200),
      new THREE.Vector3(30, 0, -120),
    ],
  },

  2: {
    id: 2,
    title: 'Mountain Drift',
    subtitle: 'Alpine Pass & Elevated Bridges',
    difficulty: 'diff-medium',
    diffText: 'MEDIUM',
    theme: 'mountain_sunset',
    trackWidth: 12.0,
    laps: 1,
    targetTimeSec: 70,
    ambientLight: 0xff8866,
    ambientIntensity: 0.6,
    dirLightColor: 0xff7733,
    dirLightIntensity: 1.6,
    fogColor: 0x4a2a3b,
    fogNear: 100,
    fogFar: 500,
    bgColor: 0x3a1e2d,
    description: 'Winding mountain hairpin turns, rocky cliffs, and elevation drops. 70s solo time trial.',
    aiRacers: [],
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 4, 120),
      new THREE.Vector3(-60, 12, 220),
      new THREE.Vector3(-140, 20, 280),
      new THREE.Vector3(-240, 16, 260),
      new THREE.Vector3(-300, 8, 160),
      new THREE.Vector3(-280, 2, 40),
      new THREE.Vector3(-200, 10, -60),
      new THREE.Vector3(-100, 18, -140),
      new THREE.Vector3(40, 14, -220),
      new THREE.Vector3(140, 6, -180),
      new THREE.Vector3(90, 0, -70),
    ],
  },

  3: {
    id: 3,
    title: 'Neon Nightfall',
    subtitle: 'Cyberpunk Metropolis Circuit',
    difficulty: 'diff-hard',
    diffText: 'HARD',
    theme: 'neon_night',
    trackWidth: 12.5,
    laps: 1,
    targetTimeSec: 70,
    ambientLight: 0x111c38,
    ambientIntensity: 0.7,
    dirLightColor: 0x00f3ff,
    dirLightIntensity: 0.9,
    fogColor: 0x060914,
    fogNear: 70,
    fogFar: 380,
    bgColor: 0x04060d,
    description: 'Nocturnal metropolis glowing with neon signs and laser barriers. 70s solo time trial.',
    aiRacers: [],
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 140),
      new THREE.Vector3(70, 0, 240),
      new THREE.Vector3(180, 0, 280),
      new THREE.Vector3(260, 0, 220),
      new THREE.Vector3(280, 0, 110),
      new THREE.Vector3(220, 0, -10),
      new THREE.Vector3(120, 0, -80),
      new THREE.Vector3(40, 0, -160),
      new THREE.Vector3(-60, 0, -220),
      new THREE.Vector3(-160, 0, -180),
      new THREE.Vector3(-140, 0, -60),
    ],
  },

  4: {
    id: 4,
    title: 'Grand Championship',
    subtitle: 'World Stadium Pro Circuit',
    difficulty: 'diff-expert',
    diffText: 'EXPERT',
    theme: 'stadium_championship',
    trackWidth: 14.0,
    laps: 1,
    targetTimeSec: 70,
    ambientLight: 0x223344,
    ambientIntensity: 0.8,
    dirLightColor: 0xffffff,
    dirLightIntensity: 2.0,
    fogColor: 0x0e131d,
    fogNear: 120,
    fogFar: 550,
    bgColor: 0x090d14,
    description: 'The ultimate solo challenge: race through the 2,045m stadium circuit before the 70s timer expires.',
    aiRacers: [],
    points: [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 180),
      new THREE.Vector3(-80, 0, 320),
      new THREE.Vector3(-220, 0, 380),
      new THREE.Vector3(-360, 0, 320),
      new THREE.Vector3(-420, 0, 180),
      new THREE.Vector3(-360, 0, 40),
      new THREE.Vector3(-240, 0, -40),
      new THREE.Vector3(-140, 0, -120),
      new THREE.Vector3(-100, 0, -260),
      new THREE.Vector3(-20, 0, -340),
      new THREE.Vector3(100, 0, -320),
      new THREE.Vector3(160, 0, -200),
      new THREE.Vector3(120, 0, -70),
    ],
  },
};

/**
 * Creates a smooth closed 3D CatmullRom spline from level points
 */
export function createTrackSpline(levelId) {
  const data = LEVEL_DATA[levelId] || LEVEL_DATA[1];
  return new THREE.CatmullRomCurve3(data.points, true, 'centripetal', 0.5);
}
