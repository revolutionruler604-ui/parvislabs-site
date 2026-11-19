import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Astro keeps a content cache under node_modules/.astro across builds, and a
// build after a log entry is deleted can still emit its old page. Clearing the
// cache makes the build match the files every time.
await rm(fileURLToPath(new URL('../node_modules/.astro', import.meta.url)), {
  recursive: true,
  force: true,
});

const astro = fileURLToPath(new URL('../node_modules/astro/astro.js', import.meta.url));
const result = spawnSync(process.execPath, [astro, 'build'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
