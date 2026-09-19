import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const verificationSteps = [
  'node --experimental-strip-types --test tests/*.test.mjs',
  'npx.cmd tsc --noEmit',
  'npx.cmd expo config --type public',
  'npx.cmd expo export --platform android',
  'npx.cmd expo export --platform ios --output-dir .expo/verify-ios',
  'git diff --check',
];

export async function runSteps(steps, run) {
  for (const step of steps) await run(step);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function runCommand(command) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, {
    cwd: projectRoot,
    shell: true,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Verification failed (${result.status ?? 'unknown'}): ${command}`);
  }
}

const isMain = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;

if (isMain) {
  runSteps(verificationSteps, async (command) => runCommand(command)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
