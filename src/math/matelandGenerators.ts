import type { MatchGroup, Question } from './types';
import { choice, numericOptions, randomInt, shuffle } from './random';
import { groupsTotal, sequenceMissing, tenFrameMissing } from './gameGenerators';

type Gen = (id: string) => Question;

const THINGS = ['🍎', '⭐', '🍓', '🐟', '🌸', '🍄', '🍪', '🦋', '🚀', '🌈'];

// ---------------------------------------------------------------------------
// Livello 46: somme passando dal 10
// ---------------------------------------------------------------------------

function makeTenParts() {
  const a = randomInt(6, 9);
  const gap = 10 - a;
  const b = randomInt(gap + 1, 9);
  return { a, b, gap, rest: b - gap, sum: a + b };
}

const makeTenExplanation = (a: number, b: number, gap: number, rest: number, sum: number) =>
  `${a} + ${b}: prendo ${gap} dal ${b} per arrivare a 10, ne restano ${rest}. Quindi 10 + ${rest} = ${sum}!`;

export const makeTenGap: Gen = (id) => {
  const { a, b, gap, rest, sum } = makeTenParts();
  return {
    id,
    type: 'make_ten',
    title: 'Somme passando dal 10',
    instruction: `Devi fare ${a} + ${b}. Quanti ne prendi dal ${b} per arrivare a 10?`,
    speechText: `Devi fare ${a} più ${b}. Quanti ne prendi dal ${b} per arrivare a dieci?`,
    visual: { kind: 'make_ten', a, b, tool: choice(['frame', 'line'] as const), hide: 'gap' },
    options: numericOptions(gap, [-1, 1, 2, -2], 1, 9),
    correctAnswer: gap,
    explanation: makeTenExplanation(a, b, gap, rest, sum),
    hint: `Quanti puntini mancano a ${a} per riempire il telaio fino a 10?`,
  };
};

export const makeTenRest: Gen = (id) => {
  const { a, b, gap, rest, sum } = makeTenParts();
  return {
    id,
    type: 'make_ten',
    title: 'Somme passando dal 10',
    instruction: `${a} + ${b}: hai preso ${gap} dal ${b} per fare 10. Quanti ne restano?`,
    speechText: `${a} più ${b}. Hai preso ${gap} dal ${b} per fare dieci. Quanti ne restano?`,
    visual: { kind: 'make_ten', a, b, tool: choice(['frame', 'line'] as const), hide: 'rest' },
    options: numericOptions(rest, [-1, 1, 2, -2], 1, 9),
    correctAnswer: rest,
    explanation: makeTenExplanation(a, b, gap, rest, sum),
    hint: `Togli ${gap} da ${b}: quanti ne avanzano?`,
  };
};

export const makeTenTotal: Gen = (id) => {
  const { a, b, gap, rest, sum } = makeTenParts();
  return {
    id,
    type: 'make_ten',
    title: 'Somme passando dal 10',
    instruction: `${a} + ${b} = ?  Arriva a 10 e poi aggiungi quello che resta!`,
    speechText: `Quanto fa ${a} più ${b}? Arriva a dieci e poi aggiungi quello che resta.`,
    visual: { kind: 'make_ten', a, b, tool: choice(['frame', 'line'] as const), hide: 'total' },
    options: numericOptions(sum, [-1, 1, -2, 2], 11, 18),
    correctAnswer: sum,
    explanation: makeTenExplanation(a, b, gap, rest, sum),
    hint: `Prima fai 10 con ${gap}, poi aggiungi ${rest}: 10 + ${rest}.`,
  };
};

// ---------------------------------------------------------------------------
// Livello 47: conta e scrivi
// ---------------------------------------------------------------------------

