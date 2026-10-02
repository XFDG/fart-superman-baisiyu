/** Small, asset-free cartoon sound kit. Call unlock() from a click/touch gesture. */
export class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this._noiseBuffer = null;
    this._voices = 0;
    this._lastPlayed = new Map();
    this._maxVoices = 36;
  }

  async unlock() {
    try {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return false;
      if (!this.context || this.context.state === 'closed') {
        this.context = new AudioContext();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 18;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.16;
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.4;
        this.master.connect(compressor);
        compressor.connect(this.context.destination);
        this._noiseBuffer = null;
        this._voices = 0;
        this._lastPlayed.clear();
      }
      // resume() is deliberately initiated inside the caller's user gesture.
      if (this.context.state !== 'running') await this.context.resume();
      if (this.context.state !== 'running') return false;
      // A silent frame helps older iOS versions unlock their audio output.
      const source = this.context.createBufferSource();
      source.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      source.connect(this.master);
      source.onended = () => source.disconnect();
      source.start();
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.master || !this.context || this.context.state === 'closed') return;
    try {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.4, this.context.currentTime, 0.015);
    } catch {
      // Missing audio support never prevents the game from continuing.
    }
  }

  play(name, variant = 'stink') {
    if (this.muted || !this.context || this.context.state !== 'running') return false;
    const cooldowns = {
      jump: 0.07, fart: 0.08, crit: 0.12, hit: 0.045, coin: 0.03,
      hurt: 0.2, win: 1.2, lose: 0.8, checkpoint: 0.25,
    };
    if (!(name in cooldowns)) return false;
    const now = this.context.currentTime;
    if (now - (this._lastPlayed.get(name) ?? -Infinity) < cooldowns[name]) return false;
    if (this._voices > this._maxVoices - 8) return false;
    this._lastPlayed.set(name, now);
    try {
      switch (name) {
        case 'jump':
          this._tone(now, 0.13, 200, 590, 0.15, 'sine');
          this._tone(now + 0.02, 0.1, 100, 180, 0.1, 'triangle');
          break;
        case 'fart':
          this._fart(now, variant);
          break;
        case 'crit':
          // A chunky "plop-plop-POW", followed by a cheerful crit sparkle.
          for (let i = 0; i < 3; i++) {
            this._tone(now + i * 0.055, 0.13, 180 - i * 25, 38, 0.22, 'triangle');
            this._noise(now + i * 0.055, 0.095, 850, 220, 0.22);
          }
          this._tone(now + 0.14, 0.18, 880, 1320, 0.11, 'sine');
          break;
        case 'hit':
          this._tone(now, 0.075, 150, 50, 0.18, 'triangle');
          this._noise(now, 0.07, 1400, 300, 0.15);
          break;
        case 'coin':
          this._tone(now, 0.095, 880, 880, 0.14, 'sine');
          this._tone(now + 0.055, 0.17, 1320, 1320, 0.12, 'sine');
          break;
        case 'hurt':
          this._tone(now, 0.2, 220, 75, 0.18, 'sawtooth', 650);
          this._noise(now, 0.14, 1400, 180, 0.17);
          break;
        case 'win':
          this._melody(now, [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], 0.16, 0.16);
          this._tone(now + 0.8, 0.52, 523.25, 523.25, 0.08, 'triangle');
          this._tone(now + 0.8, 0.52, 659.25, 659.25, 0.07, 'triangle');
          break;
        case 'lose':
          this._melody(now, [392, 329.63, 261.63, 130.81], 0.19, 0.13);
          break;
        case 'checkpoint':
          this._melody(now, [523.25, 659.25, 783.99], 0.11, 0.12);
          break;
      }
      return true;
    } catch {
      return false;
    }
  }

  _fart(now, variant) {
    if (variant === 'pink') {
      this._tone(now, 0.21, 160, 70, 0.14, 'triangle');
      this._noise(now, 0.2, 720, 320, 0.08);
      this._melody(now + 0.03, [659.25, 880, 1046.5], 0.055, 0.07);
    } else if (variant === 'yellow') {
      this._tone(now, 0.2, 140, 42, 0.2, 'sawtooth', 850);
      this._tone(now + 0.055, 0.13, 105, 48, 0.11, 'triangle');
      this._noise(now, 0.19, 1700, 220, 0.18);
    } else if (variant === 'green') {
      this._tone(now, 0.32, 83, 35, 0.2, 'sawtooth', 480);
      this._noise(now, 0.3, 950, 130, 0.23);
      this._tone(now + 0.11, 0.14, 190, 55, 0.1, 'triangle');
    } else {
      this._tone(now, 0.28, 110, 32, 0.21, 'sawtooth', 600);
      this._noise(now, 0.25, 820, 170, 0.16);
      this._tone(now + 0.065, 0.17, 67, 37, 0.13, 'triangle');
    }
  }

  _melody(now, notes, step, volume) {
    notes.forEach((frequency, index) => {
      const duration = index === notes.length - 1 ? step * 2.5 : step * 1.1;
      this._tone(now + index * step, duration, frequency, frequency, volume, 'sine');
    });
  }

  _envelope(gain, now, duration, volume) {
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.008, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }

  _track(source, nodes, now, duration) {
    this._voices++;
    source.onended = () => {
      this._voices = Math.max(0, this._voices - 1);
      for (const node of nodes) {
        try { node.disconnect(); } catch { /* Already disconnected. */ }
      }
    };
    source.start(now);
    source.stop(now + duration + 0.015);
  }

  _tone(now, duration, from, to, volume, type = 'sine', cutoff = 2200) {
    if (this._voices >= this._maxVoices) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    this._envelope(gain, now, duration, volume);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this._track(oscillator, [oscillator, filter, gain], now, duration);
  }

  _noise(now, duration, from, to, volume) {
    if (this._voices >= this._maxVoices) return;
    if (!this._noiseBuffer) {
      const length = this.context.sampleRate;
      this._noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const samples = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    source.buffer = this._noiseBuffer;
    filter.type = 'lowpass';
    filter.Q.value = 1.3;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + duration);
    this._envelope(gain, now, duration, volume);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this._track(source, [source, filter, gain], now, duration);
  }
}
