// Boot, a fixed-step loop, and the screen state machine. The loop steps the
// simulation at 1/60 s regardless of frame rate, renders every frame, and
// routes keys and clicks by screen: title, playing, level-up, paused, over,
// victory. It also exposes the test handle window.__emberward.
import { createRng } from './random.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { Particles } from './particles.js';
import { createWorld } from './world.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam !== 0 ? seedParam : (Date.now() % 100000) + 1;
const shotScene = params.get('shot');

const rng = createRng(seed);
const audio = new SoundBank();
const input = new Input(canvas);
const particles = new Particles();
const world = createWorld(rng, audio, particles);
const state = world.state;

input.onFirstGesture = () => audio.ensure();

let screen = 'title';
let time = 0;

/** Human-readable status line, kept in the DOM for tests and screen readers. */
function updateStatus() {
  if (!statusEl) return;
  const p = state.player;
  if (screen === 'title') statusEl.textContent = 'title — press Space to start';
  else if (screen === 'paused') statusEl.textContent = `paused — wave ${state.wave} hp ${Math.ceil(p.hp)} score ${state.score}`;
  else if (screen === 'levelup') statusEl.textContent = `level up — choose a boon (level ${p.level})`;
  else if (screen === 'over') statusEl.textContent = `game over — wave ${state.wave} score ${state.score} — press Space to restart`;
  else if (screen === 'victory') statusEl.textContent = `victory — score ${state.score} — press Space to play again`;
  else statusEl.textContent = `playing — wave ${state.wave} hp ${Math.ceil(p.hp)} score ${state.score} kills ${state.kills} level ${p.level}`;
}

function startGame() {
  audio.ensure();
  audio.startMusic();
  world.startRun();
  screen = 'playing';
  updateStatus();
}

function chooseBoon(index) {
  if (world.chooseUpgrade(index)) screen = 'playing';
  updateStatus();
}

/** Route one frame of keys and clicks for the current screen. */
function handleInput() {
  if (input.wasPressed('KeyM')) audio.toggleMute();

  const click = input.takeClick();
  const startKey = input.wasPressed('Space') || input.wasPressed('Enter');

  if (screen === 'title') {
    if (startKey || click) startGame();
  } else if (screen === 'playing') {
    if (input.wasPressed('KeyP')) screen = 'paused';
  } else if (screen === 'paused') {
    if (input.wasPressed('KeyP') || startKey) screen = 'playing';
  } else if (screen === 'levelup') {
    if (input.wasPressed('Digit1')) chooseBoon(0);
    else if (input.wasPressed('Digit2')) chooseBoon(1);
    else if (input.wasPressed('Digit3')) chooseBoon(2);
    else if (click) {
      for (const r of state.cardRects || []) {
        if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
          chooseBoon(r.index);
          break;
        }
      }
    }
  } else if (screen === 'over' || screen === 'victory') {
    if (startKey || click) startGame();
  }
  updateStatus();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (frame.last || now)) / 1000);
  frame.last = now;
  time += dt;
  handleInput();
  if (screen === 'playing') {
    frame.acc = (frame.acc || 0) + dt;
    while (frame.acc >= STEP) {
      world.update(input, STEP);
      frame.acc -= STEP;
      if (state.levelChoices) { screen = 'levelup'; break; }
      if (state.over) { screen = 'over'; break; }
      if (state.victory) { screen = 'victory'; break; }
    }
  }
  draw(ctx, state, screen, particles, time);
  updateStatus();
  input.endFrame();
}

// The handle scripted play-tests use: live state plus a wave jump.
window.__emberward = {
  state,
  get screen() { return screen; },
  startWave(n) { world.startWave(n); },
  restart() { startGame(); },
};

if (shotScene) {
  // Screenshot mode: stage one deterministic scene, paint it once, signal ready.
  screen = stageShot(world, shotScene, seed);
  draw(ctx, state, screen, particles, 2.0);
  updateStatus();
  window.__shotReady = true;
} else {
  world.startRun();
  screen = 'title';
  state.banner = '';
  state.bannerTimer = 0;
  requestAnimationFrame(frame);
}
