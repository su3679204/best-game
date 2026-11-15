// Deterministic staged scenes used only for screenshots. Each scene builds
// a fixed world state from a seeded generator (no wall clock, no live loop),
// so the same ?shot=<scene>&seed=1 always renders the same picture.
import { createRng } from './random.js';
import { makeEnemy } from './enemies.js';
import { rollChoices } from './upgrades.js';
import { ARENA } from './config.js';

/** Stage `world` into the named scene and return the screen to render. */
export function stageShot(world, scene, seed) {
  const state = world.state;
  const rng = createRng(seed || 1);
  // NOTE: startRun() replaces state.player with a fresh object, so the
  // player handle must be taken AFTER staging a run, never before it.
  if (scene === 'title') {
    world.startRun();
    state.enemies = [];
    const spots = [[300, 250], [980, 200], [820, 520], [420, 560], [1080, 430]];
    const kinds = ['mite', 'wisp', 'spitter', 'dasher', 'brute'];
    spots.forEach(([x, y], i) => state.enemies.push(makeEnemy(kinds[i], x, y, 1, rng)));
    state.spawnQueue = [];
    state.banner = '';
    state.bannerTimer = 0;
    state.score = 0;
    state.kills = 0;
    return 'title';
  }

  if (scene === 'levelup') {
    world.startRun();
    const p = state.player;
    state.wave = 4;
    state.score = 1680;
    state.kills = 31;
    state.time = 142;
    p.level = 5;
    p.xp = 3;
    p.hp = 82;
    p.x = 480;
    p.y = 430;
    p.aimX = 820;
    p.aimY = 300;
    state.enemies = [
      makeEnemy('mite', 820, 300, 4, rng),
      makeEnemy('wisp', 950, 380, 4, rng),
      makeEnemy('spitter', 1020, 220, 4, rng),
      makeEnemy('dasher', 700, 180, 4, rng),
    ];
    state.gems = [
      { x: 560, y: 480, vx: 0, vy: 0, value: 1, kind: 'small' },
      { x: 620, y: 520, vx: 0, vy: 0, value: 2, kind: 'small' },
      { x: 420, y: 360, vx: 0, vy: 0, value: 1, kind: 'small' },
    ];
    state.spawnQueue = [];
    state.banner = '';
    state.bannerTimer = 0;
    state.levelChoices = rollChoices(p, rng);
    return 'levelup';
  }

  if (scene === 'win') {
    world.startRun();
    const p = state.player;
    state.wave = 15;
    state.score = 8450;
    state.kills = 142;
    state.time = 612;
    p.level = 12;
    p.hp = 64;
    p.x = ARENA.width / 2;
    p.y = 480;
    p.aimX = 640;
    p.aimY = 200;
    state.enemies = [];
    state.boss = null;
    state.gems = [];
    state.spawnQueue = [];
    state.banner = '';
    state.bannerTimer = 0;
    state.victory = true;
    state.best = Math.max(state.best, 8450);
    return 'victory';
  }

  // Default: 'play' — a busy mid-fight on wave 3 with the HUD visible.
  world.startRun();
  const p = state.player;
  state.wave = 3;
  state.score = 1240;
  state.kills = 23;
  state.time = 95;
  p.level = 4;
  p.xp = 5;
  p.hp = 78;
  p.x = 480;
  p.y = 420;
  p.aimX = 900;
  p.aimY = 280;
  const kinds = ['mite', 'mite', 'wisp', 'spitter', 'dasher', 'mite', 'brute', 'wisp', 'mite'];
  const spots = [[900, 280], [1020, 380], [860, 180], [1080, 240], [760, 520], [620, 200], [980, 540], [420, 300], [700, 620]];
  state.enemies = kinds.map((k, i) => makeEnemy(k, spots[i][0], spots[i][1], 3, rng));
  state.enemies[0].hp = Math.round(state.enemies[0].maxHp * 0.4);
  state.enemies[0].flash = 0.8;
  state.gems = [
    { x: 560, y: 480, vx: 0, vy: 0, value: 1, kind: 'small' },
    { x: 640, y: 540, vx: 0, vy: 0, value: 2, kind: 'small' },
    { x: 400, y: 360, vx: 0, vy: 0, value: 1, kind: 'small' },
    { x: 720, y: 460, vx: 0, vy: 0, value: 4, kind: 'big' },
    { x: 520, y: 300, vx: 0, vy: 0, value: 1, kind: 'small' },
  ];
  state.bolts = [
    { x: 560, y: 400, vx: 380, vy: -140, damage: 12, pierce: 0, life: 0.8, radius: 6, hitIds: new Set() },
    { x: 620, y: 380, vx: 400, vy: -100, damage: 12, pierce: 0, life: 0.8, radius: 6, hitIds: new Set() },
    { x: 500, y: 440, vx: 360, vy: -180, damage: 12, pierce: 0, life: 0.8, radius: 6, hitIds: new Set() },
  ];
  state.spawnQueue = [];
  state.banner = '';
  state.bannerTimer = 0;
  return 'playing';
}
