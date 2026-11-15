// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// level-up, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=title|play|levelup|win (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_BOSS, EVENT_HIT, EVENT_LEVELUP, EVENT_NOVA, EVENT_OVER, EVENT_WAVE, EVENT_WIN } from './world.js';
import { ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, levelupCardRects } from './render.js';
import { draftUpgrades } from './upgrades.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { best: scene.best, muted: false });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // Dev handle for automated play-tests (read-only state inspection).
  window.__emberward = world;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Hold the lantern: survive 15 waves and slay the Cinder Warden.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `Victory! Score ${world.state.score}. Best ${best}.`
      : `Game over on wave ${world.state.wave}. Score ${world.state.score}. Best ${best}.`);
  }

  function applyChoice(index) {
    const choices = world.state.levelChoices;
    if (!choices || index >= choices.length) return;
    const upgrade = choices[index];
    upgrade.apply(world.state.player);
    world.state.player.takenUpgrades.push(upgrade.id);
    audio.levelup();
    if (world.state.pendingLevels > 0) {
      world.state.levelChoices = draftUpgrades(world.state.random, world.state.player.takenUpgrades);
      world.state.pendingLevels -= 1;
    } else {
      world.state.levelChoices = null;
      screen = SCREEN_PLAY;
    }
    announce(`Chose ${upgrade.name}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    const click = input.takeClick();
    if (screen === SCREEN_TITLE) {
      if ((actions & ACTION_CONFIRM) || click) startGame();
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if ((actions & ACTION_CONFIRM) || click) startGame();
    } else if (screen === SCREEN_PAUSED) {
      if ((actions & (ACTION_PAUSE | ACTION_CONFIRM)) || click) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_LEVELUP) {
      if (actions & ACTION_CHOICE_1) applyChoice(0);
      else if (actions & ACTION_CHOICE_2) applyChoice(1);
      else if (actions & ACTION_CHOICE_3) applyChoice(2);
      else if (click) {
        const rects = levelupCardRects();
        for (let i = 0; i < rects.length; i += 1) {
          const r = rects[i];
          if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
            applyChoice(i);
            break;
          }
        }
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    }
  }

  function playSounds(events, bulletsBefore, gemsBefore) {
    if (events & EVENT_HIT) audio.hurt();
    if (events & EVENT_LEVELUP) audio.levelup();
    if (events & EVENT_WAVE) audio.wave();
    if (events & EVENT_BOSS) audio.boss();
    if (events & EVENT_NOVA) audio.nova();
    if (events & EVENT_OVER) audio.over();
    if (events & EVENT_WIN) audio.victory();
    if (world.state.bullets.length > bulletsBefore) audio.shoot();
    if (world.state.gems.length < gemsBefore) audio.pickup();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The game plays behind the title: foes gather, the bearer cannot fall.
      world.state.player.invulnerable = Math.max(world.state.player.invulnerable, STEP * 2);
      world.state.player.hp = world.state.player.maxHp;
      world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 200 }, false);
      return;
    }
    const bulletsBefore = world.state.bullets.length;
    const gemsBefore = world.state.gems.length;
    const events = world.step(STEP, input.direction(), input.mouse, input.firing);
    playSounds(events, bulletsBefore, gemsBefore);
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (world.state.levelChoices) screen = SCREEN_LEVELUP;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { best, muted: audio.muted });
  }

  // Leaving the tab pauses a running game rather than letting fiends close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberward. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
