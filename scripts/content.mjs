import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, stringify } from 'yaml';
import katex from 'katex';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.resolve(process.env.CONTENT_ROOT || path.join(ROOT, 'content'));
const GENERATED_FILE = path.join(ROOT, 'src/data/generatedCourses.ts');
const ASSET_OUTPUT = path.join(ROOT, 'public/content-assets');

const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
// SPDX identifiers accepted for lesson licensing. Anything else fails validation
// so provenance stays machine-checkable.
const VALID_LICENSES = new Set([
  'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-SA-4.0', 'CC0-1.0',
  'MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'Unlicense', 'OFL-1.1',
]);
const VALID_CODE_LANGUAGES = new Set(['text', 'bash', 'sh', 'shell', 'python', 'javascript', 'typescript', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'html', 'css', 'sql', 'go', 'rust', 'java', 'c', 'cpp', 'markdown', 'mermaid']);
const MAX_WORDS = 20000;
const VALID_BLOCK_TYPES = new Set([
  'paragraph',
  'heading2',
  'heading3',
  'callout',
  'code',
  'math',
  'list',
  'key_takeaways',
  'image',
  'chart',
  'embed',
  'attachment',
  'quote',
]);

const EMBED_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtu.be',
  'player.vimeo.com', 'vimeo.com', 'www.desmos.com', 'desmos.com',
  'observablehq.com', 'www.observablehq.com', 'codepen.io', 'codesandbox.io', 'stackblitz.com',
]);

const toPosix = (value) => value.split(path.sep).join('/');

async function readYaml(filePath) {
  return parse(await fs.readFile(filePath, 'utf8')) || {};
}

