import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'content');
const CACHE_FILE = path.join(ROOT, '.linkcheck-cache.json');
const URL_PATTERN = /https:\/\/[^\s)>'"]+/g;

// Domains that frequently rate-limit bots (arXiv, academic hosts, ...). Failures
// here are reported as warnings instead of failing CI. Extend via
// LINK_CHECK_TOLERATE="host1,host2".
const DEFAULT_TOLERATED = ['arxiv.org'];
const toleratedHosts = new Set([
  ...DEFAULT_TOLERATED,
  ...(process.env.LINK_CHECK_TOLERATE || '').split(',').map((value) => value.trim()).filter(Boolean),
]);

const REQUEST_TIMEOUT_MS = 8000;
const RETRIES = 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function filesIn(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(filePath));
    else if (/\.(md|yml|yaml)$/i.test(entry.name)) files.push(filePath);
  }
  return files;
}

async function loadCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // Cache is best-effort; never fail the run over it.
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isTolerated(url) {
  const host = hostOf(url);
  return [...toleratedHosts].some((tolerated) => host === tolerated || host.endsWith(`.${tolerated}`));
}

/** Returns 'ok', 'broken:<detail>', or 'flaky:<detail>' for tolerated hosts. */
async function checkUrl(url) {
  let lastError = '';
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
      if (response.status === 405) response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
      if (response.status < 400) return 'ok';
      lastError = `HTTP ${response.status}`;
      // 4xx (except 429) are deterministic — retrying will not help.
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'request failed';
    } finally {
      clearTimeout(timer);
    }
    if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  return isTolerated(url) ? `flaky:${lastError}` : `broken:${lastError}`;
}

const urls = new Set();
for (const filePath of await filesIn(CONTENT_ROOT)) {
  const text = await fs.readFile(filePath, 'utf8');
  for (const match of text.matchAll(URL_PATTERN)) urls.add(match[0].replace(/[.,;:]+$/, ''));
}

const cache = await loadCache();
const now = Date.now();
const failures = [];
const warnings = [];
let checkedCount = 0;
let cachedCount = 0;

try {
  for (const url of urls) {
    const cached = cache[url];
    if (cached && typeof cached.checkedAt === 'number' && now - cached.checkedAt < CACHE_TTL_MS && cached.result !== 'pending') {
      cachedCount += 1;
      if (cached.result.startsWith('broken')) failures.push(`${url} (${cached.result.slice('broken:'.length)}) [cached]`);
      else if (cached.result.startsWith('flaky')) warnings.push(`${url} (${cached.result.slice('flaky:'.length)}) [cached]`);
      continue;
    }
    checkedCount += 1;
    cache[url] = { result: 'pending', checkedAt: cached?.checkedAt ?? now };
    const result = await checkUrl(url);
    cache[url] = { result, checkedAt: now };
    if (result.startsWith('broken')) failures.push(`${url} (${result.slice('broken:'.length)})`);
    else if (result.startsWith('flaky')) warnings.push(`${url} (${result.slice('flaky:'.length)})`);
  }
} finally {
  for (const [url, entry] of Object.entries(cache)) {
    if (entry.result === 'pending') delete cache[url];
  }
  await saveCache(cache);
}

if (warnings.length > 0) {
  console.warn(`Flaky/tolerated links (${warnings.length}):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (failures.length > 0) {
  console.error(`Broken content links (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Checked ${urls.size} external content links (${checkedCount} live, ${cachedCount} from today's cache)`);
}
