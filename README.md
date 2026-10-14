# Alfabimbi

Webapp educativa per imparare giocando. Dalla pagina iniziale si sceglie la materia:

- **Italiano**: esplora le lettere, traccia maiuscolo e minuscolo, gioca con le bolle e le parole.
- **Matematica** (ex Matemagica): mappa con 8 mondi e 40 livelli (conta, confronta, linea dei numeri, addizioni e sottrazioni, decine e unità, geometria, problemi) e un laboratorio libero con abaco, linea dei numeri, amici del 10 e monetine.

Le due materie condividono profilo, **stelle**, **Album Premi** (figurine, scena, missioni del giorno) e statistiche d'uso: ogni livello di matematica o attività di italiano guadagna stelle nello stesso salvadanaio. È una PWA installabile che funziona anche offline.

## Sviluppo

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint         # controllo dei tipi (tsc)
npm test             # test unitari e di componente (Vitest)
npm run test:e2e     # test end-to-end su build di produzione (Playwright)
npm run test:all     # tutto quanto sopra + build
npm run icons        # rigenera le icone PWA in public/ (scripts/generate-icons.mjs)
```

Per i test e2e serve Chromium: Playwright usa quello in `/opt/pw-browsers/chromium` se presente (o la variabile `CHROMIUM_PATH`), altrimenti quello scaricato con `npx playwright install chromium`.

## Pubblicazione su Vercel (piano Hobby)

1. Importa il repository su Vercel: il preset Vite viene riconosciuto da `vercel.json` (install `npm ci`, build `npm run build`, output `dist`).
2. Nessuna variabile d'ambiente né funzione server: è un sito statico.
3. `vercel.json` gestisce il fallback SPA, la cache immutabile di `/assets`, l'assenza di cache per `sw.js`, `manifest.webmanifest` e `index.html` (così gli aggiornamenti arrivano subito) e alcuni header di sicurezza.

## Dove sono salvati i dati

Tutto resta sul dispositivo (nessun server, nessun account), in `localStorage` alla chiave `alfabimbi:state`:

- **Avanzamento**: profilo, stelle, lettere tracciate/padroneggiate, stelline dei livelli di matematica, figurine, scena, missioni, preferenze audio.
- **Utilizzo**: sessioni, tempo di gioco totale / per sezione / per giorno, contatori per tipo di attività, registro degli ultimi 500 eventi.

Dettagli di robustezza: copia di sicurezza automatica dell'ultimo salvataggio valido, validazione e ripulitura dei dati letti, migrazione dal vecchio formato (`alfabimbi_child_progress_v2`), sincronizzazione tra schede/finestre aperte, richiesta di archiviazione persistente al browser, avviso se il salvataggio non è disponibile. Dal profilo si può scaricare e ripristinare un backup `.json` (utile per cambiare dispositivo: i dati non viaggiano da soli).

## Struttura

```
src/
  App.tsx, main.tsx          shell, navigazione, registrazione service worker
  components/                schermate e giochi (Home, italiano, Math*)
  math/                      mondi, livelli e generatore di domande di matematica
  data/alphabet.ts           lettere, tracciati, album e figurine
  hooks/useProgress.ts       stato applicativo + effetti (suoni, coriandoli, salvataggio)
  hooks/useUsageTracker.ts   tempo di utilizzo (solo a pagina visibile)
  state/                     logica pura (progresso, utilizzo) senza React
  storage/persistence.ts     schema, validazione, salvataggio, import/export
tests/unit, tests/e2e        Vitest + Testing Library, Playwright
```
