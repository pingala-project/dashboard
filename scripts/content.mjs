import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import katex from 'katex';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.resolve(process.env.CONTENT_ROOT || path.join(ROOT, 'content'));
const GENERATED_FILE = path.join(ROOT, 'src/data/generatedCourses.ts');

const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const VALID_BLOCK_TYPES = new Set([
  'paragraph',
  'heading2',
  'heading3',
  'callout',
  'code',
  'math',
  'list',
  'key_takeaways',
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
  return {
    name: String(contributor.name || ''),
    github: String(contributor.github || ''),
    ...(contributor.role ? { role: String(contributor.role) } : {}),
    ...(contributor.avatarUrl ? { avatarUrl: String(contributor.avatarUrl) } : {}),
  };
}

function parseDirectiveHeader(line) {
  const match = line.match(/^:::([a-z_]+)(?:\s+(.*))?$/i);
  if (!match) return null;
  return { type: match[1].toLowerCase(), title: match[2]?.trim() || undefined };
}

function flushParagraph(blocks, lines) {
  if (lines.length === 0) return;
  const text = lines.join('\n').trim();
  if (text) blocks.push({ type: 'paragraph', text });
  lines.length = 0;
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
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
      if (directive.type === 'math') {
        blocks.push({ type: 'math', math: text, ...(directive.title ? { caption: directive.title } : {}) });
      } else if (directive.type === 'code') {
        const [language, ...codeLines] = body;
        blocks.push({ type: 'code', language: directive.title || language || 'text', code: codeLines.join('\n').trim() });
      } else if (directive.type === 'list' || directive.type === 'key_takeaways') {
        blocks.push({
          type: directive.type,
          items: body.filter((item) => item.trim()).map((item) => item.replace(/^\s*[-*]\s+/, '').trim()),
        });
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
  return blocks;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateBlocks(blocks, filePath) {
  assert(Array.isArray(blocks), `${filePath}: blocks must be an array`);
  blocks.forEach((block, index) => {
    assert(VALID_BLOCK_TYPES.has(block.type), `${filePath}: invalid block type at ${index}: ${block.type}`);
    if (['paragraph', 'heading2', 'heading3', 'callout'].includes(block.type)) {
      assert(typeof block.text === 'string' && block.text.trim(), `${filePath}: block ${index} needs text`);
    }
    if (['list', 'key_takeaways'].includes(block.type)) {
      assert(Array.isArray(block.items) && block.items.length > 0, `${filePath}: block ${index} needs items`);
    }
    if (block.type === 'code') {
      assert(typeof block.code === 'string', `${filePath}: code block ${index} needs code`);
      assert(typeof block.language === 'string' && block.language.trim(), `${filePath}: code block ${index} needs language`);
    }
    if (block.type === 'math') {
      assert(typeof block.math === 'string' && block.math.trim(), `${filePath}: math block ${index} needs math`);
      try {
        katex.renderToString(block.math, { displayMode: true, throwOnError: true, trust: false });
      } catch (error) {
        throw new Error(`${filePath}: invalid KaTeX in block ${index}: ${error.message}`);
      }
    }
  });
}

function validateSafeText(value, filePath) {
  assert(!/<\/?script\b/i.test(value), `${filePath}: script tags are not allowed`);
  assert(!/<[a-z][^>]*>/i.test(value), `${filePath}: raw HTML is not allowed`);
  assert(!/\bjavascript:/i.test(value), `${filePath}: javascript URLs are not allowed`);
  const links = [...value.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1].trim());
  links.forEach((link) => {
    assert(/^(https?:\/\/|#|\/)/i.test(link), `${filePath}: links must use https, relative, or hash URLs`);
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
  const normalizedBodies = new Map();

  for (const courseEntry of manifest.courses) {
    const courseDir = path.join(CONTENT_ROOT, 'courses', courseEntry.slug);
    const course = await readYaml(path.join(courseDir, 'course.yml'));
    assert(course.id && course.slug === courseEntry.slug, `${courseDir}: course id/slug mismatch`);
    assert(!seenCourseIds.has(course.id), `Duplicate course id: ${course.id}`);
    seenCourseIds.add(course.id);

    const modules = [];
    const moduleNames = await readDirectories(path.join(courseDir, 'modules'));
    for (const moduleSlug of moduleNames) {
      const moduleDir = path.join(courseDir, 'modules', moduleSlug);
      const module = await readYaml(path.join(moduleDir, 'module.yml'));
      assert(module.id && module.slug === moduleSlug, `${moduleDir}: module id/slug mismatch`);
      const topics = [];
      const topicNames = await readDirectories(path.join(moduleDir, 'topics'));
      for (const topicSlug of topicNames) {
        const topicDir = path.join(moduleDir, 'topics', topicSlug);
        const metadataPath = path.join(topicDir, 'metadata.yml');
        const contentPath = path.join(topicDir, 'content.md');
        const checkpointsPath = path.join(topicDir, 'checkpoints.yml');
        const metadata = await readYaml(metadataPath);
        const content = await fs.readFile(contentPath, 'utf8');
        const checkpointsDoc = await readYaml(checkpointsPath);
        const relativeTopic = toPosix(path.relative(ROOT, topicDir));

        assert(metadata.id && metadata.slug === topicSlug, `${relativeTopic}: topic id/slug mismatch`);
        assert(metadata.courseId === course.id, `${relativeTopic}: courseId mismatch`);
        assert(metadata.moduleId === module.id, `${relativeTopic}: moduleId mismatch`);
        assert(VALID_DIFFICULTIES.has(metadata.difficulty), `${relativeTopic}: invalid difficulty`);
        assert(Number.isInteger(metadata.order) && metadata.order >= 0, `${relativeTopic}: order must be a non-negative integer`);
        assert(Array.isArray(metadata.objectives) && metadata.objectives.length > 0, `${relativeTopic}: objectives are required`);
        assert(Array.isArray(metadata.sources), `${relativeTopic}: sources must be an array`);
        assert(metadata.license, `${relativeTopic}: license is required`);
        assert(typeof metadata.aiAssisted === 'boolean', `${relativeTopic}: aiAssisted must be boolean`);
        assert(typeof metadata.authorAttestation === 'boolean', `${relativeTopic}: authorAttestation must be boolean`);
        if (!metadata.legacy) {
          assert(metadata.sources.length > 0, `${relativeTopic}: new lessons need at least one source`);
          assert(metadata.authorAttestation, `${relativeTopic}: new lessons need authorAttestation: true`);
        }
        assert(!seenTopicIds.has(metadata.id), `Duplicate topic id: ${metadata.id}`);
        seenTopicIds.add(metadata.id);
        assert(content.length <= 200_000, `${relativeTopic}: content.md exceeds 200KB`);
        validateSafeText(content, contentPath);

        const normalizedBody = content.replace(/\s+/g, ' ').trim().toLowerCase();
        assert(!normalizedBodies.has(normalizedBody), `${relativeTopic}: content duplicates ${normalizedBodies.get(normalizedBody)}`);
        normalizedBodies.set(normalizedBody, relativeTopic);

        const blocks = parseMarkdown(content);
        validateBlocks(blocks, contentPath);

        const checkpoints = Array.isArray(checkpointsDoc.checkpoints) ? checkpointsDoc.checkpoints : [];
        checkpoints.forEach((checkpoint, index) => {
          assert(checkpoint.id && checkpoint.question, `${relativeTopic}/checkpoints.yml: checkpoint ${index} is incomplete`);
          assert(Array.isArray(checkpoint.options) && checkpoint.options.length >= 2, `${relativeTopic}/checkpoints.yml: checkpoint ${index} needs options`);
          assert(Number.isInteger(checkpoint.correctIndex) && checkpoint.correctIndex >= 0 && checkpoint.correctIndex < checkpoint.options.length,
            `${relativeTopic}/checkpoints.yml: checkpoint ${index} has invalid correctIndex`);
          assert(checkpoint.explanation, `${relativeTopic}/checkpoints.yml: checkpoint ${index} needs explanation`);
        });
        assert(new Set(checkpoints.map((checkpoint) => checkpoint.id)).size === checkpoints.length,
          `${relativeTopic}/checkpoints.yml: checkpoint IDs must be unique`);

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

async function main() {
  const command = process.argv[2] || 'build';
  if (command === 'build' || command === 'validate') {
    const data = await loadContent();
    if (command === 'build') {
      const source = `// Generated by scripts/content.mjs. Do not edit directly.\nimport type { Course, Track } from '../types/curriculum';\n\nexport const TRACKS_DATA: Track[] = ${JSON.stringify(data.tracks, null, 2)};\n\nexport const COURSES_DATA: Course[] = ${JSON.stringify(data.courses, null, 2)};\n`;
      await fs.writeFile(GENERATED_FILE, source);
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

await main();
