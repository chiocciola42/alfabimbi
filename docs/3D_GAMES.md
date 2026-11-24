# Giochi in 3D

I giochi sono ancora componenti React con pulsanti veri: voce, tocchi, etichette, tastiera e test restano quelli di sempre.
Il 3D è un **palco** (`src/world3d/stage/`): un solo canvas WebGL `position: fixed` sopra la pagina, `pointer-events: none`,
montato da `App.tsx` solo sulle schede di gioco, se c'è WebGL e se i genitori non hanno spento "Grafica dei giochi".

## Due modi per portare in 3D qualcosa

### 1. "Pelle" per un elemento DOM: `data-skin`
```tsx
import { skin } from '../world3d/stage/skin';
<button {...skin()} className="… bg-amber-50 …">A</button>          // gettone con spessore, luci, rimbalzo
<button {...skin('#38bdf8', 'bubble')}>…</button>                    // bolla sferica trasparente
<span {...skin(undefined, 'ball')} className="… bg-rose-500 …" />   // palla piena (colore letto dal CSS)
```
Ogni fotogramma il palco legge il rettangolo, i colori, il bordo, il raggio e il testo dell'elemento e li ridisegna su un gettone 3D
(`domTexture.ts`, `skinStyle.ts`). Quando la classe cambia verso il verde parte il salto con le stelline, verso il rosso la scossa
(`moodOfColor`). Regole da ricordare:

- l'elemento deve avere uno **sfondo** (o `data-skin-color` se è un gradiente);
- deve essere una **foglia**: se contiene icone SVG, immagini, pulsanti o altri `data-skin` non viene ridisegnato e resta com'è;
- se è coperto da un pannello o da un velo (controllo su cinque punti) non viene disegnato;
- il DOM sotto resta quello vero: riceve i tocchi, ha `aria-label`, `data-correct`, testid e misure da 56px.

### 2. Oggetto 3D legato a un'ancora: `data-stage-prop`
Un elemento "ancora" (vuoto, o un involucro con il disegno piatto nella classe `stage-flat`) indica dove sta l'oggetto e con quali parametri:
```tsx
<div aria-hidden="true" data-stage-prop="letter3d" data-stage-strokes={JSON.stringify(...)} data-stage-progress={0.4} className="h-36" />
<div role="img" aria-label="Orologio analogico" data-stage-prop="clock3d" data-stage-hour={3} data-stage-minute={30}>
  <svg className="stage-flat" aria-hidden="true">…</svg>   {/* si nasconde solo quando il 3D è attivo */}
</div>
```
Gli oggetti sono in `src/world3d/stage/props/` e si registrano in `PROPS` (`props/index.ts`): `letter3d` (tubi lungo le guide, si colora col tracciamento),
`trophy` (coppa con stelle), `curtain` (sipario con note), `clock3d`, `shape3d`. Un nuovo oggetto è una funzione `(el) => { group, update(dt, time, el), dispose() }`;
le unità sono relative al lato minore dell'ancora (1 = tutto il lato).

## Perché funziona senza rompere nulla
- Senza WebGL (jsdom, dispositivi vecchi) o con l'interruttore spento il palco non esiste: i giochi sono identici a prima.
- Le ancore vuote sono nascoste dal CSS finché il palco non è attivo (`.stage3d-on` sull'elemento radice, in `src/index.css`).
- Un solo contesto WebGL; il ciclo si ferma a scheda nascosta; geometrie in cache; `dispose` completo quando si lascia il gioco.

## Aggiungere il 3D a un nuovo gioco
1. Metti `{...skin()}` (o `'ball'`/`'bubble'`) sui pulsanti con sfondo.
2. Se vuoi un oggetto proprio, scrivi la prop in `props/`, registrala in `PROPS` e usa l'ancora.
3. Prova a schermo con `npm run build && npm run preview` e controlla i 56px con i test e2e (`tests/e2e/stage.spec.ts`).
