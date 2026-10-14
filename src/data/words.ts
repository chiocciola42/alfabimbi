import type { LetterData } from '../types';

export type WordCategory = LetterData['category'];

export interface PoolWord {
  word: string;
  emoji: string;
  category: WordCategory;
}

const A: WordCategory = 'Animale';
const O: WordCategory = 'Oggetto';
const N: WordCategory = 'Natura';
const C: WordCategory = 'Cibo';
const w = (word: string, emoji: string, category: WordCategory): PoolWord => ({ word, emoji, category });

/**
 * Words available for each letter. The first entry is the letter's signature word (the one the
 * fun fact in `alphabet.ts` talks about); the app rotates through the pool, one word per day.
 */
export const WORD_POOLS: Record<string, PoolWord[]> = {
  A: [w('Ape', '🐝', A), w('Albero', '🌳', N), w('Arcobaleno', '🌈', N), w('Aereo', '✈️', O), w('Anatra', '🦆', A), w('Arancia', '🍊', C)],
  E: [w('Elefante', '🐘', A), w('Elicottero', '🚁', O), w('Erba', '🌱', N), w('Elfo', '🧝', O), w('Edera', '🌿', N)],
  I: [w('Istrice', '🦔', A), w('Isola', '🏝️', N), w('Ippopotamo', '🦛', A), w('Imbuto', '🫗', O), w('Igloo', '🧊', O)],
  O: [w('Orso', '🐻', A), w('Orologio', '⏰', O), w('Occhiali', '👓', O), w('Oca', '🪿', A), w('Ombrello', '☂️', O), w('Ostrica', '🦪', A)],
  U: [w('Uva', '🍇', C), w('Uccellino', '🐦', A), w('Unicorno', '🦄', O), w('Uovo', '🥚', C), w('Ufo', '🛸', O)],
  B: [w('Barca', '⛵', O), w('Bambola', '🪆', O), w('Balena', '🐋', A), w('Biscotto', '🍪', C), w('Banana', '🍌', C), w('Bicicletta', '🚲', O)],
  C: [w('Cane', '🐶', A), w('Casa', '🏠', O), w('Cuore', '❤️', O), w('Carota', '🥕', C), w('Cavallo', '🐴', A), w('Ciliegia', '🍒', C)],
  D: [w('Delfino', '🐬', A), w('Dado', '🎲', O), w('Dinosauro', '🦖', A), w('Dente', '🦷', O), w('Diamante', '💎', O)],
  F: [w('Farfalla', '🦋', A), w('Fiore', '🌸', N), w('Fragola', '🍓', C), w('Formica', '🐜', A), w('Fungo', '🍄', N), w('Fuoco', '🔥', N)],
  G: [w('Gatto', '🐱', A), w('Gelato', '🍦', C), w('Giraffa', '🦒', A), w('Girasole', '🌻', N), w('Gufo', '🦉', A), w('Giostra', '🎠', O)],
  M: [w('Mela', '🍎', C), w('Mamma', '👩', O), w('Musica', '🎵', O), w('Miele', '🍯', C), w('Mare', '🌊', N), w('Mucca', '🐮', A)],
  P: [w('Pinguino', '🐧', A), w('Papà', '👨', O), w('Palla', '⚽', O), w('Pizza', '🍕', C), w('Pesce', '🐟', A), w('Pera', '🍐', C)],
  T: [w('Tartaruga', '🐢', A), w('Treno', '🚂', O), w('Tigre', '🐯', A), w('Torta', '🎂', C), w('Telefono', '📞', O), w('Tulipano', '🌷', N)],
  L: [w('Leone', '🦁', A), w('Luna', '🌙', N), w('Libro', '📚', O), w('Limone', '🍋', C), w('Lupo', '🐺', A), w('Lampada', '💡', O)],
  N: [w('Nuvola', '☁️', N), w('Nido', '🪺', A), w('Notte', '🌃', N), w('Nave', '🚢', O), w('Naso', '👃', O), w('Neve', '❄️', N)],
  R: [w('Rana', '🐸', A), w('Rosa', '🌹', N), w('Robot', '🤖', O), w('Regina', '👸', O), w('Ragno', '🕷️', A), w('Razzo', '🚀', O)],
  S: [w('Sole', '☀️', N), w('Stella', '⭐', N), w('Serpente', '🐍', A), w('Sirena', '🧜‍♀️', O), w('Scarpa', '👟', O), w('Scimmia', '🐒', A)],
  V: [w('Volpe', '🦊', A), w('Vento', '🌬️', N), w('Violino', '🎻', O), w('Vaso', '🏺', O), w('Vulcano', '🌋', N), w('Verdura', '🥦', C)],
  Z: [w('Zebra', '🦓', A), w('Zaino', '🎒', O), w('Zucchina', '🥒', C), w('Zuppa', '🍲', C), w('Zucchero', '🍬', C)],
  H: [w('Hotel', '🏨', O), w('Hamburger', '🍔', C), w('Hockey', '🏒', O), w('Hawaii', '🌺', N), w('Hobby', '🎨', O), w('Hula-hop', '⭕', O)],
  Q: [w('Quercia', '🌳', N), w('Quaderno', '📓', O), w('Quadro', '🖼️', O), w('Quattro', '4️⃣', O), w('Quaglia', '🐦', A)],
  J: [w('Jeans', '👖', O), w('Jolly', '🃏', O), w('Judo', '🥋', O), w('Jazz', '🎷', O), w('Jukebox', '🎶', O)],
  K: [w('Koala', '🐨', A), w('Kiwi', '🥝', C), w('Kayak', '🛶', O), w('Karate', '🥋', O), w('Kimono', '👘', O)],
  W: [w('Waffle', '🧇', C), w('Windsurf', '🏄', O), w('Waterpolo', '🤽', O), w('Wafer', '🍫', C), w('Web', '🌐', O)],
  X: [w('Xilofono', '🎶', O), w('Xilofonista', '🧑‍🎤', O), w('Xilografia', '🪵', O), w('Xenon', '💡', O), w('X-ray', '🩻', O)],
  Y: [w('Yogurt', '🥣', C), w('Yoyo', '🪀', O), w('Yoga', '🧘', O), w('Yacht', '🛥️', O), w('Yak', '🐂', A)],
};