export const matchQuantity = (max = 6): Gen => (id) => {
  const values = shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, 3);
  const emojis = shuffle(THINGS).slice(0, 3);
  const groups: MatchGroup[] = values.map((value, i) => ({ value, emoji: emojis[i] }));
  const sorted = [...values].sort((x, y) => x - y);
  return {
    id,
    type: 'match_quantity',
    title: 'Conta e scrivi',
    instruction: 'Tocca un numero e poi il gruppo che ha tanti oggetti quanti dice il numero!',
    speechText: 'Tocca un numero e poi il gruppo che ha tanti oggetti quanti dice il numero.',
    interaction: 'match_pairs',
    matchNumbers: sorted,
    matchGroups: shuffle(groups),
    options: [],
    correctAnswer: 'ok',
    explanation: `Collegamenti perfetti: ${sorted.join(', ')}!`,
    hint: 'Conta con calma gli oggetti di un gruppo, poi cerca il numero uguale.',
  };
};

export const countAndPick: Gen = (id) => {
  const n = randomInt(3, 10);
  const emoji = choice(THINGS);
  return {
    id,
    type: 'count_objects',
    title: 'Conta e scrivi',
    instruction: 'Conta gli oggetti: qual è il numero giusto?',
    speechText: 'Conta gli oggetti. Qual è il numero giusto?',
    itemsA: Array.from({ length: n }, (_, k) => ({ id: `it_${k}`, emoji })),
    options: numericOptions(n, [-1, 1, -2, 2], 1, 10),
    correctAnswer: n,
    explanation: `Ci sono ${n} ${emoji}: il numero giusto è ${n}!`,
    hint: 'Tocca gli oggetti uno alla volta per non perderti.',
  };
};

export const numberToGroup: Gen = (id) => {
  const n = randomInt(2, 6);
  const emoji = choice(THINGS);
  const counts = [...new Set([n, n - 1, n + 1, n - 2, n + 2])].filter((c) => c >= 1 && c <= 7).slice(0, 4);
  if (!counts.includes(n)) counts[0] = n;
  return {
    id,
    type: 'match_quantity',
    title: 'Conta e scrivi',
    instruction: `Il numero è ${n}. Quale gruppo ha ${n} oggetti?`,
    speechText: `Il numero è ${n}. Quale gruppo ha ${n} oggetti?`,
    numberA: n,
    options: shuffle(counts).map((c) => emoji.repeat(c)),
    correctAnswer: emoji.repeat(n),
    explanation: `Il numero ${n} va con il gruppo di ${n} ${emoji}!`,
    hint: 'Conta gli oggetti di ogni gruppo e scegli quello giusto.',
  };
};

// ---------------------------------------------------------------------------
// Livello 48: metti in ordine
// ---------------------------------------------------------------------------

function distinctNumbers(count: number, max: number): number[] {
  const set = new Set<number>();
  while (set.size < count) set.add(randomInt(0, max));
  return [...set];
}

export const orderBoard = (count = 4, ascending = true, max = 10): Gen => (id) => {
  const nums = distinctNumbers(count, max);
  const sorted = [...nums].sort((a, b) => (ascending ? a - b : b - a));
  return {
    id,
    type: 'tap_order',
    title: ascending ? 'Dal più piccolo al più grande' : 'Dal più grande al più piccolo',
    instruction: ascending
      ? 'Metti in ordine: tocca prima il numero PIÙ PICCOLO!'
      : 'Metti in ordine: tocca prima il numero PIÙ GRANDE!',
    speechText: ascending
      ? 'Metti in ordine i numeri partendo dal più piccolo.'
      : 'Metti in ordine i numeri partendo dal più grande.',
    interaction: 'tap_order',
    orderItems: shuffle(nums),
    orderDescending: !ascending,
    options: [],
    correctAnswer: 'ok',
    explanation: `Ordine perfetto: ${sorted.join(', ')}!`,
    hint: ascending ? 'Cerca prima il numero più piccolo di tutti.' : 'Cerca prima il numero più grande di tutti.',
  };
};

