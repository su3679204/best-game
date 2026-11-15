// The lantern-bearer: movement, health, and its volley of ember bolts.
// The player object is plain data; these functions move it and fire from it.
import { PLAYER_TUNING, ARENA, xpForLevel } from './config.js';

export function createPlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2,
    vx: 0, vy: 0,
    radius: PLAYER_TUNING.radius,
    hp: PLAYER_TUNING.maxHp,
    maxHp: PLAYER_TUNING.maxHp,
    level: 1,
    xp: 0,
    xpNeed: xpForLevel(1),
    speed: PLAYER_TUNING.speed,
    damage: PLAYER_TUNING.boltDamage,
    boltSpeed: PLAYER_TUNING.boltSpeed,
    fireInterval: PLAYER_TUNING.fireInterval,
    fireTimer: 0,
    projectiles: PLAYER_TUNING.projectiles,
    pierce: PLAYER_TUNING.pierce,
    magnet: PLAYER_TUNING.magnet,
    xpMult: 1,
    regen: 0,
    novaTimer: 0,
    novaInterval: 0, // 0 means the nova boon is not owned
    revive: 0,
    invulnerable: 0,
    aimX: 640,
    aimY: 300,
    boons: {},
  };
}

/** Move with the input vector; the lantern bearer never leaves the arena. */
export function updatePlayer(player, input, dt) {
  const v = input.moveVector();
  player.vx = v.x * player.speed;
  player.vy = v.y * player.speed;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  const m = ARENA.wall + player.radius;
  player.x = Math.max(m, Math.min(ARENA.width - m, player.x));
  player.y = Math.max(m, Math.min(ARENA.height - m, player.y));
  player.aimX = input.mouseX;
  player.aimY = input.mouseY;
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (player.regen > 0 && player.hp > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  }
  if (player.novaInterval > 0) player.novaTimer -= dt;
}

/** The direction the bearer is aiming, in radians, toward the mouse. */
export function aimAngle(player) {
  return Math.atan2(player.aimY - player.y, player.aimX - player.x);
}

/** Fire one volley toward the mouse when the cooldown allows. Returns bolts. */
export function tryFire(player, firing) {
  if (!firing || player.fireTimer > 0) return [];
  player.fireTimer = player.fireInterval;
  const bolts = [];
  const base = aimAngle(player);
  const n = player.projectiles;
  for (let i = 0; i < n; i++) {
    const spread = (i - (n - 1) / 2) * 0.14;
    const a = base + spread;
    bolts.push({
      x: player.x + Math.cos(a) * 20,
      y: player.y + Math.sin(a) * 20,
      vx: Math.cos(a) * player.boltSpeed,
      vy: Math.sin(a) * player.boltSpeed,
      damage: player.damage,
      pierce: player.pierce,
      life: 0.95,
      radius: 6,
      hitIds: new Set(),
    });
  }
  return bolts;
}

/** The nova boon: a ring of bolts around the player, every few seconds. */
export function tryNova(player) {
  if (player.novaInterval <= 0 || player.novaTimer > 0) return [];
  player.novaTimer = player.novaInterval;
  const bolts = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    bolts.push({
      x: player.x + Math.cos(a) * 22,
      y: player.y + Math.sin(a) * 22,
      vx: Math.cos(a) * player.boltSpeed * 0.85,
      vy: Math.sin(a) * player.boltSpeed * 0.85,
      damage: player.damage,
      pierce: 0,
      life: 0.7,
      radius: 6,
      hitIds: new Set(),
    });
  }
  return bolts;
}
