// Pooled particles, floating damage numbers, and screen shake. One pool
// caps the work: bursts reuse dead slots instead of allocating new objects.
export class Particles {
  constructor() {
    this.pool = [];
    for (let i = 0; i < 320; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffb347', drag: 0.9 });
    }
    this.texts = [];
    this.trauma = 0;
  }

  /** Spawn a burst of sparks at (x, y). */
  burst(x, y, color, count = 12, speed = 180) {
    let made = 0;
    for (const p of this.pool) {
      if (made >= count) break;
      if (p.alive) continue;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      p.alive = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.maxLife = 0.35 + Math.random() * 0.45;
      p.life = p.maxLife;
      p.size = 2 + Math.random() * 3;
      p.color = color;
      p.drag = 0.88;
      made += 1;
    }
  }

  /** A ring of embers, used for deaths and the nova boon. */
  ring(x, y, color, count = 18, speed = 220) {
    for (let i = 0; i < count; i++) this.burst(x, y, color, 1, speed);
    this.burst(x, y, '#ffffff', 4, speed * 0.5);
  }

  /** A small puff for gem pickups: fewer, slower sparks than a burst. */
  embers(x, y, color) { this.burst(x, y, color, 4, 100); }

  /** Floating combat text, e.g. damage numbers. */
  text(x, y, str, color = '#f5ead6') {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, str, color, life: 0.9, maxLife: 0.9 });
  }

  /** Add screen shake; bigger hits shake harder. */
  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 34 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  /** Current shake offset in pixels. */
  offset() {
    const s = this.trauma * this.trauma * 14;
    return { x: (Math.random() * 2 - 1) * s, y: (Math.random() * 2 - 1) * s };
  }

  draw(ctx) {
    for (const p of this.pool) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
