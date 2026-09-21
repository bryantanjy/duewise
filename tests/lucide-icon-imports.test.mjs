import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('all Lucide icon subpath imports resolve before native bundling', () => {
  const missing = [];
  for (const file of sourceFiles(join(projectRoot, 'src'))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from ['"](lucide-react-native\/icons\/[^'"]+)['"]/g)) {
      try {
        require.resolve(match[1]);
      } catch {
        missing.push(`${relative(projectRoot, file)}: ${match[1]}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
