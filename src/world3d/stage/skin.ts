/** Forme del palco: gettone piatto con spessore (predefinito) bolla trasparente o palla piena. */
export type SkinKind = 'tile' | 'bubble' | 'ball';

/** Attributi da spargere su un elemento (di solito un pulsante) perché il palco 3D lo ridisegni. */
export function skin(color?: string, kind: SkinKind = 'tile'): Record<string, string> {
  const base: Record<string, string> = { 'data-skin': kind === 'tile' ? '' : kind };
  if (color) base['data-skin-color'] = color;
  return base;
}
