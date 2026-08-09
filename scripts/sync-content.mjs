import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'content');
const CACHE_ROOT = path.join(ROOT, '.content-cache');
const LOCK_FILE = path.join(ROOT, 'content-lock.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const lock = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
  assert(lock.version === 1 && Array.isArray(lock.subjects) && lock.subjects.length > 0, 'content-lock.json must contain version 1 subjects');

  if (lock.subjects.every((subject) => subject.commit === 'local-bootstrap') && await fileExists(path.join(CONTENT_ROOT, 'manifest.yml'))) {
    console.log('Using local bootstrap content');
    return;
  }

  assert(lock.subjects.length === 1, 'The bootstrap dashboard supports one locked subject; add an aggregation step before enabling multiple remote subjects.');
  const subject = lock.subjects[0];
  assert(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(subject.repository), `Invalid repository in content-lock.json: ${subject.repository}`);
  assert(/^[a-f0-9]{40}$/i.test(subject.commit), `Subject ${subject.slug} must use an immutable 40-character commit SHA`);

  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const target = path.join(CACHE_ROOT, subject.slug);
  if (!await fileExists(path.join(target, '.git'))) {
    await execFile('git', ['clone', '--filter=blob:none', '--no-checkout', `https://github.com/${subject.repository}.git`, target], { cwd: ROOT });
  }
  await execFile('git', ['fetch', '--depth', '1', 'origin', subject.commit], { cwd: target });
  await execFile('git', ['checkout', '--detach', subject.commit], { cwd: target });
  const checkedOut = (await execFile('git', ['rev-parse', 'HEAD'], { cwd: target })).stdout.trim();
  assert(checkedOut.toLowerCase() === subject.commit.toLowerCase(), `Fetched content SHA ${checkedOut} does not match lock ${subject.commit}`);

  const sourceRoot = path.resolve(target, subject.path || '.');
  assert(sourceRoot.startsWith(`${target}${path.sep}`) || sourceRoot === target, 'Content path must stay inside the checked-out repository');
  assert(await fileExists(path.join(sourceRoot, 'manifest.yml')), `Locked subject has no manifest.yml at ${subject.path || '.'}`);
  await fs.rm(CONTENT_ROOT, { recursive: true, force: true });
  await fs.cp(sourceRoot, CONTENT_ROOT, { recursive: true });
  console.log(`Synced ${subject.repository}@${subject.commit}`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

await main();
