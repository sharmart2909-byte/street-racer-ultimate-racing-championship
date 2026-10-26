/**
 * AudioManager.js
 * Synthesizes procedural vehicle audio, collisions, nitro, and UI feedback
 * using the HTML5 Web Audio API. Requires zero external audio files.
 *
 * Computer Graphics & Audio Concepts:
 * - Dynamic pitch modulation using oscillator frequency
 * - Audio filtering (low-pass, band-pass) to simulate vehicle engine acoustics
 * - White/pink noise generation for tire skids, collisions, and nitro exhaust whoosh
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;

    // Master volume nodes
    this.masterGain = null;
    this.engineGain = null;

    // Engine sound components
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;

    // Nitro sound components
    this.nitroNode = null;
    this.nitroGain = null;

    // Skid sound components
    this.skidNode = null;
    this.skidGain = null;
  }

  /**
   * Initializes the AudioContext upon first user interaction
   */
  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported by this browser.');
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupNitroSynth();
      this.setupSkidSynth();

      this.initialized = true;
    } catch (e) {
      console.warn('Audio initialization deferred:', e);
    }
  }

  /**
   * Resumes AudioContext if suspended by browser autoplay policy
   */
  ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Sets up dual-oscillator procedural engine sound with low-pass filtering
   */
  setupEngineSynth() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Primary low rumble (sawtooth for rich harmonics)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Secondary sub-octave tone (triangle for warm low-end body)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.isEngineRunning = true;
  }

  /**
   * Sets up continuous filtered noise buffer for nitro boost whoosh
   */
  setupNitroSynth() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'bandpass';
    nitroFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
    nitroFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    whiteNoise.start();
  }

  /**
   * Sets up screeching noise buffer for tire drifts
   */
  setupSkidSynth() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const skidNoise = this.ctx.createBufferSource();
    skidNoise.buffer = noiseBuffer;
    skidNoise.loop = true;

    const skidFilter = this.ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);
    skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    skidNoise.connect(skidFilter);
    skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    skidNoise.start();
  }

  /**
   * Modulates engine RPM sound according to vehicle speed and throttle
   * @param {number} speedRatio 0 to 1 ratio of current speed
   * @param {boolean} isAccelerating
   */
  updateEngine(speedRatio, isAccelerating) {
    if (!this.enabled || !this.initialized || !this.isEngineRunning) return;

    const now = this.ctx.currentTime;
    const baseFreq = 40;
    const targetFreq = baseFreq + speedRatio * 180 + (isAccelerating ? 25 : 0);

    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);

    // Open filter cutoff as RPM increases
    const targetCutoff = 350 + speedRatio * 1600 + (isAccelerating ? 400 : 0);
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);

    // Dynamic engine loudness
    const targetGain = 0.15 + speedRatio * 0.25 + (isAccelerating ? 0.1 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  /**
   * Controls nitro boost whoosh volume
   */
  setNitro(active) {
    if (!this.enabled || !this.nitroGain) return;
    const target = active ? 0.45 : 0;
    this.nitroGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  /**
   * Controls tire skid screech volume
   */
  setDrift(active, intensity = 1.0) {
    if (!this.enabled || !this.skidGain) return;
    const target = active ? Math.min(0.35, 0.35 * intensity) : 0;
    this.skidGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  /**
   * Plays a metallic crash thump sound when colliding with barriers or rivals
   * @param {number} intensity Impact strength 0 to 1
   */
  playCrash(intensity = 0.8) {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    const vol = Math.min(0.6, 0.2 + intensity * 0.4);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Plays countdown beeps (3, 2, 1, GO!)
   */
  playCountdown(isGo = false) {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'sawtooth' : 'sine';
    const freq = isGo ? 880 : 440; // A5 for GO!, A4 for 3, 2, 1
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + (isGo ? 0.6 : 0.25));
  }

  /**
   * Plays pleasant two-tone chime when hitting a checkpoint
   */
  playCheckpoint() {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  /**
   * Plays a celebratory victory fanfare arpeggio
   */
  playVictory() {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.6);
    });
  }

  /**
   * Plays defeat / time expired tone
   */
  playDefeat() {
    if (!this.enabled || !this.ctx) return;
    this.ensureRunning();

    const notes = [400, 370, 330, 280];
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);

      gain.gain.setValueAtTime(0.2, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.4);
    });
  }

  /**
   * Mute / unmute audio output
   */
  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.7 : 0, this.ctx.currentTime);
    }
    return this.enabled;
  }

  stopAll() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.setNitro(false);
    this.setDrift(false);
  }
}
