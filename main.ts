// Emberward's entrypoint: copy game/ and screenshots/ into the output
// directory and write dossier.json with the kit's dossier builder.
// Node 22, standard library only, no network, deterministic output.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

try {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });

  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`dossier written: ${dossier.length} bytes -> ${join(outDir, 'dossier.json')}`);
} catch (err) {
  console.error(`entrypoint failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
