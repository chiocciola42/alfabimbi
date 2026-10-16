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
  shuffleLetters,
  spellingOrder,
  suggestedFamily,
} from '../../src/data/englishFamilies';
import {
  SIGHT_SET_COUNT,
  SIGHT_WORDS,
  pickSightChoices,
  sightRoundOrder,
  sightWordsOfSet,
  suggestedSightSet,
} from '../../src/data/englishSight';
import {
  ENGLISH_STORIES,
  findStory,
  storyWords,
  suggestedStory,
  wordDurationMs,
} from '../../src/data/englishStories';

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

describe('English sight words', () => {
  it('are 24 unique words in 6 sets of 4, each set with four different first letters', () => {
    expect(SIGHT_WORDS).toHaveLength(24);
    expect(new Set(SIGHT_WORDS.map((w) => w.word)).size).toBe(24);
    expect(SIGHT_SET_COUNT).toBe(6);
    for (let set = 1; set <= SIGHT_SET_COUNT; set++) {
      const words = sightWordsOfSet(set);
      expect(words, `set ${set}`).toHaveLength(4);
      expect(new Set(words.map((w) => w.word[0].toLowerCase())).size, `set ${set}`).toBe(4);
    }
  });

  it('start from the first set with words left and put the unknown words first', () => {
    expect(suggestedSightSet([])).toBe(1);
    expect(suggestedSightSet(sightWordsOfSet(1).map((w) => w.word))).toBe(2);
    expect(suggestedSightSet(SIGHT_WORDS.map((w) => w.word))).toBe(1);
    const order = sightRoundOrder(1, ['the'], 4);
    expect(order).toHaveLength(4);
    expect(order[3].word).toBe('the');
  });

  it('offer the right card plus two others of the same set, shuffled', () => {
    for (const target of SIGHT_WORDS) {
      const choices = pickSightChoices(target, 3, seeded(target.word.length + target.set));
      expect(choices).toHaveLength(3);
      expect(choices.filter((c) => c.word === target.word)).toHaveLength(1);
      expect(new Set(choices.map((c) => c.word)).size).toBe(3);
      choices.forEach((c) => expect(c.set).toBe(target.set));
    }
  });
});

describe('English spelling', () => {
  it('uses the family words, unspelled ones first', () => {
    const order = spellingOrder(['cat', 'dog'], 9);
    expect(order).toHaveLength(FAMILY_WORDS.length);
    expect(order.slice(-2).map((w) => w.word).sort()).toEqual(['cat', 'dog']);
  });

  it('shuffles the letters of a word without ever returning the right order', () => {
    for (const w of FAMILY_WORDS) {
      const letters = shuffleLetters(w.word, seeded(w.word.charCodeAt(0)));
      expect(letters.slice().sort().join('')).toBe(w.word.split('').sort().join(''));
      expect(letters.join(''), w.word).not.toBe(w.word);
    }
    expect(shuffleLetters('a')).toEqual(['a']);
  });
});

describe('English stories and songs', () => {
  it('have unique ids, three to five lines and a picture for every line', () => {
    expect(new Set(ENGLISH_STORIES.map((s) => s.id)).size).toBe(ENGLISH_STORIES.length);
    for (const s of ENGLISH_STORIES) {
      expect(s.lines.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.lines.length, s.id).toBeLessThanOrEqual(5);
      s.lines.forEach((l) => {
        expect(l.text.length).toBeGreaterThan(0);
        expect(l.emoji.length).toBeGreaterThan(0);
      });
    }
    expect(ENGLISH_STORIES.some((s) => s.kind === 'story')).toBe(true);
    expect(ENGLISH_STORIES.some((s) => s.kind === 'song')).toBe(true);
  });

  it('splits lines into words, keeping the punctuation to show and dropping it to speak', () => {
    expect(storyWords('Twinkle, twinkle, little star,')).toEqual([
      { text: 'Twinkle,', spoken: 'Twinkle' },
      { text: 'twinkle,', spoken: 'twinkle' },
      { text: 'little', spoken: 'little' },
      { text: 'star,', spoken: 'star' },
    ]);
    expect(storyWords('I like the cat!').map((w) => w.spoken)).toEqual(['I', 'like', 'the', 'cat']);
    expect(storyWords('  ')).toEqual([]);
  });

  it('estimate a longer time for longer words', () => {
    expect(wordDurationMs('a')).toBeLessThan(wordDurationMs('shoulders'));
  });

  it('start from the first story not yet read, then from the first when all are read', () => {
    expect(suggestedStory([]).id).toBe(ENGLISH_STORIES[0].id);
    expect(suggestedStory([ENGLISH_STORIES[0].id]).id).toBe(ENGLISH_STORIES[1].id);
    expect(suggestedStory(ENGLISH_STORIES.map((s) => s.id)).id).toBe(ENGLISH_STORIES[0].id);
    expect(findStory('nope').id).toBe(ENGLISH_STORIES[0].id);
  });

  it('use mostly words the child meets elsewhere in the English section (stories only)', () => {
    const known = new Set([
      ...SIGHT_WORDS.map((w) => w.word.toLowerCase()),
      ...FAMILY_WORDS.map((w) => w.word),
      ...ENGLISH_WORDS.flatMap((w) => w.word.split(' ')),
    ]);
    for (const s of ENGLISH_STORIES.filter((x) => x.kind === 'story')) {
      const words = s.lines.flatMap((l) => storyWords(l.text).map((w) => w.spoken.toLowerCase()));
      const share = words.filter((w) => known.has(w)).length / words.length;
      expect(share, s.id).toBeGreaterThan(0.6);
    }
  });
});
