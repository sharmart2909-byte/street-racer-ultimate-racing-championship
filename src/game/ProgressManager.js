/**
 * ProgressManager.js
 * Manages player progression, level unlocking, personal best records,
 * vehicle garage preferences, and settings using LocalStorage.
 */

const STORAGE_KEY = 'street_racer_save_data_v1';

export const CAR_CATALOG = [
  {
    id: 'vortex-gt',
    name: 'Vortex GT',
    desc: 'Balanced grand-touring supercar. Responsive agility and steady top speed.',
    topSpeedKmh: 245,
    accelerationRate: 30,
    brakingRate: 42,
    handling: 1.0,
    driftFactor: 1.0,
    primaryColor: 0xe62232, // Crimson Red
    speedStat: 8.2,
    accelStat: 8.5,
    handlingStat: 8.0,
    nitroStat: 8.0,
  },
  {
    id: 'apex-phantom',
    name: 'Apex Phantom',
    desc: 'High-speed hypercar with blistering straightaway acceleration and extended nitro burn.',
    topSpeedKmh: 270,
    accelerationRate: 34,
    brakingRate: 38,
    handling: 0.9,
    driftFactor: 0.85,
    primaryColor: 0x00d2ff, // Electric Blue
    speedStat: 9.6,
    accelStat: 9.2,
    handlingStat: 7.2,
    nitroStat: 9.5,
  },
  {
    id: 'thunder-drift',
    name: 'Thunder Drift',
    desc: 'Tuned drift machine engineered for sharp hairpin slides and lightning fast boost recovery.',
    topSpeedKmh: 235,
    accelerationRate: 31,
    brakingRate: 45,
    handling: 1.25,
    driftFactor: 1.35,
    primaryColor: 0x39ff14, // Neon Green
    speedStat: 7.8,
    accelStat: 8.8,
    handlingStat: 9.7,
    nitroStat: 9.0,
  },
];

export const PAINT_COLORS = {
  'crimson': 0xe62232,
  'electric-blue': 0x00d2ff,
  'neon-green': 0x39ff14,
  'solar-orange': 0xff7700,
  'stealth-black': 0x111111,
  'cyber-purple': 0xa800ff,
};

export class ProgressManager {
  constructor() {
    this.data = this.loadData();
  }

  getDefaultData() {
    return {
      unlockedLevels: [1], // Level 1 unlocked by default
      bestTimes: {}, // { 1: 58.4, 2: 74.2, ... }
      selectedCarId: 'vortex-gt',
      carColors: {
        'vortex-gt': 'crimson',
        'apex-phantom': 'electric-blue',
        'thunder-drift': 'neon-green',
      },
      settings: {
        sound: true,
        shadows: true,
        particles: true,
        camShake: true,
      },
    };
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultData(), ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('LocalStorage error, using defaults:', e);
    }
    return this.getDefaultData();
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  isLevelUnlocked(levelId) {
    return this.data.unlockedLevels.includes(Number(levelId));
  }

  unlockLevel(levelId) {
    const id = Number(levelId);
    if (!this.data.unlockedLevels.includes(id)) {
      this.data.unlockedLevels.push(id);
      this.data.unlockedLevels.sort((a, b) => a - b);
      this.saveData();
      return true;
    }
    return false;
  }

  recordRaceTime(levelId, timeSec) {
    const id = Number(levelId);
    const existing = this.data.bestTimes[id];
    let isNewRecord = false;

    if (!existing || timeSec < existing) {
      this.data.bestTimes[id] = Number(timeSec.toFixed(2));
      isNewRecord = true;
      this.saveData();
    }
    return { isNewRecord, bestTime: this.data.bestTimes[id] };
  }

  getBestTime(levelId) {
    return this.data.bestTimes[Number(levelId)] || null;
  }

  getSelectedCar() {
    const car = CAR_CATALOG.find((c) => c.id === this.data.selectedCarId) || CAR_CATALOG[0];
    const colorKey = this.data.carColors[car.id] || 'crimson';
    const colorHex = PAINT_COLORS[colorKey] || car.primaryColor;
    return { ...car, currentColorKey: colorKey, currentColorHex: colorHex };
  }

  setSelectedCar(carId) {
    this.data.selectedCarId = carId;
    this.saveData();
  }

  setCarColor(carId, colorKey) {
    this.data.carColors[carId] = colorKey;
    this.saveData();
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(settings) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveData();
  }

  resetAllProgress() {
    this.data = this.getDefaultData();
    this.saveData();
  }
}
