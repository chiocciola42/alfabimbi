/**
 * Le finestre modali native vivono nel "top layer" del browser, sopra qualsiasi z-index. Il palco 3D e i
 * coriandoli sono elementi fissi a tutto schermo: per restare visibili sopra una modale devono entrare nel
 * top layer dopo di lei. Chi apre una modale lo annuncia con questo evento e loro si rimettono in cima.
 */
export const TOP_LAYER_EVENT = 'alfabimbi:top-layer';

export function announceTopLayer(): void {
  window.dispatchEvent(new Event(TOP_LAYER_EVENT));
}

/** Rimette in cima al top layer un elemento `popover="manual"` (se il browser li supporta). */
export function raiseInTopLayer(el: HTMLElement): void {
  if (typeof el.showPopover !== 'function' || !el.hasAttribute('popover')) return;
  if (el.matches(':popover-open')) el.hidePopover();
  el.showPopover();
}

/** Stile che azzera quello predefinito dei popover: l'elemento resta un livello fisso, trasparente e senza bordi. */
export const TOP_LAYER_RESET_CSS = 'margin:0;padding:0;border:0;background:transparent;overflow:visible;';
