import { describe, expect, it } from 'vitest';
import { backupFileName, formatDuration } from '../../src/utils/format';

describe('formatDuration', () => {
  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [60, '1 min'],
    [125, '2 min'],
    [3600, '1 h 00 min'],
    [3725, '1 h 02 min'],
    [-10, '0 s'],
    [Number.NaN, '0 s'],
  ])('%s -> %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe('backupFileName', () => {
  it('includes the local date', () => {
    expect(backupFileName(new Date(2026, 0, 9))).toBe('alfabimbi-backup-2026-01-09.json');
  });
});
