// The simulation: waves, combat, experience, win and lose. The world owns
// every moving thing — the player, fiends, the boss, bolts, enemy shots and
// XP gems — and steps them all at a fixed 1/60 s. The main loop owns the
// screen state machine; the world only knows whether the run is over or won.
import {
  ARENA, FINAL_WAVE, BOSS_WAVES, PLAYER_TUNING, xpForLevel, waveComposition,
  spawnInterval, eliteChance,
} from './config.js';
import { makeEnemy, promoteElite, makeBoss, updateEnemy, updateBoss } from './enemies.js';
import { createPlayer, updatePlayer, tryFire, tryNova } from './player.js';
import { rollChoices, applyUpgrade } from './upgrades.js';

const BEST_KEY = 'emberward_best';

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest(score) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ }
}

export function createWorld(rng, audio, particles) {
  const state = {
    player: createPlayer(),
    wave: 0,
    score: 0,
    kills: 0,
    time: 0,
    enemies: [],
    gems: [],
    bolts: [],
    enemyShots: [],
    boss: null,
    spawnQueue: [],
    spawnTimer: 0,
    intermission: 0,
    banner: '',
    bannerTimer: 0,
    levelChoices: null,
    over: false,
    victory: false,
    best: loadBest(),
    cardRects: [],
  };

  function setBanner(text, seconds = 2.2) {
    state.banner = text;
    state.bannerTimer = seconds;
  }

  function spawnPosition() {
    for (let tries = 0; tries < 8; tries++) {
      const side = Math.floor(rng.next() * 4);
      let x = 0;
      let y = 0;
      if (side === 0) { x = rng.range(60, ARENA.width - 60); y = 60; }
      else if (side === 1) { x = rng.range(60, ARENA.width - 60); y = ARENA.height - 60; }
      else if (side === 2) { x = 60; y = rng.range(60, ARENA.height - 60); }
      else { x = ARENA.width - 60; y = rng.range(60, ARENA.height - 60); }
      const d = Math.hypot(x - state.player.x, y - state.player.y);
      if (d > 280) return { x, y };
    }
    return { x: 80, y: 80 };
  }

  function dropGem(x, y, value) {
    const a = rng.range(0, Math.PI * 2);
    state.gems.push({
      x, y,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      value,
      kind: value >= 4 ? 'big' : 'small',
    });
  }

  function damagePlayer(amount) {
    const p = state.player;
    if (p.invulnerable > 0 || state.over || state.victory) return;
    p.hp -= amount;
    p.invulnerable = PLAYER_TUNING.invulnerableAfterHit;
    particles.shake(0.35);
    particles.burst(p.x, p.y, '#ff5a5a', 10, 160);
    audio.hurt();
    if (p.hp > 0) return;
    if (p.revive > 0) {
      p.revive -= 1;
      p.hp = Math.round(p.maxHp * 0.5);
      p.invulnerable = 2;
      setBanner('PHOENIX FEATHER!', 2.5);
      particles.ring(p.x, p.y, '#ffd23c', 26, 260);
      audio.levelUp();
      return;
    }
    p.hp = 0;
    state.over = true;
    if (state.score > state.best) { state.best = state.score; saveBest(state.score); }
    particles.ring(p.x, p.y, '#ff5a5a', 30, 280);
    audio.lose();
    audio.stopMusic();
  }

  function killEnemy(e) {
    state.kills += 1;
    state.score += e.score;
    particles.burst(e.x, e.y, e.color, e.elite ? 22 : 12, 200);
    particles.text(e.x, e.y - e.radius, `+${e.score}`, '#ffd23c');
    audio.enemyDie();
    const gems = e.kind === 'brute' ? 2 : 1;
    for (let i = 0; i < gems; i++) dropGem(e.x, e.y, e.xp);
    if (e.kind === 'boss') {
      particles.ring(e.x, e.y, '#ffb347', 36, 320);
      particles.shake(1);
      for (let i = 0; i < 8; i++) dropGem(e.x, e.y, 3);
      audio.bossRoar();
    }
  }

  function startWave(n) {
    state.wave = n;
    state.enemies = [];
    state.enemyShots = [];
    state.boss = null;
    state.intermission = 0;
    state.spawnQueue = waveComposition(n);
    // Shuffle the queue so kinds arrive mixed, not in blocks.
    rng.shuffle(state.spawnQueue);
    state.spawnTimer = 0.6;
    if (BOSS_WAVES.includes(n)) {
      state.boss = makeBoss(n);
      setBanner(`WAVE ${n} — ${state.boss.name}`, 3);
      audio.bossRoar();
      // A boss wave still trickles a few mites in behind it.
      state.spawnQueue = ['mite', 'mite', 'mite', 'mite'];
    } else {
      setBanner(`WAVE ${n}`, 2.2);
    }
  }

  function startRun() {
    state.player = createPlayer();
    state.wave = 0;
    state.score = 0;
    state.kills = 0;
    state.time = 0;
    state.enemies = [];
    state.gems = [];
    state.bolts = [];
    state.enemyShots = [];
    state.boss = null;
    state.levelChoices = null;
    state.over = false;
    state.victory = false;
    state.best = loadBest();
    startWave(1);
  }

  function spawnNext() {
    const kind = state.spawnQueue.shift();
    if (!kind) return;
    const pos = spawnPosition();
    const e = makeEnemy(kind, pos.x, pos.y, state.wave, rng);
    if (rng.chance(eliteChance(state.wave))) promoteElite(e);
    state.enemies.push(e);
    particles.burst(pos.x, pos.y, e.color, 6, 90);
  }

  function updateBolts(dt) {
    for (const b of state.bolts) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < ARENA.wall || b.x > ARENA.width - ARENA.wall || b.y < ARENA.wall || b.y > ARENA.height - ARENA.wall) b.life = 0;
    }
    const targets = state.boss ? [...state.enemies, state.boss] : state.enemies;
    for (const b of state.bolts) {
      if (b.life <= 0) continue;
      for (const e of targets) {
        if (e.hp <= 0 || b.hitIds.has(e.id)) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < e.radius + b.radius) {
          b.hitIds.add(e.id);
          e.hp -= b.damage;
          e.flash = 1;
          const kd = Math.hypot(b.vx, b.vy) || 1;
          e.knockX += (b.vx / kd) * 90;
          e.knockY += (b.vy / kd) * 90;
          particles.burst(b.x, b.y, '#ffb347', 5, 140);
          particles.text(e.x, e.y - e.radius - 6, String(Math.round(b.damage)), '#ffffff');
          audio.hit();
          if (e.hp <= 0) killEnemy(e);
          if (b.pierce > 0) { b.pierce -= 1; } else { b.life = 0; }
          break;
        }
      }
    }
    state.bolts = state.bolts.filter((b) => b.life > 0);
    state.enemies = state.enemies.filter((e) => e.hp > 0);
    if (state.boss && state.boss.hp <= 0) {
      state.boss = null;
      if (state.wave === FINAL_WAVE) {
        state.victory = true;
        // Score for the boss was already added once by killEnemy.
        if (state.score > state.best) { state.best = state.score; saveBest(state.score); }
        audio.win();
        audio.stopMusic();
      }
    }
  }

  function updateGems(dt) {
    const p = state.player;
    for (const g of state.gems) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.9;
      g.vy *= 0.9;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < p.magnet) {
        const pull = 420 * (1 - d / (p.magnet + 60));
        g.x += (dx / d) * pull * dt;
        g.y += (dy / d) * pull * dt;
      }
      if (d < 26) {
        g.taken = true;
        const gained = Math.max(1, Math.round(g.value * p.xpMult));
        p.xp += gained;
        state.score += 2;
        particles.embers(g.x, g.y, '#7ee787');
        audio.pickup();
      }
    }
    state.gems = state.gems.filter((g) => !g.taken);
    // Level up, one draft at a time.
    if (!state.levelChoices && p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level += 1;
      p.xpNeed = xpForLevel(p.level);
      state.levelChoices = rollChoices(p, rng);
      particles.ring(p.x, p.y, '#ffd23c', 24, 240);
      audio.levelUp();
    }
  }

  function update(input, dt) {
    if (state.over || state.victory) return;
    state.time += dt;
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    const p = state.player;
    updatePlayer(p, input, dt);

    // Fire and nova.
    const volley = tryFire(p, input.firing());
    if (volley.length) { state.bolts.push(...volley); audio.shoot(); }
    const nova = tryNova(p);
    if (nova.length) {
      state.bolts.push(...nova);
      particles.ring(p.x, p.y, '#ffb347', 12, 200);
      audio.nova();
    }

    // Spawn the wave's queue on a timer.
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = spawnInterval(state.wave);
        spawnNext();
      }
    }

    const env = {
      player: p,
      dt,
      rng,
      fireEnemyShot(x, y, vx, vy, damage, radius) {
        state.enemyShots.push({ x, y, vx, vy, damage, radius, life: 4 });
      },
      summonMites(n) {
        for (let i = 0; i < n; i++) {
          if (state.enemies.length > 40) break;
          const pos = spawnPosition();
          state.enemies.push(makeEnemy('mite', pos.x, pos.y, state.wave, rng));
        }
      },
      onBossBurst() { particles.shake(0.2); },
    };

    for (const e of state.enemies) {
      updateEnemy(e, env);
      // Touch damage, with a per-fiend cooldown.
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < e.radius + p.radius) {
        if (e.touchTimer <= 0) {
          e.touchTimer = 0.7;
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const len = Math.hypot(dx, dy) || 1;
          e.knockX -= (dx / len) * 120;
          e.knockY -= (dy / len) * 120;
          damagePlayer(e.damage);
        }
      }
    }
    if (state.boss) {
      updateBoss(state.boss, env);
      const b = state.boss;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (b && d < b.radius + p.radius && b.touchTimer <= 0) {
        b.touchTimer = 0.8;
        damagePlayer(b.damage);
      }
    }

    // Enemy shots drift and hurt on contact.
    for (const s of state.enemyShots) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < s.radius + p.radius) {
        s.life = 0;
        damagePlayer(s.damage);
      }
    }
    state.enemyShots = state.enemyShots.filter((s) => s.life > 0);

    updateBolts(dt);
    updateGems(dt);
    particles.update(dt);

    // Wave cleared: everything spawned and slain, no boss standing.
    if (!state.over && !state.victory && state.spawnQueue.length === 0 && state.enemies.length === 0 && !state.boss) {
      if (state.wave < FINAL_WAVE) {
        if (state.intermission <= 0) {
          state.intermission = 2.2;
          setBanner(`WAVE ${state.wave} CLEARED`, 2);
          state.score += 50 + state.wave * 10;
          audio.waveClear();
        } else {
          state.intermission -= dt;
          if (state.intermission <= 0) startWave(state.wave + 1);
        }
      }
    }
  }

  /** Take one of the three drafted boons and resume play. */
  function chooseUpgrade(index) {
    if (!state.levelChoices) return false;
    const choice = state.levelChoices[index];
    if (!choice) return false;
    applyUpgrade(state.player, choice);
    state.levelChoices = null;
    particles.ring(state.player.x, state.player.y, '#7ee787', 16, 200);
    return true;
  }

  return { state, startRun, startWave, update, chooseUpgrade, damagePlayer };
}
