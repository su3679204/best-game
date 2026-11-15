# Emberward — Hold the Last Lantern

A complete, original top-down arena survival roguelite that plays offline in
a desktop browser from static files. No build step, no network requests, no
libraries — plain HTML5 canvas and WebAudio only.

## The game

The dark has swallowed the valley, and you carry the last lantern. Survive
15 waves of ember-fiends and slay the Cinder Warden boss on wave 15 to win.

Five fiend kinds hunt you, each with its own behaviour: Ember Mites chase
you, Cinder Wisps drift and wander, Ash Spitters keep their distance and
shoot, Spark Dashers telegraph and then lunge, and Coal Brutes are slow,
high-health tanks. Golden elites are tougher, faster variants worth more XP.
A boss appears every 5 waves; the wave-15 Cinder Warden is the win condition.

Slain fiends drop ember XP gems. Levelling up opens a draft: choose 1 of 3
boon cards from a pool of 12, including multi-shot, piercing shots, a radial
nova burst, and a one-time revive (phoenix feather). Other boons raise
damage, fire rate, movement speed, magnet radius, max health, and more.

## Controls

- **WASD / Arrow keys** — move
- **Mouse** — aim
- **Hold click or Space** — fire ember bolts
- **P** — pause / resume
- **M** — mute / unmute
- **1 / 2 / 3 or click** — choose a level-up boon

Your best score is saved in the browser's local storage.

## Feel

Particles on hits and deaths, screen shake on big hits, floating damage
numbers, knockback, hit-flash on damaged foes, synthesised WebAudio sound
effects and a quiet looping music bed, wave banners, a boss health bar, and
complete title, pause, victory, and game-over screens with full run stats
and instant restart.

## Layout

- `game/index.html` — the page hosting the canvas
- `game/src/config.js` — tuning numbers, palette, enemy statistics
- `game/src/random.js` — seeded random-number generator
- `game/src/audio.js` — synthesised sound effects and music
- `game/src/input.js` — keyboard and mouse input
- `game/src/particles.js` — particles, floating text, screen shake
- `game/src/enemies.js` — fiend kinds, steering, boss behaviour
- `game/src/player.js` — the lantern-bearer: movement, health, volley
- `game/src/upgrades.js` — the twelve level-up boons
- `game/src/world.js` — waves, combat, experience, win/lose
- `game/src/render.js` — all drawing: arena, foes, player, HUD, screens
- `game/src/shots.js` — deterministic staged scenes for screenshots
- `game/src/main.js` — boot, fixed-step loop, screen state machine
- `main.ts` — entrypoint: copies `game/` and `screenshots/` and writes `dossier.json`
- `shots.json` — the four screenshot scenes (title, play, level-up, victory)

## How to run

Serve the game folder with any static server and open it in a desktop
browser, for example:

```
node serve.ts
```

then open http://localhost:8080 and press Space to begin. To build the
submission dossier:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=<scene>&seed=1` (see `shots.json`
and `game/src/shots.js`):

1. `1-title.jpg` — the title screen
2. `2-play.jpg` — a mid-fight scene on wave 3 with the HUD visible
3. `3-levelup.jpg` — the level-up draft with three boon cards
4. `4-win.jpg` — the victory screen with full run stats

## Entry

This game was built for the make.fun best-game-01 competition:
https://make.fun/r/a866kr6r
