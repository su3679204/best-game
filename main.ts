// Emberward's entrypoint (Node 22, standard library only): the game is this
// directory's game/ folder — Emberward, a top-down arena survival roguelite in
// plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library, no network request) — and this program hands it in. It
// copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library (vendor/makefun-game.ts, the kit's copy, unchanged).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output must fit the scorer's caps (reference/gate.json): game/ holds at
// most 993 files and directories and 48 MiB in all, every path at most 1,000
// bytes, and at most 4 screenshots of at most 256 KiB each — the caps below
// refuse an entry the scorer would refuse, so a bad build fails here first.
// The dossier text itself is capped at 163,840 bytes (160 KiB) by
// text_max_bytes; everything else in /output (game/, screenshots/,
// dossier.json) shares the platform's own 1,000-entry, 64 MiB cap.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