export const extremeNumber: Gen = (id) => {
  const nums = distinctNumbers(3, 20);
  const biggest = Math.random() < 0.5;
  const answer = biggest ? Math.max(...nums) : Math.min(...nums);
  return {
    id,
    type: 'order_numbers',
    title: 'Metti in ordine',
    instruction: `Quale di questi numeri è il PIÙ ${biggest ? 'GRANDE' : 'PICCOLO'}?`,
    speechText: `Quale di questi numeri è il più ${biggest ? 'grande' : 'piccolo'}?`,
    options: shuffle(nums),
    correctAnswer: answer,
    explanation: `In ordine: ${[...nums].sort((a, b) => a - b).join(', ')}. Il più ${biggest ? 'grande' : 'piccolo'} è ${answer}!`,
    hint: 'Confronta i numeri a due a due.',
  };
};

// ---------------------------------------------------------------------------
// Livello 49: puzzle e sfide di Mateland
// ---------------------------------------------------------------------------

const SECRET_WORDS = ['LUNA', 'SOLE', 'MARE', 'ROSA', 'NAVE', 'FATA', 'LUCE', 'PACE', 'STAR', 'ALBA'];

export const secretMessage: Gen = (id) => {
  const word = choice(SECRET_WORDS);
  const ascending = Math.random() < 0.7;
  const nums = distinctNumbers(word.length, 20);
  const sorted = [...nums].sort((a, b) => (ascending ? a - b : b - a));
  const orderLetters: Record<number, string> = {};
  sorted.forEach((n, i) => {
    orderLetters[n] = word[i];
  });
  return {
    id,
    type: 'mateland_puzzle',
    title: 'Messaggio segreto di Mateland',
    instruction: `Ordina i numeri dal più ${ascending ? 'piccolo' : 'grande'} e scopri la parola nascosta!`,
    speechText: `Tocca i numeri partendo dal più ${ascending ? 'piccolo' : 'grande'}: sotto ogni numero c'è una lettera segreta.`,
    interaction: 'tap_order',
    orderItems: shuffle(nums),
    orderDescending: !ascending,
    orderLetters,
    options: [],
    correctAnswer: 'ok',
    explanation: `Messaggio decifrato: ${word}! 🧩 Tessera sbloccata!`,
    hint: 'Cerca prima il numero giusto da cui partire: ogni numero nasconde una lettera.',
  };
};

export const matelandGroups: Gen = (id) => {
  const perGroup = choice([2, 5, 10]);
  const groups = randomInt(2, perGroup === 10 ? 3 : 4);
  const emoji = choice(THINGS);
  const total = groups * perGroup;
  return {
    id,
    type: 'mateland_puzzle',
    title: 'Tessera del puzzle',
    instruction: `Per sbloccare la tessera servono tutti gli ${emoji}: ${groups} gruppi da ${perGroup}. Quanti sono in tutto?`,
    speechText: `Per sbloccare la tessera servono tutti gli oggetti: ${groups} gruppi da ${perGroup}. Quanti sono in tutto?`,
    visual: { kind: 'groups', groups, perGroup, emoji },
    options: numericOptions(total, [-perGroup, perGroup, -1, 1], 1),
    correctAnswer: total,
    explanation: `${Array(groups).fill(perGroup).join(' + ')} = ${total}. 🧩 Tessera sbloccata!`,
    hint: `Conta a salti di ${perGroup}: ${Array.from({ length: groups }, (_, i) => perGroup * (i + 1)).join(', ')}...`,
  };
};

// ---------------------------------------------------------------------------
// Pool dei livelli
// ---------------------------------------------------------------------------

const MATELAND: Record<number, Gen[]> = {
  46: [makeTenGap, makeTenRest, makeTenTotal, makeTenTotal],
  47: [matchQuantity(6), matchQuantity(10), countAndPick, numberToGroup],
  48: [orderBoard(4, true, 10), orderBoard(5, true, 20), orderBoard(5, false, 20), extremeNumber, sequenceMissing([1], 20)],
  49: [secretMessage, secretMessage, matelandGroups, tenFrameMissing, groupsTotal([2, 5])],
};

export function generateMatelandQuestion(levelId: number, id: string): Question {
  if (levelId === 50) return choice(Object.values(MATELAND).flat())(id);
  return choice(MATELAND[levelId] ?? MATELAND[46])(id);
}
