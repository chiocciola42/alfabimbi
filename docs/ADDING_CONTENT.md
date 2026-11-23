# Far crescere l'arcipelago

L'app è un arcipelago: **isola** (materia) → **città** (gruppo di giochi) → **gioco** (o livello).
Tutto è descritto da dati in `src/world/`; la scena 3D (`src/world3d/`) si costruisce da sola da quei dati,
quindi aggiungere contenuti non richiede di toccare il codice 3D.

## Aggiungere una città a un'isola

Aggiungi una voce a `cities` in `src/world/islands/<isola>.ts`:

```ts
{
  id: 'it-biblioteca',            // unico in tutto l'arcipelago
  name: 'Biblioteca Magica',
  emoji: '📚',
  theme: 'tower',                 // aspetto: village | harbor | castle | tower | market | lighthouse | forest | lab | theater
  color: '#8b5cf6',               // colore dei tetti
  description: 'Frase breve letta ad alta voce dal pulsante dell\'altoparlante.',
  clearStars: 12,                 // stelle da raccogliere qui per superare la città
  games: [tabGame('reading')],
}
```

- Le città si dispongono da sole lungo un sentiero a serpentina (`layoutIsland` in `src/world/layout.ts`) e l'isola si allarga per contenerle.
- La città si apre quando la precedente raggiunge le sue `clearStars` (`isCityUnlocked` in `src/state/world.ts`). Con `branchFrom: '<id città>'` il sentiero parte da un'altra città; con `alwaysOpen: true` la città è sempre aperta.
- Superata la città arriva una figurina (`claimCityReward`) e il sentiero verso la successiva si illumina.
- Un nuovo id va anche in `seedCityStars` solo se esisteva già un gioco giocabile prima (migrazione): per contenuti nuovi non serve.

## Aggiungere un gioco a una città

1. Crea il componente in `src/components/` e i dati in `src/data/`, come per gli altri giochi.
2. Aggiungi l'id a `TabId` (`src/types.ts`) e a `TAB_IDS` (`src/state/usage.ts`), così il tempo di gioco viene contato.
3. Registralo in `TAB_GAMES` (`src/world/games.ts`) e citalo in `games` della città.
4. Mostralo in `src/App.tsx` con un blocco `currentTab === '<id>'`, passando `onRewardStars={rewardStars}`: le stelle contano così sia nel totale sia per la città in cui si sta giocando.
5. Se serve un progresso nuovo (parole imparate ecc.) aggiungi il campo in `ChildProgress`, `INITIAL_PROGRESS` e `sanitizeProgress`, come ora.

## Aggiungere livelli o mondi di matematica

Come prima, in `src/math/worlds.ts`: ogni mondo è una città e ogni livello un gioco (`src/world/islands/math.ts` li genera). `clearStars` di una città di matematica è calcolata dal numero di livelli. Le stelline (0-3) dei livelli sono le stelle della città, quindi `sanitizeLevelStars` e i test dei generatori restano la fonte di verità.

## Aggiungere un'isola

Crea `src/world/islands/<nome>.ts` con un `IslandDef` (palette dei colori della terra, città) e aggiungila a `ISLANDS` in `src/world/index.ts`. Va aggiunto anche il valore a `Section` se rappresenta una nuova materia (`src/types.ts`) e il suo nome in `HomeScreen` solo per il ripiego senza 3D.

## Controlli automatici

`tests/unit/world.test.ts` verifica id unici, riferimenti validi, città non sovrapposte, che nessun livello di matematica vada perso e la logica di sblocco e premi.
