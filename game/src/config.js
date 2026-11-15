// Emberward tuning: every number the game balances on lives here, so a
// difficulty tweak is one edit in one place. Colours are the lantern palette:
// warm ember light against a cold, dark valley.
export const ARENA = { width: 1280, height: 720, wall: 26 };

export const PALETTE = {
  bg: '#0d0a14',
  arena: '#171226',
  arenaEdge: '#2a2140',
  floorDot: '#241c38',
  lantern: '#ffb347',
  ember: '#ff6b35',
  emberDeep: '#e63e21',
  gold: '#ffd23c',
  hp: '#ff5a5a',
  hpBack: '#3a2030',
  xp: '#7ee787',
  text: '#f5ead6',
  dim: '#a89ec2',
  card: '#221a33',
  cardEdge: '#ffb347',
  boss: '#c0392b',
};

export const PLAYER_TUNING = {
  maxHp: 100,
  speed: 235,
  radius: 14,
  boltDamage: 12,
  boltSpeed: 540,
  fireInterval: 0.3,
  projectiles: 1,
  pierce: 0,
  magnet: 95,
  xpNeedBase: 6,
  xpNeedStep: 5,
  invulnerableAfterHit: 0.9,
  touchCooldown: 0.7,
};

// One entry per fiend kind: health, speed, size, touch damage, XP and score.
// Wave scaling multiplies health (and a little speed) in enemies.js.
export const ENEMY_TYPES = {
  mite:   { hp: 18, speed: 92, radius: 13, damage: 5,  xp: 1, score: 10, color: '#ff7a3c', name: 'Ember Mite' },
  wisp:   { hp: 14, speed: 58, radius: 12, damage: 4,  xp: 1, score: 15, color: '#c9a7ff', name: 'Cinder Wisp' },
  spitter:{ hp: 22, speed: 72, radius: 14, damage: 5,  xp: 2, score: 20, color: '#7ee787', name: 'Ash Spitter' },
  dasher: { hp: 20, speed: 78, radius: 13, damage: 9,  xp: 2, score: 25, color: '#ffd23c', name: 'Spark Dasher' },
  brute:  { hp: 70, speed: 44, radius: 20, damage: 13, xp: 4, score: 40, color: '#b08968', name: 'Coal Brute' },
};

export const ELITE = { hpMult: 2.2, speedMult: 1.15, xpMult: 3, scoreMult: 3, radiusMult: 1.15 };

export const BOSS_TUNING = {
  5:  { hp: 380,  speed: 52, radius: 34, damage: 18, score: 500, name: 'Cinder Warden' },
  10: { hp: 700,  speed: 58, radius: 36, damage: 20, score: 800, name: 'Cinder Warden' },
  15: { hp: 1150, speed: 64, radius: 38, damage: 22, score: 1500, name: 'The Cinder Warden' },
};

export const FINAL_WAVE = 15;
export const BOSS_WAVES = [5, 10, 15];

/** XP gems needed to go from `level` to `level + 1`. */
export function xpForLevel(level) {
  return PLAYER_TUNING.xpNeedBase + (level - 1) * PLAYER_TUNING.xpNeedStep;
}

/** How many of each kind a wave fields. Early waves are gentle on purpose. */
export function waveComposition(wave) {
  const list = [];
  const add = (kind, n) => { for (let i = 0; i < n; i++) list.push(kind); };
  add('mite', 2 + wave);
  if (wave >= 2) add('wisp', wave - 1);
  if (wave >= 3) add('spitter', Math.floor(wave / 2));
  if (wave >= 4) add('dasher', Math.floor((wave - 1) / 2));
  if (wave >= 6) add('brute', Math.floor(wave / 3));
  return list;
}

/** Seconds between spawns inside a wave; faster as waves climb, never frantic. */
export function spawnInterval(wave) {
  return Math.max(0.5, 1.3 - wave * 0.06);
}

/** Chance a spawned fiend is a golden elite. */
export function eliteChance(wave) {
  if (wave < 4) return 0;
  return Math.min(0.18, 0.03 * wave);
}
