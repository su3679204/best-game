// The twelve level-up boons and how they apply. A draft offers three; the
// player takes one. Most boons stack; the phoenix feather is one-time, and
// multi-shot caps so a volley never fills the whole screen.
export const UPGRADES = [
  { id: 'split', name: 'Ember Split', desc: '+1 ember bolt per volley', max: 3,
    apply(p) { p.projectiles += 1; } },
  { id: 'pierce', name: 'Piercing Flame', desc: 'Bolts pierce +1 fiend', max: 3,
    apply(p) { p.pierce += 1; } },
  { id: 'nova', name: 'Nova Burst', desc: 'A ring of 12 bolts erupts every 5s', max: 1,
    apply(p) { p.novaInterval = 5; p.novaTimer = 2; } },
  { id: 'phoenix', name: 'Phoenix Feather', desc: 'Revive once at half health', max: 1,
    apply(p) { p.revive += 1; } },
  { id: 'heavy', name: 'Heavy Embers', desc: '+30% bolt damage', max: 5,
    apply(p) { p.damage *= 1.3; } },
  { id: 'rapid', name: 'Rapid Wick', desc: '+20% fire rate', max: 5,
    apply(p) { p.fireInterval = Math.max(0.12, p.fireInterval * 0.83); } },
  { id: 'swift', name: 'Swift Boots', desc: '+12% move speed', max: 4,
    apply(p) { p.speed *= 1.12; } },
  { id: 'magnet', name: 'Lodestone', desc: '+50% gem magnet radius', max: 4,
    apply(p) { p.magnet *= 1.5; } },
  { id: 'sturdy', name: 'Sturdy Lantern', desc: '+25 max health, heal 25', max: 5,
    apply(p) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'reach', name: 'Long Wick', desc: '+25% bolt speed and range', max: 3,
    apply(p) { p.boltSpeed *= 1.25; } },
  { id: 'heart', name: 'Ember Heart', desc: 'Regenerate 1 health per second', max: 3,
    apply(p) { p.regen += 1; } },
  { id: 'greed', name: 'Golden Touch', desc: '+40% XP from gems', max: 3,
    apply(p) { p.xpMult *= 1.4; } },
];

/** Boons the player may still take (not yet at their cap). */
export function availableUpgrades(player) {
  return UPGRADES.filter((u) => (player.boons[u.id] || 0) < u.max);
}

/** Roll three distinct boons for a draft, using the run's rng. */
export function rollChoices(player, rng) {
  const pool = availableUpgrades(player).slice();
  const picks = [];
  while (pool.length > 0 && picks.length < 3) {
    const i = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

/** Apply a chosen boon and record it on the player. */
export function applyUpgrade(player, upgrade) {
  upgrade.apply(player);
  player.boons[upgrade.id] = (player.boons[upgrade.id] || 0) + 1;
}