async function readDirectories(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function normalizeContributor(contributor) {
  if (!contributor) return undefined;
  const github = String(contributor.github || '').trim();
  assert(/^[A-Za-z0-9-]{1,39}$/.test(github), 'Contributor GitHub handle must be a valid public username');
  return {
    name: String(contributor.name || ''),
    github,
    ...(contributor.role ? { role: String(contributor.role) } : {}),
    ...(contributor.avatarUrl ? { avatarUrl: String(contributor.avatarUrl) } : {}),
  };
}

function parseDirectiveHeader(line) {
  const match = line.match(/^:::([a-z0-9_-]+)(?:\s+(.*))?$/i);
  if (!match) return null;
  return { type: match[1].toLowerCase(), title: match[2]?.trim() || undefined };
}

function parseYamlDirectiveBody(body, filePath, type) {
  let value;
  try {
    value = parse(body.join('\n')) || {};
  } catch (error) {
    throw new Error(`${filePath}: invalid ${type} directive YAML: ${error.message}`);
  }
  assert(value && typeof value === 'object' && !Array.isArray(value), `${filePath}: ${type} directive needs YAML fields`);
  return value;
}

function flushParagraph(blocks, lines) {
  if (lines.length === 0) return;
  const text = lines.join('\n').trim();
  if (text) blocks.push({ type: 'paragraph', text });
  lines.length = 0;
}

function validateHeadingHierarchy(markdown, filePath) {
  let previous = 2;
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^(#{1,6})\s+/);
    if (!match) continue;
    const level = match[1].length;
    assert(level >= 2, `${filePath}: top-level # headings belong to metadata, not content.md`);
    assert(level <= previous + 1, `${filePath}: heading hierarchy skips from h${previous} to h${level}`);
    previous = level;
  }
}

function tokenSimilarity(left, right) {
  const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

function deterministicCheckpointId(seed, question) {
  return createHash('sha256').update(`${seed}::${question}`).digest('hex').slice(0, 12);
}

function parseMarkdown(markdown, checkpointIdSeed = '') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  const checkpoints = [];
  const paragraph = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      flushParagraph(blocks, paragraph);
      index += 1;
      continue;
    }

    const directive = parseDirectiveHeader(line.trim());
    if (directive) {
      flushParagraph(blocks, paragraph);
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== ':::') {
        body.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) throw new Error(`Unclosed :::${directive.type} directive`);
      index += 1;

      const text = body.join('\n').trim();
      if (['image', 'chart', 'embed', 'attachment'].includes(directive.type)) {
        blocks.push({ type: directive.type, ...parseYamlDirectiveBody(body, 'content.md', directive.type), ...(directive.title ? { title: directive.title } : {}) });
      } else if (directive.type === 'checkpoint') {
        const yamlData = parseYamlDirectiveBody(body, 'content.md', 'checkpoint');
        const question = directive.title || yamlData.question;
        checkpoints.push({
          id: deterministicCheckpointId(checkpointIdSeed, question),
          question,
          ...yamlData
        });
      } else if (directive.type === 'math') {
        blocks.push({ type: 'math', math: text, ...(directive.title ? { caption: directive.title } : {}) });
      } else if (directive.type === 'code') {
        const [language, ...codeLines] = body;
        const hasLanguageLine = !directive.title && /^[\w+-]+$/.test(language || '');
        blocks.push({
          type: 'code',
          language: directive.title || (hasLanguageLine ? language : 'text'),
          code: (hasLanguageLine ? codeLines : body).join('\n').trim(),
        });
      } else if (directive.type === 'list' || directive.type === 'key_takeaways') {
        blocks.push({
          type: directive.type,
          items: body.filter((item) => item.trim()).map((item) => item.replace(/^\s*[-*]\s+/, '').trim()),
        });
      } else if (directive.type === 'quote') {
        blocks.push({ type: 'quote', ...(directive.title ? { caption: directive.title } : {}), text });
      } else {
        blocks.push({
          type: directive.type === 'key-takeaways' ? 'key_takeaways' : 'callout',
          ...(directive.type === 'key_takeaways' ? {} : { variant: directive.type }),
          ...(directive.title ? { title: directive.title } : {}),
          text,
        });
      }
      continue;
    }

    const codeStart = line.match(/^```\s*([\w+-]*)\s*$/);
    if (codeStart) {
      flushParagraph(blocks, paragraph);
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) throw new Error('Unclosed fenced code block');
      blocks.push({ type: 'code', language: codeStart[1] || 'text', code: codeLines.join('\n') });
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph(blocks, paragraph);
      blocks.push({ type: 'heading3', text: line.slice(4).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph(blocks, paragraph);
      blocks.push({ type: 'heading2', text: line.slice(3).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph(blocks, paragraph);
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph(blocks, paragraph);
  return { blocks, checkpoints };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateBlocks(blocks, filePath) {
  assert(Array.isArray(blocks), `${filePath}: blocks must be an array`);
  blocks.forEach((block, index) => {
    assert(VALID_BLOCK_TYPES.has(block.type), `${filePath}: invalid block type at ${index}: ${block.type}`);
    if (['paragraph', 'heading2', 'heading3', 'callout', 'quote'].includes(block.type)) {
      assert(typeof block.text === 'string' && block.text.trim(), `${filePath}: block ${index} needs text`);
    }
    if (['list', 'key_takeaways'].includes(block.type)) {
      assert(Array.isArray(block.items) && block.items.length > 0, `${filePath}: block ${index} needs items`);
    }
    if (block.type === 'code') {
      assert(typeof block.code === 'string', `${filePath}: code block ${index} needs code`);
      assert(typeof block.language === 'string' && block.language.trim(), `${filePath}: code block ${index} needs language`);
      assert(VALID_CODE_LANGUAGES.has(block.language.toLowerCase()), `${filePath}: unsupported code language in block ${index}: ${block.language}`);
    }
    if (block.type === 'math') {
      assert(typeof block.math === 'string' && block.math.trim(), `${filePath}: math block ${index} needs math`);
      try {
        katex.renderToString(block.math, { displayMode: true, throwOnError: true, trust: false });
      } catch (error) {
        throw new Error(`${filePath}: invalid KaTeX in block ${index}: ${error.message}`);
      }
    }
    if (['image', 'chart'].includes(block.type)) {
      assert(typeof block.src === 'string' && /^(https:\/\/|\/|\.\/)/i.test(block.src) && !block.src.includes('..'), `${filePath}: ${block.type} needs a safe https or relative src`);
      assert(typeof block.alt === 'string' && block.alt.trim(), `${filePath}: ${block.type} needs alt text`);
    }
    if (block.type === 'embed') {
      assert(typeof block.url === 'string' && /^https:\/\//i.test(block.url), `${filePath}: embed needs an https url`);
      const hostname = new URL(block.url).hostname;
      assert(EMBED_HOSTS.has(hostname), `${filePath}: embed host is not on the allowlist: ${hostname}`);
    }
    if (block.type === 'attachment') {
      assert(typeof block.url === 'string' && /^(https:\/\/|\/|\.\/)/i.test(block.url) && !block.url.includes('..'), `${filePath}: attachment needs a safe https or relative url`);
      assert(typeof block.label === 'string' && block.label.trim(), `${filePath}: attachment needs a label`);
    }
  });
}

function normalizeMediaUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('./')) return value;
  if (value.startsWith('./assets/')) {
    return `/content-assets/${value.slice('./assets/'.length)}`;
  }
  return `/content-assets/${value.slice(2)}`;
}

function validateCheckpoints(checkpoints, sourceLabel) {
  checkpoints.forEach((checkpoint, index) => {
    assert(checkpoint && typeof checkpoint === 'object' && !Array.isArray(checkpoint), `${sourceLabel}: checkpoint ${index} must be a mapping`);
    assert(typeof checkpoint.id === 'string' && checkpoint.id.trim(), `${sourceLabel}: checkpoint ${index} needs an id`);
    assert(typeof checkpoint.question === 'string' && checkpoint.question.trim(), `${sourceLabel}: checkpoint ${index} needs a question`);
    assert(Array.isArray(checkpoint.options) && checkpoint.options.length >= 2, `${sourceLabel}: checkpoint ${index} needs at least two options`);
    assert(Number.isInteger(checkpoint.correctIndex) && checkpoint.correctIndex >= 0 && checkpoint.correctIndex < checkpoint.options.length,
      `${sourceLabel}: checkpoint ${index} has invalid correctIndex`);
    assert(typeof checkpoint.explanation === 'string' && checkpoint.explanation.trim(), `${sourceLabel}: checkpoint ${index} needs an explanation`);
    [checkpoint.question, checkpoint.explanation, ...checkpoint.options].forEach((text) => {
      assert(typeof text === 'string', `${sourceLabel}: checkpoint ${index} fields must be strings`);
      validateSafeText(text, sourceLabel);
    });
  });
}

async function loadFileCheckpoints(checkpointsPath) {
  if (!(await fileExists(checkpointsPath))) return [];
  const value = await readYaml(checkpointsPath);
  const list = Array.isArray(value) ? value : value.checkpoints;
  assert(Array.isArray(list), `${toPosix(path.relative(ROOT, checkpointsPath))}: expected a list of checkpoints or { checkpoints: [...] }`);
  return list;
}

function validateSafeText(value, filePath) {
  assert(!/<\/?script\b/i.test(value), `${filePath}: script tags are not allowed`);
  assert(!/<[a-z][^>]*>/i.test(value), `${filePath}: raw HTML is not allowed`);
  assert(!/\bjavascript:/i.test(value), `${filePath}: javascript URLs are not allowed`);
  const links = [...value.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1].trim());
  links.forEach((link) => {
    assert(/^(https:\/\/|#|\/)/i.test(link), `${filePath}: links must use https, relative, or hash URLs`);
  });
}

async function loadContent() {
  const manifestPath = path.join(CONTENT_ROOT, 'manifest.yml');
  const manifest = await readYaml(manifestPath);
  assert(manifest.schemaVersion === 1, `${toPosix(path.relative(ROOT, manifestPath))}: schemaVersion must be 1`);
  assert(Array.isArray(manifest.courses) && manifest.courses.length > 0, 'manifest.yml must define courses');

  const courses = [];
  const seenCourseIds = new Set();
  const seenTopicIds = new Set();
  const normalizedBodies = [];
  const seenCourseSlugs = new Set();
  const seenModuleIds = new Set();

  for (const courseEntry of manifest.courses) {
    const courseDir = path.join(CONTENT_ROOT, 'courses', courseEntry.slug);
    const course = await readYaml(path.join(courseDir, 'course.yml'));
    assert(course.id && course.slug === courseEntry.slug, `${courseDir}: course id/slug mismatch`);
    assert(/^[a-z0-9][a-z0-9-]{1,63}$/.test(course.slug), `${courseDir}: invalid course slug`);
    assert(!seenCourseIds.has(course.id), `Duplicate course id: ${course.id}`);
    assert(!seenCourseSlugs.has(course.slug), `Duplicate course slug: ${course.slug}`);
    seenCourseIds.add(course.id);
    seenCourseSlugs.add(course.slug);

    const modules = [];
    const moduleNames = await readDirectories(path.join(courseDir, 'modules'));
    for (const moduleSlug of moduleNames) {
      const moduleDir = path.join(courseDir, 'modules', moduleSlug);
      const module = await readYaml(path.join(moduleDir, 'module.yml'));
      assert(module.id && module.slug === moduleSlug, `${moduleDir}: module id/slug mismatch`);
      assert(/^[a-z0-9][a-z0-9-]{1,63}$/.test(module.slug), `${moduleDir}: invalid module slug`);
      assert(!seenModuleIds.has(module.id), `Duplicate module id: ${module.id}`);
      seenModuleIds.add(module.id);
      const topics = [];
      const topicNames = await readDirectories(path.join(moduleDir, 'topics'));
      for (const topicSlug of topicNames) {
        const topicDir = path.join(moduleDir, 'topics', topicSlug);
        const metadataPath = path.join(topicDir, 'metadata.yml');
        const contentPath = path.join(topicDir, 'content.md');
        const checkpointsPath = path.join(topicDir, 'checkpoints.yml');
        const metadata = await readYaml(metadataPath);
        const content = await fs.readFile(contentPath, 'utf8');
        const relativeTopic = toPosix(path.relative(ROOT, topicDir));

        assert(metadata.id && metadata.slug === topicSlug, `${relativeTopic}: topic id/slug mismatch`);
        assert(metadata.courseId === course.id, `${relativeTopic}: courseId mismatch`);
        assert(metadata.moduleId === module.id, `${relativeTopic}: moduleId mismatch`);
        assert(typeof metadata.title === 'string' && metadata.title.trim(), `${relativeTopic}: title is required`);
        assert(typeof metadata.readingTime === 'string' && /^\d+\s+min(?:\s+read)?$/i.test(metadata.readingTime), `${relativeTopic}: readingTime must look like "10 min read"`);
        assert(VALID_DIFFICULTIES.has(metadata.difficulty), `${relativeTopic}: invalid difficulty`);
        assert(Number.isInteger(metadata.order) && metadata.order >= 0, `${relativeTopic}: order must be a non-negative integer`);
        assert(Array.isArray(metadata.objectives) && metadata.objectives.length > 0, `${relativeTopic}: objectives are required`);
        assert(Array.isArray(metadata.sources), `${relativeTopic}: sources must be an array`);
        metadata.sources.forEach((source) => {
          assert(typeof source === 'string' && /^https:\/\//i.test(source), `${relativeTopic}: sources must use https URLs`);
          try { new URL(source); } catch { throw new Error(`${relativeTopic}: invalid source URL: ${source}`); }
        });
        assert(metadata.license, `${relativeTopic}: license is required`);
        assert(VALID_LICENSES.has(metadata.license), `${relativeTopic}: unknown license "${metadata.license}" (allowed: ${[...VALID_LICENSES].join(', ')})`);
        assert(typeof metadata.aiAssisted === 'boolean', `${relativeTopic}: aiAssisted must be boolean`);
        assert(typeof metadata.authorAttestation === 'boolean', `${relativeTopic}: authorAttestation must be boolean`);
        if (!metadata.legacy) {
          assert(metadata.sources.length > 0, `${relativeTopic}: new lessons need at least one source`);
          assert(metadata.authorAttestation, `${relativeTopic}: new lessons need authorAttestation: true`);
        }
        assert(!seenTopicIds.has(metadata.id), `Duplicate topic id: ${metadata.id}`);
        seenTopicIds.add(metadata.id);
        assert(content.length <= 200_000, `${relativeTopic}: content.md exceeds 200KB`);
        assert(content.trim(), `${relativeTopic}: content.md cannot be empty`);
        assert(content.trim().split(/\s+/).length <= MAX_WORDS, `${relativeTopic}: content.md exceeds ${MAX_WORDS} words`);
        validateSafeText(content, contentPath);
        validateHeadingHierarchy(content, contentPath);

        const normalizedBody = content.replace(/\s+/g, ' ').trim().toLowerCase();
        const exactDuplicate = normalizedBodies.find(([body]) => body === normalizedBody);
        assert(!exactDuplicate, `${relativeTopic}: content duplicates ${exactDuplicate?.[1]}`);
        const nearDuplicate = normalizedBodies.find(([body]) => tokenSimilarity(body, normalizedBody) >= 0.94);
        assert(!nearDuplicate, `${relativeTopic}: content is near-duplicate of ${nearDuplicate?.[1]}`);
        normalizedBodies.push([normalizedBody, relativeTopic]);

        const { blocks: parsedBlocks, checkpoints: parsedCheckpoints } = parseMarkdown(content, metadata.id);
        validateBlocks(parsedBlocks, contentPath);
        for (const block of parsedBlocks) {
          const mediaUrl = block.type === 'image' || block.type === 'chart' ? block.src : block.type === 'attachment' ? block.url : undefined;
          if (typeof mediaUrl === 'string' && mediaUrl.startsWith('./assets/')) {
            const assetPath = path.join(CONTENT_ROOT, 'assets', mediaUrl.slice('./assets/'.length));
            assert(await fileExists(assetPath), `${relativeTopic}: missing asset ${mediaUrl}`);
          }
        }
        const blocks = parsedBlocks.map((block) => {
          if (block.type === 'image' || block.type === 'chart') return { ...block, src: normalizeMediaUrl(block.src) };
          if (block.type === 'attachment') return { ...block, url: normalizeMediaUrl(block.url) };
          return block;
        });

        const fileCheckpoints = await loadFileCheckpoints(checkpointsPath);
        validateCheckpoints(fileCheckpoints, `${relativeTopic}/checkpoints.yml`);
        validateCheckpoints(parsedCheckpoints, `${relativeTopic}/content.md`);
        const checkpoints = [...fileCheckpoints, ...parsedCheckpoints];
        assert(new Set(checkpoints.map((checkpoint) => checkpoint.id)).size === checkpoints.length,
          `${relativeTopic}: checkpoint IDs must be unique across checkpoints.yml and content.md`);

        topics.push({
          ...metadata,
          moduleTitle: module.title,
          blocks,
          checkpoints,
          ...(metadata.contributor ? { contributor: normalizeContributor(metadata.contributor) } : {}),
        });
      }
      topics.sort((a, b) => a.order - b.order);
      modules.push({ ...module, topics, ...(module.contributor ? { contributor: normalizeContributor(module.contributor) } : {}) });
    }
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    courses.push({ ...course, modules, ...(course.contributor ? { contributor: normalizeContributor(course.contributor) } : {}) });
  }

  const topicSequence = courses.flatMap((course) => course.modules.flatMap((module) => module.topics));
  topicSequence.forEach((topic, index) => {
    if (index > 0 && !topic.prevTopicId) topic.prevTopicId = topicSequence[index - 1].id;
    if (index < topicSequence.length - 1 && !topic.nextTopicId) topic.nextTopicId = topicSequence[index + 1].id;
  });

  return { tracks: manifest.tracks || [], courses };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const command = process.argv[2] || 'build';
  if (command === 'build' || command === 'validate') {
    const data = await loadContent();
    if (command === 'build') {
      const source = `// Generated by scripts/content.mjs. Do not edit directly.\nimport type { Course, Track } from '../types/curriculum';\n\nexport const TRACKS_DATA: Track[] = ${JSON.stringify(data.tracks, null, 2)};\n\nexport const COURSES_DATA: Course[] = ${JSON.stringify(data.courses, null, 2)};\n`;
      await fs.writeFile(GENERATED_FILE, source);
      await fs.rm(ASSET_OUTPUT, { recursive: true, force: true });
      if (await fileExists(path.join(CONTENT_ROOT, 'assets'))) {
        await fs.mkdir(path.dirname(ASSET_OUTPUT), { recursive: true });
        await fs.cp(path.join(CONTENT_ROOT, 'assets'), ASSET_OUTPUT, { recursive: true });
      }
      console.log(`Generated ${data.courses.length} courses and ${data.courses.flatMap((course) => course.modules.flatMap((module) => module.topics)).length} topics`);
    } else {
      console.log('Content validation passed');
    }
    return;
  }
  if (command === 'stringify') {
    console.log(stringify(await loadContent()));
    return;
  }
  throw new Error(`Unknown content command: ${command}`);
}

export {
  loadContent,
  parseMarkdown,
  validateSafeText,
  validateBlocks,
  validateCheckpoints,
  validateHeadingHierarchy,
  deterministicCheckpointId,
  tokenSimilarity,
  VALID_LICENSES,
  VALID_CODE_LANGUAGES,
};

// Only auto-run when invoked directly (node scripts/content.mjs <command>);
// tests import the exported helpers instead.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  await main();
}
