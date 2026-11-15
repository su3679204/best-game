// Enemy kinds, their steering, and the Cinder Warden boss. Each kind has one
// clear behaviour: chase, strafe-and-shoot, lunge, tank, or drift. Elites are
// the same kinds scaled up and gilded.
import { BOSS, ELITE, ENEMIES, FIELD } from './config.js';
import { chance, pick, range } from './random.js';

let nextId = 1;

/** Which kinds may appear in a given wave (new kinds join as waves climb). */
export function kindsForWave(wave) {
  const kinds = ['mite'];
  if (wave >= 2) kinds.push('wisp');
  if (wave >= 3) kinds.push('spitter');
  if (wave >= 4) kinds.push('dasher');
  if (wave >= 6) kinds.push('brute');
  return kinds;
}

/** A spawn point on the arena edge, away from the player. */
export function spawnPoint(random, px, py) {
  for (let tries = 0; tries < 12; tries += 1) {
    const side = Math.floor(random() * 4);
    let x;
    let y;
    if (side === 0) { x = range(random, 40, FIELD.width - 40); y = 36; }
    else if (side === 1) { x = range(random, 40, FIELD.width - 40); y = FIELD.height - 36; }
    else if (side === 2) { x = 36; y = range(random, 40, FIELD.height - 40); }
    else { x = FIELD.width - 36; y = range(random, 40, FIELD.height - 40); }
    if (Math.hypot(x - px, y - py) > 320) return { x, y };
  }
  return { x: 60, y: 60 };
}

export function makeEnemy(random, kind, wave, px, py) {
  const def = ENEMIES[kind];
  const elite = chance(random, 0.06 + wave * 0.004);
  const hpMul = (1 + 0.16 * (wave - 1)) * (elite ? ELITE.hpMul : 1);
  const at = spawnPoint(random, px, py);
  const id = nextId;
  nextId += 1;
  return {
    id,
    kind,
    elite,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    hp: def.hp * hpMul,
    maxHp: def.hp * hpMul,
    speed: def.speed * (1 + Math.min(0.35, wave * 0.015)) * (elite ? ELITE.speedMul : 1),
    radius: def.radius * (elite ? ELITE.radiusMul : 1),
    damage: def.damage,
    score: def.score * (elite ? ELITE.scoreMul : 1),
    xp: def.xp * (elite ? ELITE.xpMul : 1),
    colour: elite ? '#ffd94d' : def.colour,
    flash: 0,
    touchTimer: 0,
    shootTimer: range(random, 1, 2.4),
    lungeTimer: range(random, 1.5, 3),
    lungeState: 0,
    lungeVx: 0,
    lungeVy: 0,
    phase: random() * Math.PI * 2,
    knockX: 0,
    knockY: 0,
  };
}

export function makeBoss(wave) {
  const scale = 1 + 0.18 * (wave / 5 - 1);
  const id = nextId;
  nextId += 1;
  return {
    id,
    kind: 'boss',
    elite: false,
    x: FIELD.width / 2,
    y: 120,
    vx: 0,
    vy: 0,
    hp: BOSS.hp * scale,
    maxHp: BOSS.hp * scale,
    speed: BOSS.speed,
    radius: BOSS.radius,
    damage: BOSS.damage,
    score: BOSS.score,
    xp: 25,
    colour: '#ff5a3c',
    flash: 0,
    touchTimer: 0,
    shootTimer: 2,
    burstTimer: BOSS.burstInterval,
    summonTimer: BOSS.summonInterval,
    phase: 0,
    knockX: 0,
    knockY: 0,
  };
}

/** Steer one enemy for a step; returns ebullets it fired (possibly none). */
export function stepEnemy(e, dt, px, py, random, time) {
  const dx = px - e.x;
  const dy = py - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const shots = [];
  if (e.flash > 0) e.flash -= dt;
  if (e.touchTimer > 0) e.touchTimer -= dt;

  // Knockback decays and is added to whatever the kind does.
  e.x += e.knockX * dt;
  e.y += e.knockY * dt;
  e.knockX *= 0.86;
  e.knockY *= 0.86;

  if (e.kind === 'mite' || e.kind === 'brute') {
    e.x += nx * e.speed * dt;
    e.y += ny * e.speed * dt;
  } else if (e.kind === 'wisp') {
    const wobble = Math.sin(time * 3 + e.phase) * 0.7;
    e.x += (nx - ny * wobble) * e.speed * dt;
    e.y += (ny + nx * wobble) * e.speed * dt;
  } else if (e.kind === 'spitter') {
    // Keep a ring around the player and spit embers at them.
    if (dist > 300) {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
    } else if (dist < 200) {
      e.x -= nx * e.speed * dt;
      e.y -= ny * e.speed * dt;
    } else {
      e.x += -ny * e.speed * 0.5 * dt;
      e.y += nx * e.speed * 0.5 * dt;
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 560) {
      e.shootTimer = 2.3;
      shots.push({ x: e.x, y: e.y, vx: nx * 260, vy: ny * 260, radius: 7, damage: e.damage, life: 4 });
    }
  } else if (e.kind === 'dasher') {
    e.lungeTimer -= dt;
    if (e.lungeState === 0) {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
      if (e.lungeTimer <= 0 && dist < 420) {
        e.lungeState = 1;
        e.lungeTimer = 0.45;
        e.lungeVx = nx;
        e.lungeVy = ny;
      }
    } else if (e.lungeState === 1) {
      // Telegraph: shiver in place before the lunge.
      e.x += (random() - 0.5) * 40 * dt;
      e.y += (random() - 0.5) * 40 * dt;
      if (e.lungeTimer <= 0) {
        e.lungeState = 2;
        e.lungeTimer = 0.4;
      }
    } else {
      e.x += e.lungeVx * 520 * dt;
      e.y += e.lungeVy * 520 * dt;
      if (e.lungeTimer <= 0) {
        e.lungeState = 0;
        e.lungeTimer = range(random, 1.6, 3);
      }
    }
  } else if (e.kind === 'boss') {
    const hpFrac = e.hp / e.maxHp;
    const speed = e.speed * (hpFrac < 0.33 ? 1.5 : hpFrac < 0.66 ? 1.2 : 1);
    e.x += nx * speed * dt;
    e.y += ny * speed * dt;
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      e.burstTimer = BOSS.burstInterval * (hpFrac < 0.33 ? 0.7 : 1);
      const n = hpFrac < 0.33 ? 14 : 10;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + e.phase;
        shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, radius: 8, damage: 14, life: 5 });
      }
      e.phase += 0.4;
    }
    if (hpFrac < 0.66) {
      e.summonTimer -= dt;
      if (e.summonTimer <= 0) {
        e.summonTimer = BOSS.summonInterval;
        e.summon = true;
      }
    }
  }

  e.x = Math.max(e.radius, Math.min(FIELD.width - e.radius, e.x));
  e.y = Math.max(e.radius, Math.min(FIELD.height - e.radius, e.y));
  return shots;
}

export function pickKind(random, wave) {
  const kinds = kindsForWave(wave);
  // Brutes stay rare; mites thin out as the roster grows.
  const weights = kinds.map((k) => (k === 'brute' ? 0.5 : k === 'mite' ? 1.4 : 1));
  let total = 0;
  for (const w of weights) total += w;
  let roll = random() * total;
  for (let i = 0; i < kinds.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return kinds[i];
  }
  return kinds[0];
}
