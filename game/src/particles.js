// One pooled particle list and one floating-text list, plus screen shake.
// Nothing allocates during play: dead particles are reused in place.
export function createParticles(capacity = 420) {
  const parts = [];
  for (let i = 0; i < capacity; i += 1) {
    parts.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, colour: '#fff', drag: 0.9, glow: false });
  }
  const texts = [];
  for (let i = 0; i < 48; i += 1) {
    texts.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', colour: '#fff', size: 16 });
  }
  let shakeTime = 0;
  let shakeMag = 0;

  function spawn(x, y, vx, vy, life, size, colour, glow = false) {
    for (const p of parts) {
      if (p.alive) continue;
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.colour = colour;
      p.glow = glow;
      return;
    }
  }

  return {
    burst(x, y, colour, count, speed, size = 4) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.35 + Math.random() * 0.4, size * (0.6 + Math.random() * 0.8), colour, true);
      }
    },
    ring(x, y, colour, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2;
        spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.5, 5, colour, true);
      }
    },
    trail(x, y, colour) {
      spawn(x, y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30 - 20, 0.4, 3, colour, true);
    },
    floatText(x, y, text, colour, size = 16) {
      for (const t of texts) {
        if (t.alive) continue;
        t.alive = true;
        t.x = x;
        t.y = y;
        t.life = 0.9;
        t.maxLife = 0.9;
        t.text = text;
        t.colour = colour;
        t.size = size;
        return;
      }
    },
    shake(mag, time) {
      shakeMag = Math.max(shakeMag, mag);
      shakeTime = Math.max(shakeTime, time);
    },
    step(dt) {
      for (const p of parts) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
      for (const t of texts) {
        if (!t.alive) continue;
        t.life -= dt;
        t.y -= 42 * dt;
        if (t.life <= 0) t.alive = false;
      }
      if (shakeTime > 0) {
        shakeTime -= dt;
        if (shakeTime <= 0) shakeMag = 0;
      }
    },
    offset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const s = shakeMag * (shakeTime / 0.3);
      return { x: (Math.random() - 0.5) * 2 * s, y: (Math.random() - 0.5) * 2 * s };
    },
    get list() {
      return parts;
    },
    get textList() {
      return texts;
    },
  };
}
