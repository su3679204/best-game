// All sound is synthesised with WebAudio: no audio files, nothing fetched.
// The context is created on the first user gesture (browsers block audio before
// one), music is a quiet two-bar loop scheduled ahead, and M toggles mute.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let nextBarTime = 0;
  let bar = 0;

  // A minor-key bass line and a soft pad, one bar = 4 beats at 96 bpm.
  const BASS = [55, 0, 55, 65.41, 49, 0, 58.27, 65.41, 55, 0, 55, 82.41, 49, 58.27, 65.41, 73.42];
  const PAD = [220, 261.63, 329.63];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  function scheduleBar() {
    if (!ctx || muted) return;
    const beat = 60 / 96;
    const barLen = beat * 4;
    while (nextBarTime < ctx.currentTime + 0.6) {
      const t0 = nextBarTime;
      const root = bar % 2 === 0 ? 0 : -3.5; // Am, then F-ish shift via bass choices
      BASS.forEach((f, i) => {
        if (!f) return;
        const when = t0 - ctx.currentTime + i * (barLen / 16);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f * Math.pow(2, root / 12);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
        g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + barLen / 16 + 0.1);
        osc.connect(g);
        g.connect(musicGain);
        osc.start(ctx.currentTime + when);
        osc.stop(ctx.currentTime + when + barLen / 16 + 0.15);
      });
      PAD.forEach((f) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.12, t0 + barLen / 2);
        g.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
        osc.connect(g);
        g.connect(musicGain);
        osc.start(t0);
        osc.stop(t0 + barLen + 0.05);
      });
      nextBarTime += barLen;
      bar += 1;
    }
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!musicTimer) {
        nextBarTime = ctx.currentTime + 0.1;
        musicTimer = window.setInterval(scheduleBar, 200);
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() { tone(720, 0.09, 'square', 0.10, 0, 320); },
    hit() { tone(180, 0.06, 'triangle', 0.12, 0, 90); },
    die() { noise(0.22, 0.22, 1400); tone(160, 0.18, 'sawtooth', 0.08, 0, 50); },
    pickup() { tone(880, 0.07, 'sine', 0.14, 0, 1320); },
    heart() { tone(523, 0.12, 'sine', 0.16); tone(784, 0.18, 'sine', 0.16, 0.1); },
    hurt() { tone(140, 0.25, 'sawtooth', 0.22, 0, 60); noise(0.15, 0.18, 700); },
    levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, i * 0.07)); },
    boss() { tone(65, 0.7, 'sawtooth', 0.25, 0, 40); noise(0.5, 0.15, 400); },
    wave() { tone(392, 0.12, 'triangle', 0.14); tone(523, 0.2, 'triangle', 0.14, 0.1); },
    victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.11)); },
    over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.16, i * 0.16)); },
    click() { tone(660, 0.05, 'sine', 0.12); },
    nova() { tone(300, 0.35, 'sine', 0.18, 0, 1200); noise(0.25, 0.12, 2400); },
  };
}
