import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'content');
const URL_PATTERN = /https:\/\/[^\s)>'"]+/g;

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

const urls = new Set();
for (const filePath of await filesIn(CONTENT_ROOT)) {
  const text = await fs.readFile(filePath, 'utf8');
  for (const match of text.matchAll(URL_PATTERN)) urls.add(match[0].replace(/[.,;:]+$/, ''));
}

const failures = [];
for (const url of urls) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (response.status === 405) response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    if (response.status >= 400) failures.push(`${url} (${response.status})`);
  } catch (error) {
    failures.push(`${url} (${error instanceof Error ? error.message : 'request failed'})`);
  } finally {
    clearTimeout(timer);
  }
}

if (failures.length > 0) {
  console.error(`Broken content links (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Checked ${urls.size} external content links`);
}
