import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  validateSafeText,
  validateBlocks,
  validateCheckpoints,
  validateHeadingHierarchy,
  deterministicCheckpointId,
  tokenSimilarity,
} from '../scripts/content.mjs';

describe('validateSafeText', () => {
  it('rejects script tags', () => {
    expect(() => validateSafeText('hello <script>alert(1)</script>', 'x')).toThrow(/script tags/);
  });

  it('rejects any raw HTML', () => {
    expect(() => validateSafeText('hi <img src=x onerror=alert(1)>', 'x')).toThrow(/raw HTML/);
  });

  it('rejects javascript: URLs', () => {
    expect(() => validateSafeText('[click](javascript:alert(1))', 'x')).toThrow(/javascript URLs/);
  });

  it('rejects non-https absolute links', () => {
    expect(() => validateSafeText('[x](http://insecure.example)', 'x')).toThrow(/links must use https/);
  });

  it('allows https, relative, and hash links plus ==highlight== marks', () => {
    expect(() =>
      validateSafeText('[docs](https://example.com) [rel](/more) [hash](#anchor) ==important==', 'x')
    ).not.toThrow();
  });
});

describe('parseMarkdown checkpoints', () => {
  const content = [
    '## Section',
    '',
    ':::checkpoint',
    'question: What is 2+2?',
    'options:',
    '  - Four',
    '  - Five',
    'correctIndex: 0',
    'explanation: Basic addition.',
    ':::',
  ].join('\n');

  it('produces a stable deterministic checkpoint id across runs', () => {
    const first = parseMarkdown(content, 'topic-a');
    const second = parseMarkdown(content, 'topic-a');
    expect(first.checkpoints[0].id).toBe(second.checkpoints[0].id);
    expect(first.checkpoints[0].id).toMatch(/^[0-9a-f]{12}$/);
  });

  it('derives different ids for the same question in different topics', () => {
    const a = parseMarkdown(content, 'topic-a');
    const b = parseMarkdown(content, 'topic-b');
    expect(a.checkpoints[0].id).not.toBe(b.checkpoints[0].id);
  });

  it('honors an explicit id from the directive YAML', () => {
    const explicit = content.replace('question:', 'id: my-custom-id\nquestion:');
    const parsed = parseMarkdown(explicit, 'topic-a');
    expect(parsed.checkpoints[0].id).toBe('my-custom-id');
  });

  it('throws on unclosed directives', () => {
    expect(() => parseMarkdown(':::note\nnever closed', 't')).toThrow(/Unclosed/);
  });
});

describe('validateBlocks', () => {
  it('rejects disallowed code languages', () => {
    expect(() => validateBlocks([{ type: 'code', language: 'cobol', code: 'MOVE A TO B.' }], 'x'))
      .toThrow(/unsupported code language/);
  });

  it('rejects embeds off the host allowlist', () => {
    expect(() => validateBlocks([{ type: 'embed', url: 'https://evil.example/video' }], 'x'))
      .toThrow(/allowlist/);
  });

  it('rejects images without alt text or with traversal paths', () => {
    expect(() => validateBlocks([{ type: 'image', src: './assets/diagram.svg' }], 'x')).toThrow(/alt text/);
    expect(() => validateBlocks([{ type: 'image', src: '../secrets.svg', alt: 'x' }], 'x')).toThrow(/safe https/);
  });

  it('rejects invalid KaTeX', () => {
    expect(() => validateBlocks([{ type: 'math', math: '\\frac{' }], 'x')).toThrow(/invalid KaTeX/);
  });

  it('accepts valid blocks', () => {
    expect(() =>
      validateBlocks([
        { type: 'math', math: '\\theta_{t+1} = \\theta_t - \\eta \\nabla J' },
        { type: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      ], 'x')
    ).not.toThrow();
  });
});

describe('validateCheckpoints', () => {
  const valid = {
    id: 'q1',
    question: 'Pick one',
    options: ['a', 'b'],
    correctIndex: 1,
    explanation: 'Because b.',
  };

  it('accepts a well-formed file-based checkpoint', () => {
    expect(() => validateCheckpoints([valid], 'checkpoints.yml')).not.toThrow();
  });

  it('rejects missing explanation and bad correctIndex', () => {
    expect(() => validateCheckpoints([{ ...valid, explanation: '' }], 'f')).toThrow(/explanation/);
    expect(() => validateCheckpoints([{ ...valid, correctIndex: 5 }], 'f')).toThrow(/correctIndex/);
    expect(() => validateCheckpoints([{ ...valid, options: ['only'] }], 'f')).toThrow(/two options/);
  });

  it('applies the safe-text policy to checkpoint fields (file path bypass)', () => {
    expect(() => validateCheckpoints([{ ...valid, question: '<script>x</script>' }], 'checkpoints.yml'))
      .toThrow(/script tags/);
  });
});

describe('validateHeadingHierarchy', () => {
  it('rejects h1 in body and skipped levels', () => {
    expect(() => validateHeadingHierarchy('# Title', 'x')).toThrow(/top-level # headings/);
    expect(() => validateHeadingHierarchy('## A\n#### B', 'x')).toThrow(/skips/);
  });

  it('allows a sane hierarchy', () => {
    expect(() => validateHeadingHierarchy('## A\n### B\n## C', 'x')).not.toThrow();
  });
});

describe('deterministicCheckpointId + tokenSimilarity', () => {
  it('is stable and length-bounded', () => {
    expect(deterministicCheckpointId('t', 'q')).toBe(deterministicCheckpointId('t', 'q'));
    expect(deterministicCheckpointId('t', 'q')).toHaveLength(12);
  });

  it('detects near-duplicates at the corpus threshold', () => {
    const text = 'the quick brown fox jumps over the lazy dog'.split(' ').join(' ');
    expect(tokenSimilarity(text, text)).toBe(1);
    expect(tokenSimilarity('alpha beta gamma', 'delta epsilon zeta')).toBeLessThan(0.3);
  });
});
