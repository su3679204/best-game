// Every tuning number and colour in one place. The arena is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Survive this many waves and slay the Wave 15 boss to win. */
export const FINAL_WAVE = 15;
export const BOSS_WAVES = [5, 10, 15];

export const PLAYER = {
  radius: 16,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.34,
  bulletSpeed: 740,
  bulletDamage: 14,
  bulletRadius: 5,
  magnetRadius: 120,
  pickupRadius: 26,
  hurtInvulnerable: 0.7,
  contactCooldown: 0.8,
};

/** XP needed to go from level L to L+1. */
export function xpForLevel(level) {
  return 5 + level * 4;
}

export const ENEMIES = {
  mite:   { name: 'Ember Mite',    hp: 20,  speed: 95,  radius: 14, damage: 8,  score: 10, xp: 1, colour: '#e5534b' },
  wisp:   { name: 'Cinder Wisp',   hp: 14,  speed: 185, radius: 11, damage: 8,  score: 15, xp: 1, colour: '#4fd8e8' },
  spitter:{ name: 'Ash Spitter',   hp: 34,  speed: 80,  radius: 15, damage: 8,  score: 25, xp: 2, colour: '#b678f2' },
  dasher: { name: 'Spark Dasher',  hp: 30,  speed: 95,  radius: 13, damage: 12, score: 30, xp: 2, colour: '#f2c94c' },
  brute:  { name: 'Coal Brute',    hp: 110, speed: 55,  radius: 22, damage: 18, score: 50, xp: 3, colour: '#e8823a' },
};

/** Elite variants: tougher, golden, worth more, sometimes drop a heart. */
export const ELITE = { hpMul: 3.2, speedMul: 1.08, radiusMul: 1.35, scoreMul: 5, xpMul: 5 };

export const BOSS = {
  name: 'Cinder Warden',
  hp: 950,
  speed: 62,
  radius: 46,
  damage: 22,
  score: 1000,
  burstInterval: 4.2,
  summonInterval: 6.5,
};

/** How many non-boss foes a wave tries to field, and how fast they arrive. */
export function waveBudget(wave) {
  return 6 + wave * 4;
}
export function spawnInterval(wave) {
  return Math.max(0.35, 1.1 - wave * 0.05);
}

export const PALETTE = {
  backdrop: '#0d0a14',
  floorA: '#171223',
  floorB: '#1b1529',
  wall: '#2b2140',
  lantern: '#f2c94c',
  ember: '#ff7a3c',
  player: '#ffd166',
  cloak: '#3b6ea5',
  text: '#f4ead8',
  muted: '#9a8fb0',
  panel: 'rgba(20, 14, 32, 0.92)',
  panelEdge: '#4a3a6b',
  hp: '#5ad66f',
  hpLow: '#e5534b',
  xp: '#7ab8ff',
  boss: '#ff5a3c',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'emberward.best.v1';
