import { describe, expect, it } from 'vitest';
import { TEXT_STYLES, TEXT_STYLE_LABELS, TEXT_STYLE_NAMES, applyTextStyle, textStyleClass } from '../../src/utils/textStyle';

describe('text style', () => {
  it('writes words in capital letters, lowercase or cursive (lowercase letters)', () => {
    expect(applyTextStyle('Casa', 'upper')).toBe('CASA');
    expect(applyTextStyle('Casa', 'lower')).toBe('casa');
    expect(applyTextStyle('CASA', 'cursive')).toBe('casa');
  });

  it('keeps accented letters', () => {
    expect(applyTextStyle('Papà', 'upper')).toBe('PAPÀ');
    expect(applyTextStyle('PAPÀ', 'lower')).toBe('papà');
  });

  it('only the cursive style needs its own typeface', () => {
    expect(textStyleClass('cursive')).toBe('font-cursive');
    expect(textStyleClass('upper')).toBe('');
    expect(textStyleClass('lower')).toBe('');
  });

  it('has a label and a short name for every style', () => {
    for (const s of TEXT_STYLES) {
      expect(TEXT_STYLE_LABELS[s].length).toBeGreaterThan(0);
      expect(TEXT_STYLE_NAMES[s].length).toBeGreaterThan(0);
    }
  });
});
