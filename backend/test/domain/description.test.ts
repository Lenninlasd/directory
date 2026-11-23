import { describe, expect, it } from 'vitest';
import { normalizeDescription } from '../../src/domain/description.ts';

// Directory spec, "Description validity": 1 to 300 characters after trimming both ends, returned trimmed, or `null`.
describe('normalizeDescription', () => {
  it('returns a valid description without its surrounding spaces', () => {
    expect(normalizeDescription('  Pan artesanal y tortas por encargo. ')).toBe('Pan artesanal y tortas por encargo.');
  });

  it('keeps the line breaks inside the text', () => {
    expect(normalizeDescription('\nPan artesanal.\nTortas por encargo.\n')).toBe('Pan artesanal.\nTortas por encargo.');
  });

  it('keeps markup as plain text', () => {
    expect(normalizeDescription('<b>Pan</b>')).toBe('<b>Pan</b>');
  });

  it('accepts 300 characters and rejects 301', () => {
    expect(normalizeDescription('a'.repeat(300))).toBe('a'.repeat(300));
    expect(normalizeDescription('a'.repeat(301))).toBeNull();
  });

  it('counts the length after trimming', () => {
    expect(normalizeDescription(`  ${'a'.repeat(300)}  `)).toBe('a'.repeat(300));
  });

  it('counts characters, not UTF-16 code units', () => {
    expect(normalizeDescription('ñ'.repeat(300))).toBe('ñ'.repeat(300));
    expect(normalizeDescription('🥐'.repeat(300))).toBe('🥐'.repeat(300));
    expect(normalizeDescription('🥐'.repeat(301))).toBeNull();
  });

  it('rejects an empty description, or one with only spaces or line breaks', () => {
    expect(normalizeDescription('')).toBeNull();
    expect(normalizeDescription('   ')).toBeNull();
    expect(normalizeDescription('\n\n\r\n')).toBeNull();
  });

  it('returns null for a missing description', () => {
    expect(normalizeDescription(null)).toBeNull();
  });
});
