import type { TextStyle } from '../types';

export const TEXT_STYLES: readonly TextStyle[] = ['upper', 'lower', 'cursive'];

export const TEXT_STYLE_LABELS: Record<TextStyle, string> = {
  upper: 'STAMPATELLO MAIUSCOLO',
  lower: 'stampatello minuscolo',
  cursive: 'corsivo',
};

/** Short names for the buttons of the parents' settings. */
export const TEXT_STYLE_NAMES: Record<TextStyle, string> = {
  upper: 'MAIUSCOLO',
  lower: 'minuscolo',
  cursive: 'corsivo',
};

/** Rewrites a word in the style chosen by the parents. */
export function applyTextStyle(text: string, style: TextStyle): string {
  return style === 'upper' ? text.toUpperCase() : text.toLowerCase();
}

/** Extra CSS class for the style (only cursive needs a dedicated typeface). */
export function textStyleClass(style: TextStyle): string {
  return style === 'cursive' ? 'font-cursive' : '';
}
