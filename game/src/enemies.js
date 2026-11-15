// Fiend kinds, their steering, and boss behaviour. Each kind moves its own
// way: mites chase, wisps wander, spitters keep range and shoot, dashers
// telegraph then lunge, brutes plod straight at the lantern. Bosses fire
// radial bursts and summon mites, and quicken as their health falls.
import { ENEMY_TYPES, ELITE, BOSS_TUNING, ARENA } from './config.js';

let nextId = 1;

/** Build one fiend at (x, y) for the given wave. Elites are golden and tougher. */
export function makeEnemy(kind, x, y, wave, rng) {
  const base = ENEMY_TYPES[kind];
  // Elites are decided by the world (eliteChance roll), never here, so a
  // fresh fiend always starts ordinary; promoteElite() upgrades it later.
  const elite = false;
  const hpScale = 1 + 0.12 * (wave - 1);
  const hp = Math.round(base.hp * hpScale * (elite ? ELITE.hpMult : 1));
  return {
    id: nextId++,
    kind,
    x, y,
    vx: 0, vy: 0,
    hp, maxHp: hp,
    speed: base.speed * (1 + 0.02 * (wave - 1)) * (elite ? ELITE.speedMult : 1),
    radius: base.radius * (elite ? ELITE.radiusMult : 1),
    damage: base.damage,
    xp: base.xp * (elite ? ELITE.xpMult : 1),
    score: base.score * (elite ? ELITE.scoreMult : 1),
    color: elite ? '#ffd23c' : base.color,
    elite,
    touchTimer: 0,
    flash: 0,
    knockX: 0, knockY: 0,
    // Per-kind state:
    windup: 0,        // dasher: telegraph timer before a lunge
    lunging: 0,       // dasher: lunge time remaining
    lungeX: 0, lungeY: 0,
    shootTimer: rng ? rng.range(1, 2.5) : 1.5, // spitter: time to next shot
    wanderAngle: rng ? rng.range(0, Math.PI * 2) : 0,
    wanderTimer: 0,
  };
}

/** Mark a fresh fiend elite (used by the world when its own roll says so). */
export function promoteElite(e) {
  e.elite = true;
  e.color = '#ffd23c';
  e.maxHp = Math.round(e.maxHp * ELITE.hpMult);
  e.hp = e.maxHp;
  e.speed *= ELITE.speedMult;
  e.radius *= ELITE.radiusMult;
  e.xp *= ELITE.xpMult;
  e.score *= ELITE.scoreMult;
}

/** Build a boss for a boss wave. */
export function makeBoss(wave) {
  const tune = BOSS_TUNING[wave] || BOSS_TUNING[15];
  return {
    id: nextId++,
    kind: 'boss',
    name: tune.name,
    x: ARENA.width / 2,
    y: 150,
    vx: 0, vy: 0,
    hp: tune.hp, maxHp: tune.hp,
    speed: tune.speed,
    radius: tune.radius,
    damage: tune.damage,
    score: tune.score,
    xp: 25,
    color: '#e63e21',
    elite: false,
    touchTimer: 0,
    flash: 0,
    knockX: 0, knockY: 0,
    burstTimer: 2.0,
    summonTimer: 5.0,
    windup: 0, lunging: 0, lungeX: 0, lungeY: 0,
    shootTimer: 0, wanderAngle: 0, wanderTimer: 0,
  };
}

function steerToward(e, tx, ty, speed) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.vx = (dx / d) * speed;
  e.vy = (dy / d) * speed;
}

function clampArena(e) {
  const m = ARENA.wall + e.radius;
  e.x = Math.max(m, Math.min(ARENA.width - m, e.x));
  e.y = Math.max(m, Math.min(ARENA.height - m, e.y));
}

/**
 * Move one fiend for a step. `env` carries the player, the step length, the
 * rng, and callbacks to fire an enemy projectile or summon a mite.
 */
export function updateEnemy(e, env) {
  const { player, dt, rng } = env;
  e.touchTimer = Math.max(0, e.touchTimer - dt);
  e.flash = Math.max(0, e.flash - dt * 6);
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (e.kind === 'mite') {
    steerToward(e, player.x, player.y, e.speed);
  } else if (e.kind === 'wisp') {
    e.wanderTimer -= dt;
    if (e.wanderTimer <= 0) {
      e.wanderTimer = rng.range(0.8, 1.8);
      e.wanderAngle = Math.atan2(dy, dx) + rng.range(-1.1, 1.1);
    }
    e.vx = Math.cos(e.wanderAngle) * e.speed;
    e.vy = Math.sin(e.wanderAngle) * e.speed;
  } else if (e.kind === 'spitter') {
    // Hold about 260 px away and shoot; drift sideways while waiting.
    if (dist > 300) steerToward(e, player.x, player.y, e.speed);
    else if (dist < 200) steerToward(e, e.x - dx, e.y - dy, e.speed * 0.8);
    else { e.vx = (-dy / dist) * e.speed * 0.5; e.vy = (dx / dist) * e.speed * 0.5; }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 520) {
      e.shootTimer = rng.range(2.2, 3.0);
      const sp = 170;
      env.fireEnemyShot(e.x, e.y, (dx / dist) * sp, (dy / dist) * sp, e.damage, 7);
    }
  } else if (e.kind === 'dasher') {
    if (e.lunging > 0) {
      e.lunging -= dt;
      e.vx = e.lungeX;
      e.vy = e.lungeY;
    } else if (e.windup > 0) {
      e.windup -= dt;
      e.vx = 0; e.vy = 0;
      if (e.windup <= 0) {
        e.lunging = 0.35;
        e.lungeX = (dx / dist) * 340;
        e.lungeY = (dy / dist) * 340;
      }
    } else if (dist < 260) {
      e.windup = 0.55; // visible telegraph: the dasher flashes before lunging
      e.vx = 0; e.vy = 0;
    } else {
      steerToward(e, player.x, player.y, e.speed);
    }
  } else if (e.kind === 'brute') {
    steerToward(e, player.x, player.y, e.speed);
  }

  e.x += (e.vx + e.knockX) * dt;
  e.y += (e.vy + e.knockY) * dt;
  e.knockX *= 0.86;
  e.knockY *= 0.86;
  clampArena(e);
}

/** Move the boss: slow chase, radial bursts, mite summons, faster when hurt. */
export function updateBoss(boss, env) {
  const { player, dt, rng } = env;
  boss.touchTimer = Math.max(0, boss.touchTimer - dt);
  boss.flash = Math.max(0, boss.flash - dt * 6);
  const enrage = 1 + (1 - boss.hp / boss.maxHp) * 0.7;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  steerToward(boss, player.x, player.y, boss.speed * enrage);
  if (dist < 130) { boss.vx *= -0.4; boss.vy *= -0.4; }

  boss.burstTimer -= dt;
  if (boss.burstTimer <= 0) {
    boss.burstTimer = Math.max(1.2, 2.3 / enrage);
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.1, 0.1);
      env.fireEnemyShot(boss.x, boss.y, Math.cos(a) * 150, Math.sin(a) * 150, 8, 8);
    }
    env.onBossBurst?.();
  }
  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    boss.summonTimer = 6;
    env.summonMites?.(3);
  }

  boss.x += (boss.vx + boss.knockX) * dt;
  boss.y += (boss.vy + boss.knockY) * dt;
  boss.knockX *= 0.86;
  boss.knockY *= 0.86;
  clampArena(boss);
}
