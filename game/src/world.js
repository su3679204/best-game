// The simulation: waves, combat, XP and level-ups, pickups, the boss, and the
// win/lose conditions. It knows nothing about the canvas or the DOM; the
// renderer paints whatever state it holds, which is what makes the staged
// screenshots deterministic.
import { BOSS_WAVES, FIELD, FINAL_WAVE, PLAYER, spawnInterval, waveBudget, xpForLevel } from './config.js';
import { createPlayer, fireVolley } from './player.js';
import { makeBoss, makeEnemy, pickKind, stepEnemy } from './enemies.js';
import { draftUpgrades } from './upgrades.js';
import { createParticles } from './particles.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_LEVELUP = 2;
export const EVENT_WAVE = 4;
export const EVENT_BOSS = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_NOVA = 64;

export function createWorld(random) {
  const particles = createParticles();
  const state = {
    random,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    ebullets: [],
    gems: [],
    pickups: [],
    wave: 0,
    waveState: 'intermission', // 'intermission' | 'spawning' | 'boss' | 'done'
    waveTimer: 1.2,
    toSpawn: 0,
    spawnTimer: 0,
    boss: null,
    bossSpawned: false,
    kills: 0,
    score: 0,
    time: 0,
    banner: '',
    bannerTimer: 0,
    levelChoices: null,
    pendingLevels: 0,
    victory: false,
    over: false,
    particles,
    shake: 0,
  };

  function startWave(wave) {
    state.wave = wave;
    state.boss = null;
    state.bossSpawned = false;
    state.toSpawn = waveBudget(wave);
    state.spawnTimer = 0.4;
    state.waveState = BOSS_WAVES.includes(wave) ? 'boss' : 'spawning';
    state.banner = BOSS_WAVES.includes(wave) ? `WAVE ${wave} — THE ${wave === FINAL_WAVE ? 'FINAL ' : ''}CINDER WARDEN` : `WAVE ${wave}`;
    state.bannerTimer = 2.6;
    if (BOSS_WAVES.includes(wave)) {
      state.boss = makeBoss(wave);
      state.bossSpawned = true;
      state.enemies.push(state.boss);
    }
    return BOSS_WAVES.includes(wave) ? EVENT_BOSS : EVENT_WAVE;
  }

  function dropGem(x, y, value) {
    state.gems.push({ x, y, value, vx: (random() - 0.5) * 120, vy: (random() - 0.5) * 120, magnet: false, life: 25 });
  }

  function dropPickup(x, y, kind) {
    state.pickups.push({ x, y, kind, life: 12, phase: random() * Math.PI * 2 });
  }

  function killEnemy(e, index) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.score += e.score;
    particles.burst(e.x, e.y, e.colour, e.kind === 'boss' ? 60 : 16, e.kind === 'boss' ? 260 : 170, e.kind === 'boss' ? 6 : 4);
    particles.shake(e.kind === 'boss' ? 14 : 3, 0.25);
    for (let i = 0; i < e.xp; i += 1) dropGem(e.x, e.y, 1);
    if (e.elite) {
      dropGem(e.x, e.y, 5);
      if (random() < 0.5) dropPickup(e.x, e.y, 'heart');
    }
    if (e.kind === 'brute' && random() < 0.25) dropPickup(e.x, e.y, 'heart');
    if (e.kind === 'boss') {
      dropGem(e.x, e.y, 20);
      dropPickup(e.x, e.y, 'heart');
      state.score += 500;
      state.boss = null;
      if (state.wave === FINAL_WAVE) {
        state.victory = true;
        return EVENT_WIN;
      }
      state.waveState = 'done';
      state.waveTimer = 3;
    }
    return EVENT_NONE;
  }

  function damageEnemy(e, index, dmg, kx, ky) {
    e.hp -= dmg;
    e.flash = 0.12;
    e.knockX += kx;
    e.knockY += ky;
    particles.trail(e.x, e.y, '#ffd166');
    if (e.hp <= 0) return killEnemy(e, index);
    return EVENT_NONE;
  }

  function gainXp(amount) {
    const p = state.player;
    p.xp += amount;
    while (p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level);
      p.level += 1;
      state.pendingLevels += 1;
    }
    if (state.pendingLevels > 0 && !state.levelChoices) {
      state.levelChoices = draftUpgrades(random, p.takenUpgrades);
      state.pendingLevels -= 1;
      return EVENT_LEVELUP;
    }
    return EVENT_NONE;
  }

  function hurtPlayer(dmg) {
    const p = state.player;
    if (p.invulnerable > 0 || state.over || state.victory) return EVENT_NONE;
    p.hp -= dmg;
    p.invulnerable = PLAYER.hurtInvulnerable;
    particles.burst(p.x, p.y, '#e5534b', 14, 180);
    particles.shake(8, 0.3);
    if (p.hp <= 0) {
      if (p.revive && !p.reviveUsed) {
        p.reviveUsed = true;
        p.hp = Math.floor(p.maxHp * 0.5);
        p.invulnerable = 2;
        particles.ring(p.x, p.y, '#ffd94d', 24, 320);
        particles.floatText(p.x, p.y - 30, 'PHOENIX!', '#ffd94d', 22);
        return EVENT_HIT;
      }
      p.hp = 0;
      state.over = true;
      particles.burst(p.x, p.y, '#ffd166', 50, 260, 6);
      return EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function step(dt, move, aim, firing) {
    const p = state.player;
    let events = EVENT_NONE;
    if (state.over || state.victory) {
      particles.step(dt);
      return events;
    }
    state.time += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (p.invulnerable > 0) p.invulnerable -= dt;

    // --- Player movement ---
    p.moving = move.x !== 0 || move.y !== 0;
    p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x + move.x * p.speed * dt));
    p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y + move.y * p.speed * dt));
    if (p.moving) p.walkPhase += dt * 12;
    p.aimX = aim.x;
    p.aimY = aim.y;

    // --- Firing ---
    p.fireTimer -= dt;
    if (firing && p.fireTimer <= 0) {
      p.fireTimer = p.fireInterval;
      for (const b of fireVolley(p, random)) state.bullets.push(b);
      particles.trail(p.x + Math.cos(Math.atan2(aim.y - p.y, aim.x - p.x)) * 22, p.y + Math.sin(Math.atan2(aim.y - p.y, aim.x - p.x)) * 22, '#ffb347');
    }

    // --- Nova ---
    if (p.novaLevel > 0) {
      p.novaTimer -= dt;
      if (p.novaTimer <= 0) {
        p.novaTimer = p.novaInterval;
        particles.ring(p.x, p.y, '#ff9d5c', 28, 340);
        for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
          const e = state.enemies[i];
          if (Math.hypot(e.x - p.x, e.y - p.y) < 190) {
            const ev = damageEnemy(e, i, p.novaDamage, 0, 0);
            if (ev & EVENT_WIN) events |= EVENT_WIN;
          }
        }
        events |= EVENT_NOVA;
      }
    }

    // --- Waves ---
    if (state.waveState === 'intermission') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) events |= startWave(state.wave + 1);
    } else if (state.waveState === 'spawning' || state.waveState === 'boss') {
      if (state.toSpawn > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = spawnInterval(state.wave);
          state.toSpawn -= 1;
          state.enemies.push(makeEnemy(random, pickKind(random, state.wave), state.wave, p.x, p.y));
        }
      } else if (state.waveState === 'spawning' && state.enemies.length === 0) {
        state.waveState = 'done';
        state.waveTimer = 3;
      } else if (state.waveState === 'boss' && !state.boss && state.enemies.length === 0) {
        state.waveState = 'done';
        state.waveTimer = 3;
      }
    } else if (state.waveState === 'done') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        if (state.wave >= FINAL_WAVE) {
          state.victory = true;
          events |= EVENT_WIN;
        } else {
          state.waveState = 'intermission';
          state.waveTimer = 2.2;
        }
      }
    }

    // --- Enemies ---
    for (const e of state.enemies) {
      const shots = stepEnemy(e, dt, p.x, p.y, random, state.time);
      for (const s of shots) state.ebullets.push(s);
      if (e.summon) {
        e.summon = false;
        for (let i = 0; i < 4; i += 1) {
          state.enemies.push(makeEnemy(random, 'mite', state.wave, p.x, p.y));
        }
      }
      // Contact damage, once per enemy per cooldown.
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < e.radius + p.radius - 2 && e.touchTimer <= 0) {
        e.touchTimer = PLAYER.contactCooldown;
        const ev = hurtPlayer(e.damage);
        events |= ev;
        if (ev & EVENT_OVER) return events;
      }
    }

    // --- Player bullets vs enemies ---
    for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
      const b = state.bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.travelled += Math.hypot(b.vx, b.vy) * dt;
      let dead = b.travelled > b.range || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height;
      if (!dead) {
        for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
          const e = state.enemies[ei];
          if (b.hitIds.includes(e.id)) continue;
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
            const kb = 140;
            const nx = (e.x - p.x) / (Math.hypot(e.x - p.x, e.y - p.y) || 1);
            const ny = (e.y - p.y) / (Math.hypot(e.x - p.x, e.y - p.y) || 1);
            const ev = damageEnemy(e, ei, b.damage, nx * kb, ny * kb);
            if (ev & EVENT_WIN) events |= EVENT_WIN;
            if (b.crit) particles.floatText(e.x, e.y - e.radius, `CRIT ${Math.round(b.damage)}`, '#ffd94d', 18);
            else particles.floatText(e.x, e.y - e.radius, `${Math.round(b.damage)}`, '#f4ead8', 14);
            b.hitIds.push(e.id);
            if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              dead = true;
            }
            break;
          }
        }
      }
      if (dead) {
        particles.burst(b.x, b.y, '#ffb347', 3, 60, 3);
        state.bullets.splice(bi, 1);
      }
    }

    // --- Enemy bullets vs player ---
    for (let i = state.ebullets.length - 1; i >= 0; i -= 1) {
      const b = state.ebullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height;
      if (!dead && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 2) {
        dead = true;
        const ev = hurtPlayer(b.damage);
        events |= ev;
        if (ev & EVENT_OVER) return events;
      }
      if (dead) state.ebullets.splice(i, 1);
    }

    // --- Gems: drift, magnetise, collect ---
    for (let i = state.gems.length - 1; i >= 0; i -= 1) {
      const g = state.gems[i];
      g.life -= dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.9;
      g.vy *= 0.9;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < p.magnetRadius) g.magnet = true;
      if (g.magnet) {
        const pull = 520 * dt;
        g.x += ((p.x - g.x) / (d || 1)) * pull;
        g.y += ((p.y - g.y) / (d || 1)) * pull;
      }
      if (d < PLAYER.pickupRadius || g.life <= 0) {
        if (d < PLAYER.pickupRadius) {
          state.score += g.value;
          const ev = gainXp(g.value);
          events |= ev;
          particles.trail(g.x, g.y, '#7ab8ff');
        }
        state.gems.splice(i, 1);
      }
    }

    // --- Pickups ---
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pk = state.pickups[i];
      pk.life -= dt;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < PLAYER.pickupRadius + 8) {
        if (pk.kind === 'heart') {
          p.hp = Math.min(p.maxHp, p.hp + 20);
          particles.floatText(p.x, p.y - 28, '+20 HP', '#5ad66f', 18);
        }
        state.pickups.splice(i, 1);
      } else if (pk.life <= 0) {
        state.pickups.splice(i, 1);
      }
    }

    particles.step(dt);
    return events;
  }

  function reset() {
    const fresh = createWorld(random).state;
    for (const key of Object.keys(state)) {
      if (key !== 'random') state[key] = fresh[key];
    }
  }

  return { state, step, reset, startWave, gainXp };
}
