// Deterministic staged scenes for the screenshots: each runs the real simulation
// a fixed number of fixed steps from a seed, then hands the renderer a state to
// paint. ?shot=title|play|levelup|win (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady.
import { STEP } from './config.js';
import { SCREEN_LEVELUP, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { EVENT_LEVELUP } from './world.js';
import { makeEnemy } from './enemies.js';
import { fireVolley } from './player.js';

/** Autopilot: drift in a slow circle, aim at the nearest foe, always firing. */
function autopilot(world, t) {
  const s = world.state;
  const p = s.player;
  const move = { x: Math.cos(t * 0.5), y: Math.sin(t * 0.5) };
  let aim = { x: p.x + 200, y: p.y };
  let best = Infinity;
  for (const e of s.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) {
      best = d;
      aim = { x: e.x, y: e.y };
    }
  }
  return { move, aim, firing: true };
}

function runSteps(world, seconds, driver) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const t = i * STEP;
    const input = driver ? driver(world, t) : { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false };
    // On the title screen the lantern-bearer cannot be hurt: the game plays behind it.
    world.state.player.invulnerable = Math.max(world.state.player.invulnerable, STEP * 2);
    world.state.player.hp = world.state.player.maxHp;
    world.step(STEP, input.move, input.aim, input.firing);
    if (world.state.over || world.state.victory) break;
  }
}

export function stageShot(name, world) {
  if (name === 'title') {
    runSteps(world, 6, null);
    // Keep foes out of the central title panel so the text reads cleanly.
    for (const e of world.state.enemies) {
      if (e.x > 280 && e.x < 1000 && e.y > 220 && e.y < 480) {
        e.x = 150;
        e.y = 620;
      }
    }
    world.state.player.x = 640;
    world.state.player.y = 620;
    world.state.banner = '';
    world.state.bannerTimer = 0;
    return { screen: SCREEN_TITLE, best: 2450 };
  }
  if (name === 'play') {
    runSteps(world, 26, autopilot);
    const s = world.state;
    // Stage a busy mid-fight: the bearer centred, foes closing in, a volley out.
    s.player.x = 640;
    s.player.y = 420;
    s.player.aimX = 900;
    s.player.aimY = 300;
    const spots = [
      ['mite', 420, 300], ['wisp', 880, 240], ['spitter', 1010, 470],
      ['dasher', 380, 540], ['brute', 830, 560], ['mite', 1020, 300],
    ];
    for (const [kind, x, y] of spots) {
      const e = makeEnemy(s.random, kind, Math.max(2, s.wave), s.player.x, s.player.y);
      e.x = x;
      e.y = y;
      s.enemies.push(e);
    }
    for (const b of fireVolley(s.player, s.random)) {
      b.x += b.vx * 0.06;
      b.y += b.vy * 0.06;
      s.bullets.push(b);
    }
    s.particles.burst(880, 240, '#4fd8e8', 12, 140, 4);
    s.banner = `WAVE ${s.wave}`;
    s.bannerTimer = 2;
    return { screen: SCREEN_PLAY, best: 2450 };
  }
  if (name === 'levelup') {
    runSteps(world, 16, autopilot);
    // Force a level-up so the draft cards are on screen.
    world.state.player.xp = 0;
    world.gainXp(60);
    if (!world.state.levelChoices) {
      world.state.player.level += 1;
      world.state.pendingLevels = 1;
      world.gainXp(0);
    }
    void EVENT_LEVELUP;
    return { screen: SCREEN_LEVELUP, best: 2450 };
  }
  // win
  runSteps(world, 10, autopilot);
  const s = world.state;
  s.enemies.length = 0;
  s.bullets.length = 0;
  s.ebullets.length = 0;
  s.victory = true;
  s.wave = 15;
  s.score = 3240;
  s.kills = 187;
  s.time = 482;
  s.player.level = 12;
  s.player.hp = 64;
  s.banner = '';
  s.bannerTimer = 0;
  s.particles.burst(640, 300, '#ffd94d', 40, 220, 5);
  s.particles.burst(300, 200, '#ff7a3c', 24, 180, 4);
  s.particles.burst(980, 220, '#7ab8ff', 24, 180, 4);
  return { screen: SCREEN_WIN, best: 2450 };
}
