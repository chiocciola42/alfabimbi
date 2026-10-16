import { seededShuffle } from './dailyWords';

/**
 * Vocabolario inglese di livello zero: si ascolta la parola e si tocca l'immagine, senza leggere.
 * Otto "mondi" tematici da otto parole. Ogni parola ha un'emoji unica in tutto il vocabolario,
 * così le immagini tra cui scegliere non sono mai ambigue.
 */
export interface EnglishWord {
  /** La parola inglese in minuscolo, anche identificativo ("dog", "thank you"). */
  word: string;
  emoji: string;
  /** Id del mondo a cui appartiene. */
  world: string;
}

export interface EnglishWorld {
  id: string;
  /** Nome del mondo, per la bambina e per i genitori. */
  title: string;
  emoji: string;
  words: EnglishWord[];
}

const world = (id: string, title: string, emoji: string, entries: Array<[string, string]>): EnglishWorld => ({
  id,
  title,
  emoji,
  words: entries.map(([word, e]) => ({ word, emoji: e, world: id })),
});

export const ENGLISH_WORLDS: EnglishWorld[] = [
  world('colors', 'Colori', '🎨', [
    ['red', '🔴'], ['blue', '🔵'], ['yellow', '🟡'], ['green', '🟢'],
    ['orange', '🟠'], ['purple', '🟣'], ['black', '⚫'], ['white', '⚪'],
  ]),
  world('numbers', 'Numeri', '🔢', [
    ['one', '1️⃣'], ['two', '2️⃣'], ['three', '3️⃣'], ['four', '4️⃣'],
    ['five', '5️⃣'], ['six', '6️⃣'], ['seven', '7️⃣'], ['eight', '8️⃣'],
  ]),
  world('animals', 'Animali', '🐾', [
    ['dog', '🐶'], ['cat', '🐱'], ['bird', '🐦'], ['fish', '🐟'],
    ['pig', '🐷'], ['cow', '🐮'], ['duck', '🦆'], ['frog', '🐸'],
  ]),
  world('family', 'Famiglia', '👨‍👩‍👧', [
    ['mum', '👩'], ['dad', '👨'], ['baby', '👶'], ['boy', '👦'],
    ['girl', '👧'], ['grandma', '👵'], ['grandpa', '👴'], ['family', '👨‍👩‍👧'],
  ]),
  world('body', 'Il corpo', '🖐️', [
    ['eye', '👁️'], ['ear', '👂'], ['nose', '👃'], ['mouth', '👄'],
    ['hand', '✋'], ['foot', '🦶'], ['leg', '🦵'], ['tooth', '🦷'],
  ]),
  world('food', 'Cibo', '🍎', [
    ['apple', '🍎'], ['banana', '🍌'], ['bread', '🍞'], ['milk', '🥛'],
    ['egg', '🥚'], ['cheese', '🧀'], ['cake', '🎂'], ['pizza', '🍕'],
  ]),
  world('toys', 'Giocattoli', '🧸', [
    ['ball', '⚽'], ['car', '🚗'], ['kite', '🪁'], ['teddy bear', '🧸'],
    ['bike', '🚲'], ['train', '🚂'], ['robot', '🤖'], ['balloon', '🎈'],
  ]),
  world('hello', 'Ciao!', '👋', [
    ['hello', '👋'], ['thank you', '🙏'], ['yes', '✅'], ['no', '❌'],
    ['happy', '😊'], ['sad', '😢'], ['good night', '🌙'], ['good morning', '🌅'],
  ]),
];

export const ENGLISH_WORDS: EnglishWord[] = ENGLISH_WORLDS.flatMap((w) => w.words);

export const ENGLISH_WORLD_SIZE = 8;

export function findEnglishWorld(id: string): EnglishWorld {
  return ENGLISH_WORLDS.find((w) => w.id === id) ?? ENGLISH_WORLDS[0];
}

/** Primo mondo con ancora qualche parola da imparare (o il primo, se le ha imparate tutte). */
export function suggestedEnglishWorld(learned: readonly string[]): EnglishWorld {
  const known = new Set(learned);
  return ENGLISH_WORLDS.find((w) => w.words.some((x) => !known.has(x.word))) ?? ENGLISH_WORLDS[0];
}

/** Ordine di gioco di un mondo: prima le parole non ancora imparate. Deterministico per `seed`. */
export function englishRoundOrder(worldId: string, learned: readonly string[], seed: number): EnglishWord[] {
  const known = new Set(learned);
  const shuffled = seededShuffle(findEnglishWorld(worldId).words, seed);
  return [...shuffled.filter((w) => !known.has(w.word)), ...shuffled.filter((w) => known.has(w.word))];
}

/** Immagini tra cui scegliere: la parola giusta più `count - 1` altre dello stesso mondo, mescolate. */
export function pickEnglishChoices(target: EnglishWord, count: number, rnd: () => number = Math.random): EnglishWord[] {
  const others = findEnglishWorld(target.world).words.filter((w) => w.word !== target.word);
  const distractors: EnglishWord[] = [];
  while (distractors.length < count - 1 && others.length > 0) {
    const [pick] = others.splice(Math.floor(rnd() * others.length), 1);
    distractors.push(pick);
  }
  const all = [...distractors, target];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
