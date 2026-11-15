// The level-up draft: on each level the player picks 1 of 3 upgrade cards.
// Each upgrade is a small pure function on the player's weapon stats, so the
// dossier outline reads as a list of named choices rather than magic numbers.
export const UPGRADES = [
  {
    id: 'swift-hands', name: 'Swift Hands', icon: '⚡',
    desc: '+18% fire rate. Your lantern spits embers faster.',
    apply(p) { p.fireInterval *= 0.82; },
  },
  {
    id: 'heavy-embers', name: 'Heavy Embers', icon: '🔥',
    desc: '+25% bolt damage. Each ember hits like a coal.',
    apply(p) { p.bulletDamage *= 1.25; },
  },
  {
    id: 'twin-shot', name: 'Twin Shot', icon: '✦',
    desc: '+1 bolt per shot. A second ember joins the volley.',
    apply(p) { p.projectiles += 1; },
  },
  {
    id: 'piercing-light', name: 'Piercing Light', icon: '➶',
    desc: 'Bolts pierce +1 foe. Nothing stops the light.',
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'swift-boots', name: 'Swift Boots', icon: '👢',
    desc: '+12% move speed. Outrun the dark a little longer.',
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'lantern-heart', name: 'Lantern Heart', icon: '❤',
    desc: '+25 max health and heal 25 now. The flame feeds you.',
    apply(p) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'magnet-charm', name: 'Magnet Charm', icon: '🧲',
    desc: '+60% ember pickup radius. The spoils come to you.',
    apply(p) { p.magnetRadius *= 1.6; },
  },
  {
    id: 'nova-burst', name: 'Nova Burst', icon: '☀',
    desc: 'Every 6 s a nova blasts foes near you for 30 damage.',
    apply(p) { p.novaLevel += 1; p.novaDamage += 30; if (p.novaInterval <= 0) p.novaInterval = 6; else p.novaInterval = Math.max(3.5, p.novaInterval - 0.8); },
  },
  {
    id: 'keen-eye', name: 'Keen Eye', icon: '◎',
    desc: '+10% critical chance. Crits deal double damage.',
    apply(p) { p.critChance += 0.1; },
  },
  {
    id: 'phoenix-feather', name: 'Phoenix Feather', icon: '🪶', once: true,
    desc: 'Revive once at 50% health when you would fall.',
    apply(p) { p.revive = true; },
  },
  {
    id: 'long-burn', name: 'Long Burn', icon: '➤',
    desc: '+15% bolt speed and +20% bolt range.',
    apply(p) { p.bulletSpeed *= 1.15; p.bulletRange *= 1.2; },
  },
  {
    id: 'ember-rain', name: 'Ember Rain', icon: '☄',
    desc: '+1 bolt per shot, −10% damage. A wider storm.',
    apply(p) { p.projectiles += 1; p.bulletDamage *= 0.9; },
  },
];

/** Draw 3 distinct cards, never repeating a once-only upgrade already taken. */
export function draftUpgrades(random, takenIds) {
  const pool = UPGRADES.filter((u) => !(u.once && takenIds.includes(u.id)));
  const picks = [];
  const bag = [...pool];
  while (picks.length < 3 && bag.length > 0) {
    const i = Math.floor(random() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks;
}
