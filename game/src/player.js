// The lantern-bearer: movement, the ember volley, and the level-up draft state.
import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    radius: PLAYER.radius,
    level: 1,
    xp: 0,
    fireTimer: 0,
    fireInterval: PLAYER.fireInterval,
    bulletDamage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletRange: 520,
    projectiles: 1,
    pierce: 0,
    critChance: 0,
    magnetRadius: PLAYER.magnetRadius,
    novaLevel: 0,
    novaDamage: 0,
    novaInterval: 0,
    novaTimer: 0,
    revive: false,
    reviveUsed: false,
    invulnerable: 0,
    aimX: FIELD.width / 2,
    aimY: 100,
    moving: false,
    walkPhase: 0,
    takenUpgrades: [],
  };
}

/** Fire one volley toward the aim point. Returns the bullets it made. */
export function fireVolley(player, random) {
  const dx = player.aimX - player.x;
  const dy = player.aimY - player.y;
  const base = Math.atan2(dy, dx);
  const n = player.projectiles;
  const spread = 0.14;
  const bullets = [];
  for (let i = 0; i < n; i += 1) {
    const offset = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
    const a = base + offset;
    const crit = random() < player.critChance;
    bullets.push({
      x: player.x + Math.cos(a) * (player.radius + 6),
      y: player.y + Math.sin(a) * (player.radius + 6),
      vx: Math.cos(a) * player.bulletSpeed,
      vy: Math.sin(a) * player.bulletSpeed,
      radius: PLAYER.bulletRadius,
      damage: player.bulletDamage * (crit ? 2 : 1),
      crit,
      pierce: player.pierce,
      travelled: 0,
      range: player.bulletRange,
      hitIds: [],
    });
  }
  return bullets;
}
