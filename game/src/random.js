// A small seeded generator (mulberry32) so a screenshot seed replays the same arena.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function range(random, min, max) {
  return min + random() * (max - min);
}

export function chance(random, p) {
  return random() < p;
}
