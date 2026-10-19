# Alfabimbi

Webapp educativa per imparare giocando. Dalla pagina iniziale si sceglie la materia (Italiano, Matematica, Inglese):

- **Italiano**: esplora le lettere, traccia maiuscolo e minuscolo, gioca con le bolle e le parole e impara a leggere con **Leggi le Parole**: parole divise in sillabe (lette ad alta voce evidenziando ogni sillaba), "leggi e scegli l'immagine" e "metti in ordine le sillabe", su 3 livelli di lunghezza che crescono con la bambina.
- **Italiano, scheda Esercizi** (sul modello del sillabario): *Sillabe* (consonante + vocale = sillaba → parola-immagine, per 10 consonanti, più le sillabe al contrario AL EL IL OL UL; ogni sillaba e parola si può ascoltare), *Trova la sillaba* (si ascolta e si tocca quella scritta), *Scrivi la sillaba* (si compongono le lettere nell'ordine giusto, anche al contrario), *Completa la parola* (una sillaba nascosta, tre tra cui scegliere; la parola entra nel diario), *Inizia con…* (sei disegni, si toccano quelli che iniziano con la lettera e il cerchio diventa verde; le immagini ambigue come 🐟 sono escluse) e *Cerchia le lettere* (si toccano tutte le L di STELLA). Si può scegliere la consonante o la lettera e la lunghezza delle parole; dopo due errori l'elemento giusto si illumina. Le sillabe imparate sono salvate nel profilo e contate nei traguardi.
- **Matematica** (ex Matemagica): mappa con 10 mondi e 50 livelli (conta, confronta, linea dei numeri, addizioni e sottrazioni, decine e unità, geometria, problemi, il Parco dei Giochi Logici con telaio del 10, bilancia, serie, forme, orologio e monete, e Piland con somme passando dal 10, conta e scrivi, numeri in ordine e puzzle a missioni) e un laboratorio libero con abaco, linea dei numeri, amici del 10, monetine, rekenrek e bilancia.
- **Inglese**: pensato per un bambino che non sa nulla di inglese, procede dall'ascolto alla lettura e alla scrittura (istruzioni in italiano, contenuti in inglese). **Parole Inglesi** (livello zero, senza leggere): 8 mondi da 8 parole (colori, numeri, animali, famiglia, corpo, cibo, giocattoli, saluti); si ascolta la parola e si tocca l'immagine. **ABC Inglese**: le 26 lettere con il nome inglese e la parola-immagine ("A is for apple"), più il gioco "trova la lettera" dal nome. **Leggi in Inglese** ha due modi: *parole-rima* (phonics: cat, hat, bat…, si sceglie la lettera iniziale davanti alla rima e la parola viene letta "at… cat") e *a colpo d'occhio* (24 parole molto frequenti come the, is, you in 6 gruppi: si ascolta e si tocca la parola scritta; dopo il primo errore la carta giusta si illumina). **Scrivi in Inglese**: si tracciano le 26 lettere (stesse guide dell'italiano, con la parola-immagine inglese) e poi si *costruiscono* le parole corte toccando le lettere nell'ordine giusto. **Storie e Canzoni**: 3 storielle e 4 canzoncine tradizionali; la voce legge riga per riga mentre le parole si illuminano (i tempi sono stimati, il browser non dice quando parla) e ogni parola o riga si può toccare per riascoltarla; si finisce ascoltando tutte le righe. La voce usa un sintetizzatore inglese (en-GB, con ripiego su qualsiasi voce inglese installata): la qualità dipende dal dispositivo.

Dalla home si vedono i **traguardi**: barra delle missioni e, per ogni materia, la mappa che si colora (alfabeto lettera per lettera, mondi dei numeri uno a uno), il diario delle parole lette e un attestato stampabile ogni 5 lettere imparate o ogni 5 livelli di matematica. Ovunque ci sia del testo c'è un pulsante con l'altoparlante e i bersagli da toccare sono grandi almeno 56 px (anche in matematica, dove i quiz propongono al massimo 3 risposte). L'**area genitori** (profilo, backup, azzeramento e scelta del carattere: MAIUSCOLO, minuscolo o corsivo) si apre tenendo premuto per 3 secondi il pulsante con l'avatar.

Le due materie condividono profilo, **stelle**, **Album Premi** (figurine, scena, missioni del giorno) e statistiche d'uso: ogni livello di matematica o attività di italiano e inglese guadagna stelle nello stesso salvadanaio. Per l'inglese la home mostra la mappa dei mondi di parole, l'alfabeto inglese e cinque contatori (parole-rima, a colpo d'occhio, lettere scritte, parole costruite, storie e canzoni), più una missione dedicata. È una PWA installabile che funziona anche offline.

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

- **Avanzamento**: profilo, stelle, lettere tracciate/padroneggiate, stelline dei livelli di matematica, parole, lettere, paroline, lettere tracciate e storie di inglese, figurine, scena, missioni, preferenze audio.
- **Utilizzo**: sessioni, tempo di gioco totale / per sezione / per giorno, contatori per tipo di attività, registro degli ultimi 500 eventi.

Dettagli di robustezza: copia di sicurezza automatica dell'ultimo salvataggio valido, validazione e ripulitura dei dati letti, migrazione dal vecchio formato (`alfabimbi_child_progress_v2`), sincronizzazione tra schede/finestre aperte, richiesta di archiviazione persistente al browser, avviso se il salvataggio non è disponibile. Dal profilo si può scaricare e ripristinare un backup `.json` (utile per cambiare dispositivo: i dati non viaggiano da soli).

## Struttura

```
src/
  App.tsx, main.tsx          shell, navigazione, registrazione service worker
  components/                schermate e giochi (Home, italiano, Math*)
  math/                      mondi, livelli e generatore di domande di matematica
  data/alphabet.ts           lettere, tracciati, album e figurine
  data/english*.ts           inglese: vocabolario per mondi, alfabeto, famiglie di parole
  hooks/useProgress.ts       stato applicativo + effetti (suoni, coriandoli, salvataggio)
  hooks/useUsageTracker.ts   tempo di utilizzo (solo a pagina visibile)
  state/                     logica pura (progresso, utilizzo) senza React
  storage/persistence.ts     schema, validazione, salvataggio, import/export
tests/unit, tests/e2e        Vitest + Testing Library, Playwright
```
