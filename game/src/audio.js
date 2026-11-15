// Synthesised WebAudio sound effects plus a quiet looping music bed.
// No audio files: every sound is an oscillator shaped in code, so the game
// stays a handful of static files and plays fully offline.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  /** Create the audio context. Call from a user gesture (start / click). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.07;
      this.musicGain.connect(this.master);
    } catch { /* audio is decoration; a failure must never break play */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** One short tone: frequency slide, waveform, length and loudness. */
  tone(freq, endFreq, dur, type, vol, when = 0) {
    if (!this.ctx || !this.master) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* ignore */ }
  }

  shoot() { this.tone(720, 240, 0.09, 'square', 0.10); }
  hit() { this.tone(190, 90, 0.07, 'triangle', 0.14); }
  enemyDie() { this.tone(320, 60, 0.22, 'sawtooth', 0.16); this.tone(520, 120, 0.14, 'triangle', 0.08, 0.02); }
  pickup() { this.tone(880, 1320, 0.08, 'sine', 0.10); }
  hurt() { this.tone(160, 55, 0.25, 'sawtooth', 0.22); }
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.16, 'sine', 0.14, i * 0.07));
  }
  waveClear() {
    this.tone(659, 659, 0.14, 'sine', 0.12);
    this.tone(880, 880, 0.2, 'sine', 0.12, 0.1);
  }
  nova() { this.tone(440, 90, 0.35, 'sine', 0.18); }
  bossRoar() {
    this.tone(90, 45, 0.6, 'sawtooth', 0.25);
    this.tone(135, 60, 0.5, 'square', 0.12, 0.08);
  }
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.3, 'sine', 0.15, i * 0.12));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.94, 0.3, 'triangle', 0.14, i * 0.14));
  }

  /** A slow, quiet loop over a minor pentatonic line. Started once per run. */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
    const pattern = [0, 2, 4, 3, 5, 4, 2, 1, 0, 4, 5, 6, 5, 3, 2, 0];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      try {
        const f = notes[pattern[this.musicStep % pattern.length]];
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(1, t0 + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + 1.7);
      } catch { /* ignore */ }
      this.musicStep += 1;
    }, 420);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
