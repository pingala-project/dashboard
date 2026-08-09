import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'content');

const ensureDir = (directory) => fs.mkdir(directory, { recursive: true });
const writeYaml = (filePath, value) => fs.writeFile(filePath, stringify(value, { lineWidth: 120 }));

function renderBlock(block) {
  switch (block.type) {
    case 'paragraph': return `${block.text || ''}\n`;
    case 'heading2': return `## ${block.text || ''}\n`;
    case 'heading3': return `### ${block.text || ''}\n`;
    case 'callout':
      return `:::${block.variant || 'note'}${block.title ? ` ${block.title}` : ''}\n${block.text || ''}\n:::\n`;
    case 'code':
      return `\`\`\`${block.language || 'text'}\n${block.code || ''}\n\`\`\`\n`;
    case 'math':
      return `:::math${block.caption ? ` ${block.caption}` : ''}\n${block.math || ''}\n:::\n`;
    case 'list':
      return `${(block.items || []).map((item) => `- ${item}`).join('\n')}\n`;
    case 'key_takeaways':
      return `:::key_takeaways Key takeaways\n${(block.items || []).map((item) => `- ${item}`).join('\n')}\n:::\n`;
    default: return '';
  }
}

async function main() {
  const generatedPath = path.join(ROOT, 'src/data/generatedCourses.ts');
  try {
    await fs.access(generatedPath);
  } catch {
    const { execFile } = await import('node:child_process');
    await new Promise((resolve, reject) => {
      execFile(process.execPath, [path.join(ROOT, 'scripts/content.mjs'), 'build'], { cwd: ROOT }, (error) => error ? reject(error) : resolve());
    });
  }
  const { COURSES_DATA, TRACKS_DATA } = await import('../src/data/generatedCourses.ts');
  await ensureDir(CONTENT_ROOT);
  const manifest = {
    schemaVersion: 1,
    subject: 'ai-ml',
    title: 'Pingala AI & Machine Learning Curriculum',
    tracks: TRACKS_DATA,
    courses: COURSES_DATA.map((course, index) => ({ id: course.id, slug: course.slug, order: index })),
  };
  await writeYaml(path.join(CONTENT_ROOT, 'manifest.yml'), manifest);

  for (const [courseIndex, course] of COURSES_DATA.entries()) {
    const courseDir = path.join(CONTENT_ROOT, 'courses', course.slug);
    await ensureDir(courseDir);
    await writeYaml(path.join(courseDir, 'course.yml'), {
      id: course.id,
      slug: course.slug,
      order: courseIndex,
      title: course.title,
      tagline: course.tagline,
      description: course.description,
      trackId: course.trackId,
      level: course.level,
      theme: course.theme,
      icon: course.icon,
      estimatedHours: course.estimatedHours,
      prerequisites: course.prerequisites,
      tags: course.tags,
      cardStyle: course.cardStyle,
      ...(course.cardSnippet ? { cardSnippet: course.cardSnippet } : {}),
      ...(course.contributor ? { contributor: course.contributor } : {}),
    });

    for (const [moduleIndex, module] of course.modules.entries()) {
      const moduleDir = path.join(courseDir, 'modules', module.id);
      await ensureDir(moduleDir);
      await writeYaml(path.join(moduleDir, 'module.yml'), {
        id: module.id,
        slug: module.id,
        order: moduleIndex,
        title: module.title,
        description: module.description,
        ...(module.contributor ? { contributor: module.contributor } : {}),
      });

      for (const [topicIndex, topic] of module.topics.entries()) {
        const topicDir = path.join(moduleDir, 'topics', topic.slug);
        await ensureDir(topicDir);
        await writeYaml(path.join(topicDir, 'metadata.yml'), {
          id: topic.id,
          slug: topic.slug,
          title: topic.title,
          courseId: topic.courseId,
          moduleId: module.id,
          order: topicIndex,
          readingTime: topic.readingTime,
          difficulty: topic.difficulty,
          summary: topic.summary,
          objectives: topic.objectives,
          license: 'CC-BY-4.0',
          sources: [],
          aiAssisted: false,
          authorAttestation: true,
          legacy: true,
          ...(topic.contributor ? { contributor: topic.contributor } : {}),
          ...(topic.prevTopicId ? { prevTopicId: topic.prevTopicId } : {}),
          ...(topic.nextTopicId ? { nextTopicId: topic.nextTopicId } : {}),
        });
        await fs.writeFile(path.join(topicDir, 'content.md'), `${topic.blocks.map(renderBlock).join('\n').trim()}\n`);
        await writeYaml(path.join(topicDir, 'checkpoints.yml'), { checkpoints: topic.checkpoints || [] });
      }
    }
  }

  console.log(`Migrated ${COURSES_DATA.length} courses to ${CONTENT_ROOT}`);
}

await main();
