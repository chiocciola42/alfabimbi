import { describe, expect, it } from 'vitest';
import {
  ENGLISH_WORDS,
  ENGLISH_WORLDS,
  ENGLISH_WORLD_SIZE,
  englishRoundOrder,
  pickEnglishChoices,
  suggestedEnglishWorld,
} from '../../src/data/englishWords';
import {
  ENGLISH_ALPHABET,
  englishLetterOrder,
  findEnglishLetter,
  letterPhrase,
  pickLetterChoices,
} from '../../src/data/englishAlphabet';
import {
  FAMILY_WORDS,
  WORD_FAMILIES,
  familyRoundOrder,
  pickOnsetChoices,
  suggestedFamily,
} from '../../src/data/englishFamilies';

/** A deterministic "random" so the shuffles are repeatable. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('English vocabulary', () => {
  it('has eight worlds of eight words, all lowercase and unique', () => {
    expect(ENGLISH_WORLDS).toHaveLength(8);
    ENGLISH_WORLDS.forEach((w) => expect(w.words, w.id).toHaveLength(ENGLISH_WORLD_SIZE));
    expect(new Set(ENGLISH_WORDS.map((w) => w.word)).size).toBe(ENGLISH_WORDS.length);
    ENGLISH_WORDS.forEach((w) => expect(w.word, w.word).toMatch(/^[a-z]+( [a-z]+)?$/));
  });

  it('gives every word its own picture, so a picture identifies one word', () => {
    expect(new Set(ENGLISH_WORDS.map((w) => w.emoji)).size).toBe(ENGLISH_WORDS.length);
  });

  it('puts the unlearned words first in a round, without losing any', () => {
    const colors = ENGLISH_WORLDS[0];
    const order = englishRoundOrder(colors.id, ['red', 'blue'], 3);
    expect(order).toHaveLength(8);
    expect(order.slice(-2).map((w) => w.word).sort()).toEqual(['blue', 'red']);
    expect(order.slice(0, 6).some((w) => w.word === 'red' || w.word === 'blue')).toBe(false);
  });

  it('starts from the first world with something left to learn', () => {
    expect(suggestedEnglishWorld([]).id).toBe('colors');
    const allColors = ENGLISH_WORLDS[0].words.map((w) => w.word);
    expect(suggestedEnglishWorld(allColors).id).toBe('numbers');
    expect(suggestedEnglishWorld(ENGLISH_WORDS.map((w) => w.word)).id).toBe('colors');
  });

  it('offers the right picture plus others of the same world, shuffled', () => {
    for (const target of ENGLISH_WORDS) {
      const choices = pickEnglishChoices(target, 3, seeded(target.word.length + 7));
      expect(choices).toHaveLength(3);
      expect(choices.filter((c) => c.word === target.word)).toHaveLength(1);
      expect(new Set(choices.map((c) => c.emoji)).size).toBe(3);
      choices.forEach((c) => expect(c.world).toBe(target.world));
    }
  });
});

describe('English alphabet', () => {
  it('has the 26 letters in order, with matching lower case and a word that starts with it', () => {
    expect(ENGLISH_ALPHABET.map((l) => l.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    for (const l of ENGLISH_ALPHABET) {
      expect(l.lowercase).toBe(l.letter.toLowerCase());
      expect(l.say.length).toBeGreaterThan(0);
      expect(l.emoji.length).toBeGreaterThan(0);
      if (l.letter !== 'X') expect(l.word.toLowerCase().startsWith(l.lowercase), `${l.letter} -> ${l.word}`).toBe(true);
    }
    expect(ENGLISH_ALPHABET.filter((l) => l.vowel).map((l) => l.letter).join('')).toBe('AEIOU');
  });

  it('explains the one special case (X is heard at the end)', () => {
    expect(findEnglishLetter('x')?.note).toMatch(/fine/);
    expect(ENGLISH_ALPHABET.filter((l) => l.note)).toHaveLength(1);
  });

  it('has unique pictures and builds the "A is for apple" phrase', () => {
    expect(new Set(ENGLISH_ALPHABET.map((l) => l.emoji)).size).toBe(26);
    expect(letterPhrase(findEnglishLetter('a')!)).toBe('A is for apple');
  });

  it('orders the quiz with unlearned letters first and offers distinct letters', () => {
    const order = englishLetterOrder(['A', 'B'], 5);
    expect(order).toHaveLength(26);
    expect(order.slice(-2).map((l) => l.letter).sort()).toEqual(['A', 'B']);
    const target = findEnglishLetter('Q')!;
    const choices = pickLetterChoices(target, 3, seeded(11));
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((c) => c.letter)).size).toBe(3);
    expect(choices.map((c) => c.letter)).toContain('Q');
  });
});

describe('English word families', () => {
  it('build every word from its first letter and its ending, with one picture each', () => {
    for (const w of FAMILY_WORDS) {
      expect(w.word, w.word).toBe(`${w.onset}${w.family}`);
      expect(w.onset, w.word).toMatch(/^[a-z]$/);
    }
    expect(new Set(FAMILY_WORDS.map((w) => w.word)).size).toBe(FAMILY_WORDS.length);
    expect(new Set(FAMILY_WORDS.map((w) => w.emoji)).size).toBe(FAMILY_WORDS.length);
  });

  it('are short, regular words: three letters, ending with a vowel plus a consonant', () => {
    for (const f of WORD_FAMILIES) {
      expect(f.id, f.id).toMatch(/^[aeiou][a-z]$/);
      expect(f.words.length, f.id).toBeGreaterThanOrEqual(3);
      f.words.forEach((w) => expect(w.word, w.word).toHaveLength(3));
    }
  });

  it('never use as a wrong letter one that makes a word of the same family', () => {
    for (const f of WORD_FAMILIES) {
      expect(f.decoys.length, f.id).toBeGreaterThanOrEqual(2);
      const good = new Set(f.words.map((w) => w.onset));
      f.decoys.forEach((d) => expect(good.has(d), `${d}${f.id}`).toBe(false));
      // and no wrong letter builds one of the words used anywhere else in the game
      f.decoys.forEach((d) => expect(FAMILY_WORDS.some((w) => w.word === `${d}${f.id}`), `${d}${f.id}`).toBe(false));
    }
  });

  it('offer the right letter plus wrong ones, shuffled and distinct', () => {
    for (const target of FAMILY_WORDS) {
      const choices = pickOnsetChoices(target, 3, seeded(target.word.charCodeAt(0)));
      expect(choices).toHaveLength(3);
      expect(choices.filter((c) => c === target.onset)).toHaveLength(1);
      expect(new Set(choices).size).toBe(3);
    }
  });

  it('start from the first family with words left, and put the unread words first', () => {
    expect(suggestedFamily([]).id).toBe('at');
    expect(suggestedFamily(['cat', 'hat', 'bat', 'rat']).id).toBe('an');
    const order = familyRoundOrder('at', ['cat'], 2);
    expect(order).toHaveLength(4);
    expect(order[3].word).toBe('cat');
  });
});
