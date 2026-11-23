/** Attributi da spargere su un elemento (di solito un pulsante) perché il palco 3D lo ridisegni. */
export function skin(color?: string): Record<string, string> {
  return color ? { 'data-skin': '', 'data-skin-color': color } : { 'data-skin': '' };
}
