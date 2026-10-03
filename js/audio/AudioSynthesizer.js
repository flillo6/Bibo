/**
 * BIBO Engine - Procedural Web Audio Synthesizer
 * 
 * Generates all ambient soundscapes (Gentle Rain, Brown Noise) and tactile
 * UI audio in real time using the native Web Audio API.
 * 
 * Zero external audio files (0 KB network payload, 0 latency).
 */

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.currentAmbient = 'mute';
    this.ambientGain = null;
    this.ambientSource = null;
    this.isMuted = false;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Set ambient background noise: 'mute', 'rain', or 'brown'
   * Synchronous audio node startup to preserve mobile gesture activation.
   */
  setAmbient(type) {
    this._initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopAmbient();
    this.currentAmbient = type;

    if (type === 'mute' || this.isMuted || !this.ctx) return;

    if (type === 'brown') {
      this._startBrownNoise();
    } else if (type === 'rain') {
      this._startRain();
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch (e) {}
      this.ambientSource = null;
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch (e) {}
      this.ambientGain = null;
    }
  }

  /**
   * Real-time Brown Noise (first-order integration filter over random noise)
   */
  _startBrownNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to warm the sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    whiteNoise.start();
    this.ambientSource = whiteNoise;
  }

  /**
   * Procedural Gentle Rain (Deep Cozy Indoor Rainfall)
   * Pure acoustic multi-layer Brownian & Pink noise with gentle natural swells.
   * Completely eliminates sine ringing, gurgling streams, and harsh hiss.
   */
  _startRain() {
    const sampleRate = this.ctx.sampleRate;
    const duration = 6; // 6 second seamless organic loop
    const bufferSize = sampleRate * duration;
    const rainBuffer = this.ctx.createBuffer(2, bufferSize, sampleRate);
    const left = rainBuffer.getChannelData(0);
    const right = rainBuffer.getChannelData(1);

    // 1. Layer A: Deep Brownian Noise (The heavy soothing rainfall body)
    let brownL = 0;
    let brownR = 0;

    // 2. Layer B: Pink Noise (The soft splash of raindrops hitting ground)
    let p0_L = 0, p1_L = 0, p2_L = 0;
    let p0_R = 0, p1_R = 0, p2_R = 0;

    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      // Brownian integration with proper scaling
      brownL = (brownL + (0.12 * whiteL)) / 1.02;
      brownR = (brownR + (0.12 * whiteR)) / 1.02;

      // Pink noise Kellet filter
      p0_L = 0.99886 * p0_L + whiteL * 0.0555;
      p1_L = 0.99332 * p1_L + whiteL * 0.0750;
      p2_L = 0.96900 * p2_L + whiteL * 0.1538;
      const pinkL = (p0_L + p1_L + p2_L + whiteL * 0.05) * 0.35;

      p0_R = 0.99886 * p0_R + whiteR * 0.0555;
      p1_R = 0.99332 * p1_R + whiteR * 0.0750;
      p2_R = 0.96900 * p2_R + whiteR * 0.1538;
      const pinkR = (p0_R + p1_R + p2_R + whiteR * 0.05) * 0.35;

      // Subtle slow wind/rain intensity swell (natural variation)
      const swell = 1 + 0.15 * Math.sin((2 * Math.PI * i) / (sampleRate * 3.5));

      left[i] = ((brownL * 0.6) + (pinkL * 0.4)) * swell * 0.55;
      right[i] = ((brownR * 0.6) + (pinkR * 0.4)) * swell * 0.55;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    // Warm Low-pass filter to guarantee zero harshness
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

    rainSource.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    rainSource.start();
    this.ambientSource = rainSource;
  }

  /**
   * Tactile Button Click Sound (sine pitch drop: 180Hz -> 55Hz, 30ms)
   */
  playClick() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.03);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Tactile Mechanical Relay / Peer Review Click (filtered noise burst, 15ms)
   */
  playRelayClick() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.015);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.02);
  }

  /**
   * Warm Chime / Donate Snack (Two-tone warm fifth chord C5-G5 in 75ms)
   */
  playDonate() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    [523.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + (idx * 0.03));

      gain.gain.setValueAtTime(0.1, t + (idx * 0.03));
      gain.gain.exponentialRampToValueAtTime(0.001, t + (idx * 0.03) + 0.075);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + (idx * 0.03));
      osc.stop(t + (idx * 0.03) + 0.08);
    });
  }

  /**
   * Electric Spark Sound (Clean sponge ⚡)
   */
  playSpark() {
    if (this.isMuted) return;
    this._initContext();
    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (i % 2 === 0 ? 1 : -0.5);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.05);
  }
}

export const audioSynth = new AudioSynthesizer();
