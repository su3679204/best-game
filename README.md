# Emberward — Hold the Last Lantern

A complete, original top-down arena survival roguelite that plays offline in a
desktop browser from static files. No build step, no network requests, no
libraries — plain HTML5 canvas and WebAudio.

## The game

The dark has swallowed the valley. You carry the last lantern. Survive 15 waves
of ember-fiends and slay the **Cinder Warden** on Wave 15 to win.

- **Move** with WASD / arrow keys, **aim** with the mouse, **hold click or
  Space** to fire ember bolts.
- **Five fiend kinds**, each with its own behaviour: Ember Mites chase, Cinder
  Wisps drift, Ash Spitters shoot from range, Spark Dashers telegraph and lunge,
  Coal Brutes tank. Golden **elites** are tougher and worth more.
- **A boss every 5 waves** — the Cinder Warden fires radial bursts and summons
  mites, and gets faster as its health falls.
- **Level up** by gathering ember XP from slain fiends, then **choose 1 of 3
  boon cards** (12 boons: Twin Shot, Piercing Light, Nova Burst, Phoenix
  Feather revive, and more).
- **Feel:** particles, screen shake, damage numbers, knockback, hit-flash,
  synthesised WebAudio sound effects and a quiet music loop (M to mute),
  wave banners, boss health bar, pause (P), best score saved locally.
- **Win, lose, restart:** a victory screen with full run stats, a game-over
  screen with stats, and instant restart from either.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static file server.

## Screenshots

The four shots in `screenshots/` are real renders of the game's own code
(`?shot=title|play|levelup|win&seed=1`): title, mid-fight play with the HUD,
the level-up boon draft, and the victory screen.

## Layout

```
game/
  index.html          page + canvas
  src/
    config.js         tuning numbers, palette, enemy stats
    random.js         seeded RNG (deterministic screenshots)
    audio.js          synthesised WebAudio SFX + music
    input.js          keyboard + mouse
    particles.js      pooled particles, floating text, screen shake
    enemies.js        fiend kinds, steering, boss behaviour
    player.js         the lantern-bearer and its volley
    upgrades.js       the 12 level-up boons
    world.js          simulation: waves, combat, XP, win/lose
    render.js         all drawing: arena, foes, HUD, screens
    shots.js          deterministic staged scenes for screenshots
    main.js           boot, fixed-step loop, screen state machine
main.ts               hands game/ + screenshots/ to /output with a dossier
serve.ts              tiny static server for local play
```

## Entry

Built for the make.fun bounty **"Make the best game"**
([best-game-01](https://make.fun/r/a866kr6r)).

## License

MIT — see [LICENSE](LICENSE).
