/**
 * Storie e canzoncine per leggere in inglese. Le storie sono brevi (3-4 frasi) e usano parole già
 * incontrate nel gioco; le canzoncine sono filastrocche tradizionali di pubblico dominio.
 */
export interface StoryLine {
  text: string;
  /** Un'immagine che aiuta a capire la frase. */
  emoji: string;
}

export interface EnglishStory {
  id: string;
  kind: 'story' | 'song';
  title: string;
  emoji: string;
  lines: StoryLine[];
}

const line = (text: string, emoji: string): StoryLine => ({ text, emoji });

export const ENGLISH_STORIES: EnglishStory[] = [
  {
    id: 'red-cat',
    kind: 'story',
    title: 'The Red Cat',
    emoji: '🐱',
    lines: [line('I see a cat.', '👀'), line('The cat is red.', '🔴'), line('The cat can run.', '🏃'), line('I like the cat!', '❤️')],
  },
  {
    id: 'my-dog',
    kind: 'story',
    title: 'My Dog',
    emoji: '🐶',
    lines: [line('I have a dog.', '🐶'), line('The dog is big.', '🐘'), line('We play and play.', '⚽'), line('I like my dog!', '❤️')],
  },
  {
    id: 'hot-day',
    kind: 'story',
    title: 'A Hot Day',
    emoji: '☀️',
    lines: [line('The sun is hot.', '☀️'), line('I am hot.', '🥵'), line('Look at the ice cream!', '🍦'), line('Mmm, I like it!', '😋')],
  },
  {
    id: 'twinkle',
    kind: 'song',
    title: 'Twinkle, Twinkle',
    emoji: '⭐',
    lines: [
      line('Twinkle, twinkle, little star,', '⭐'),
      line('How I wonder what you are!', '🤔'),
      line('Up above the world so high,', '🌍'),
      line('Like a diamond in the sky.', '💎'),
    ],
  },
  {
    id: 'row-boat',
    kind: 'song',
    title: 'Row Your Boat',
    emoji: '🚣',
    lines: [
      line('Row, row, row your boat,', '🚣'),
      line('Gently down the stream.', '🌊'),
      line('Merrily, merrily, merrily, merrily,', '😄'),
      line('Life is but a dream.', '💭'),
    ],
  },
  {
    id: 'head-shoulders',
    kind: 'song',
    title: 'Head, Shoulders, Knees and Toes',
    emoji: '🦶',
    lines: [
      line('Head, shoulders, knees and toes, knees and toes.', '🧍'),
      line('Head, shoulders, knees and toes, knees and toes.', '🧍'),
      line('Eyes and ears and mouth and nose.', '👁️'),
      line('Head, shoulders, knees and toes, knees and toes.', '🦶'),
    ],
  },
  {
    id: 'hickory',
    kind: 'song',
    title: 'Hickory Dickory Dock',
    emoji: '🐭',
    lines: [
      line('Hickory dickory dock,', '🕰️'),
      line('The mouse ran up the clock.', '🐭'),
      line('The clock struck one,', '1️⃣'),
      line('The mouse ran down,', '⬇️'),
      line('Hickory dickory dock.', '🕰️'),
    ],
  },
];

export function findStory(id: string): EnglishStory {
  return ENGLISH_STORIES.find((s) => s.id === id) ?? ENGLISH_STORIES[0];
}

/** Prima storia o canzoncina non ancora letta (o la prima, se le ha lette tutte). */
export function suggestedStory(read: readonly string[]): EnglishStory {
  return ENGLISH_STORIES.find((s) => !read.includes(s.id)) ?? ENGLISH_STORIES[0];
}

export interface StoryWord {
  /** Come si scrive, con la punteggiatura ("star,"). */
  text: string;
  /** Come si pronuncia, senza punteggiatura ("star"). */
  spoken: string;
}

/** Le parole di una frase, ciascuna con la parte da leggere ad alta voce. */
export function storyWords(text: string): StoryWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ text: w, spoken: w.replace(/[^A-Za-z'-]/g, '') || w }));
}

/** Durata stimata (ms) con cui una parola viene pronunciata a bassa velocità: serve a evidenziarla in tempo. */
export function wordDurationMs(word: string): number {
  return 330 + 75 * word.length;
}
