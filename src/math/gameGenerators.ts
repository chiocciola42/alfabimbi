import type { BarItem, GridItem, Question, ShapeName } from './types';
import { choice, numericOptions, randomInt, shuffle } from './random';

type Gen = (id: string) => Question;

const FRUIT = ['🍎', '🍓', '🍊', '🍪', '⭐', '🌸', '🐟', '🍄'];
const SYMBOLS = ['🔴', '🔵', '🟡', '🟢', '⭐', '🔺', '🌙', '🍎'];

const SHAPE_LABEL: Record<ShapeName, string> = {
  cerchio: 'Cerchio',
  quadrato: 'Quadrato',
  triangolo: 'Triangolo',
  rettangolo: 'Rettangolo',
  pentagono: 'Pentagono',
  esagono: 'Esagono',
};

const SHAPE_SIDES: Record<ShapeName, number> = {
  cerchio: 0,
  triangolo: 3,
  quadrato: 4,
  rettangolo: 4,
  pentagono: 5,
  esagono: 6,
};

const SHAPE_COLORS = ['#f43f5e', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const BASIC_SHAPES: ShapeName[] = ['cerchio', 'quadrato', 'triangolo', 'rettangolo'];
const ALL_SHAPES: ShapeName[] = [...BASIC_SHAPES, 'pentagono', 'esagono'];

// ---------------------------------------------------------------------------
// Telaio del 10
// ---------------------------------------------------------------------------

export const tenFrameFlash = (min = 1, max = 10): Gen => (id) => {
  const n = randomInt(min, max);
  return {
    id,
    type: 'ten_frame',
    title: 'Il Lampo dei Puntini',
    instruction: 'Guarda bene il telaio: quanti puntini ci sono? Puoi rivederli quando vuoi!',
    speechText: 'Quanti puntini vedi nel telaio?',
    visual: { kind: 'ten_frame', filled: n, flash: true },
    options: numericOptions(n, [-1, 1, -2, 2], 0, 10),
    correctAnswer: n,
    explanation: `Ci sono ${n} puntini: ${n <= 5 ? `${n} nella fila in alto` : `5 nella fila in alto e ${n - 5} in quella sotto`}!`,
    hint: 'Le file sono da 5: una fila piena vale 5. Parti da lì!',
  };
};

export const tenFrameMissing: Gen = (id) => {
  const a = randomInt(1, 9);
  const missing = 10 - a;
  return {
    id,
    type: 'ten_frame',
    title: 'Quanti ne mancano per arrivare a 10?',
    instruction: `Nel telaio ci sono ${a} puntini. Quanti ne servono per riempirlo fino a 10?`,
    speechText: `Nel telaio ci sono ${a} puntini. Quanti ne mancano per arrivare a dieci?`,
    visual: { kind: 'ten_frame', filled: a },
    options: numericOptions(missing, [-1, 1, -2, 2], 0, 10),
    correctAnswer: missing,
    explanation: `Le caselle vuote sono ${missing}: ${a} + ${missing} = 10!`,
    hint: 'Conta le caselle vuote del telaio.',
  };
};

export const buildNumber = (min = 1, max = 10): Gen => (id) => {
  const n = randomInt(min, max);
  return {
    id,
    type: 'build_number',
    title: 'Costruisci il numero!',
    instruction: `Tocca le caselle per mettere ${n} puntini nel telaio, poi premi "Controlla".`,
    speechText: `Metti ${n} puntini nel telaio e premi controlla.`,
    interaction: 'ten_frame_build',
    buildTarget: n,
    options: [],
    correctAnswer: n,
    explanation: `Perfetto! ${n} puntini: ${n <= 5 ? 'una fila non ancora piena' : `una fila piena (5) e ${n - 5} nella seconda`}.`,
    hint: 'Riempi prima la fila in alto, poi quella in basso.',
  };
};

// ---------------------------------------------------------------------------
// Bilancia
// ---------------------------------------------------------------------------

export const balanceMissing = (minTotal = 4, maxTotal = 10): Gen => (id) => {
  const total = randomInt(minTotal, maxTotal);
  const shown = randomInt(1, total - 1);
  const missing = total - shown;
  const e = choice(FRUIT);
  return {
    id,
    type: 'balance',
    title: 'La Bilancia Magica',
    instruction: `A sinistra ci sono ${total} ${e}. A destra ce ne sono ${shown}. Quante ne servono per far stare la bilancia in equilibrio?`,
    speechText: `A sinistra ci sono ${total} oggetti, a destra ${shown}. Quanti ne servono a destra per pareggiare?`,
    visual: {
      kind: 'balance',
      left: Array(total).fill(e),
      right: Array(shown).fill(e),
      rightMissing: true,
      tilt: 'left',
    },
    options: numericOptions(missing, [-1, 1, -2, 2], 1),
    correctAnswer: missing,
    explanation: `${shown} + ${missing} = ${total}: ora i due piatti pesano uguale!`,
    hint: `Quanto manca da ${shown} per arrivare a ${total}?`,
  };
};

export const balanceCompare: Gen = (id) => {
  const a = randomInt(2, 9);
  let b = randomInt(2, 9);
  while (b === a) b = randomInt(2, 9);
  const e = choice(FRUIT);
  const answer = a > b ? 'Sinistra' : 'Destra';
  return {
    id,
    type: 'balance',
    title: 'Quale piatto pesa di più?',
    instruction: `Ogni ${e} pesa uguale. Quale piatto sarà il più pesante?`,
    speechText: 'Ogni oggetto pesa uguale. Quale piatto è il più pesante?',
    visual: { kind: 'balance', left: Array(a).fill(e), right: Array(b).fill(e), tilt: 'level' },
    options: ['Sinistra', 'Destra'],
    correctAnswer: answer,
    explanation: `${Math.max(a, b)} è più di ${Math.min(a, b)}: il piatto ${answer.toLowerCase()} scende!`,
    hint: `Conta gli oggetti dei due piatti: ${a} e ${b}.`,
  };
};

// ---------------------------------------------------------------------------
// Ritmi, serie e salti
// ---------------------------------------------------------------------------

const PATTERN_SHAPES: string[][] = [
  [0, 1],
  [0, 0, 1],
  [0, 1, 1],
  [0, 1, 2],
  [0, 0, 1, 1],
].map((p) => p.map(String));

export const patternMissing = (allowHard = true): Gen => (id) => {
  const pool = allowHard ? PATTERN_SHAPES : PATTERN_SHAPES.slice(0, 2);
  const unit = choice(pool);
  const colors = shuffle(SYMBOLS).slice(0, 3);
  const length = unit.length * 2 + randomInt(1, 2);
  const items = Array.from({ length }, (_, i) => colors[Number(unit[i % unit.length])]);
  const missingIndex = randomInt(Math.min(length - 1, unit.length + 1), length - 1);
  const answer = items[missingIndex];
  const used = [...new Set(items)];
  const distractors = SYMBOLS.filter((s) => !used.includes(s));
  const options = shuffle([...new Set([answer, ...used, ...distractors])].slice(0, 4));
  if (!options.includes(answer)) options[0] = answer;
  return {
    id,
    type: 'pattern',
    title: 'Continua la Serie Magica!',
    instruction: 'Quale simbolo va nella casella vuota?',
    speechText: 'Quale simbolo va nella casella vuota per continuare la serie?',
    visual: { kind: 'pattern', items, missingIndex },
    options,
    correctAnswer: answer,
    explanation: `La serie si ripete: ${unit.map((u) => colors[Number(u)]).join(' ')} ... Nella casella va ${answer}!`,
    hint: 'Trova il gruppetto di simboli che si ripete sempre uguale.',
  };
};

export const sequenceMissing = (steps: number[] = [1], maxValue = 30, allowDown = false): Gen => (id) => {
  const step = choice(steps);
  const down = allowDown && Math.random() < 0.4;
  const len = 6;
  const span = step * (len - 1);
  const start = down
    ? randomInt(Math.min(span, maxValue), maxValue)
    : randomInt(0, Math.max(0, Math.min(maxValue - span, 12)));
  const nums = Array.from({ length: len }, (_, i) => (down ? start - i * step : start + i * step));
  const hole = randomInt(1, len - 2);
  const answer = nums[hole];
  const shown = nums.map((n, i) => (i === hole ? null : n));
  return {
    id,
    type: 'sequence',
    title: down ? 'Il Conto alla Rovescia' : `Contiamo a passi di ${step}`,
    instruction: 'Quale numero manca nella serie?',
    speechText: 'Quale numero manca nella serie?',
    visual: { kind: 'sequence', numbers: shown },
    options: numericOptions(answer, [-step, step, -1, 1], 0, maxValue + step),
    correctAnswer: answer,
    explanation: `La serie ${down ? 'scende' : 'sale'} di ${step} in ${step}: ${nums.join(', ')}.`,
    hint: `Guarda di quanto cambiano i numeri accanto al buco: ${down ? 'meno' : 'più'} ${step} ogni volta.`,
  };
};

export const groupsTotal = (perGroupChoices: number[] = [2, 5]): Gen => (id) => {
  const perGroup = choice(perGroupChoices);
  const groups = randomInt(2, perGroup === 5 ? 4 : 5);
  const e = choice(FRUIT);
  const total = groups * perGroup;
  return {
    id,
    type: 'sequence',
    title: 'Gruppi uguali',
    instruction: `Ci sono ${groups} cestini con ${perGroup} ${e} ciascuno. Quanti ${e} ci sono in tutto?`,
    speechText: `Ci sono ${groups} cestini con ${perGroup} oggetti ciascuno. Quanti oggetti ci sono in tutto?`,
    visual: { kind: 'groups', groups, perGroup, emoji: e },
    options: numericOptions(total, [-perGroup, perGroup, -1, 1], 1),
    correctAnswer: total,
    explanation: `${Array(groups).fill(perGroup).join(' + ')} = ${total}. Hai contato a salti di ${perGroup}!`,
    hint: `Salta di ${perGroup} in ${perGroup}: ${Array.from({ length: groups }, (_, i) => perGroup * (i + 1)).join(', ')}...`,
  };
};

export const tapOrder = (ascending = true, maxValue = 20): Gen => (id) => {
  const set = new Set<number>();
  while (set.size < 4) set.add(randomInt(0, maxValue));
  const items = shuffle([...set]);
  const sorted = [...set].sort((a, b) => (ascending ? a - b : b - a));
  return {
    id,
    type: 'tap_order',
    title: ascending ? 'Dal più piccolo al più grande' : 'Dal più grande al più piccolo',
    instruction: ascending
      ? 'Tocca i numeri in ordine: parti dal PIÙ PICCOLO!'
      : 'Tocca i numeri in ordine: parti dal PIÙ GRANDE!',
    speechText: ascending
      ? 'Tocca i numeri partendo dal più piccolo.'
      : 'Tocca i numeri partendo dal più grande.',
    interaction: 'tap_order',
    orderItems: items,
    orderDescending: !ascending,
    options: [],
    correctAnswer: 'ok',
    explanation: `Ordine perfetto: ${sorted.join(', ')}!`,
    hint: ascending ? 'Cerca prima il numero più piccolo di tutti.' : 'Cerca prima il numero più grande di tutti.',
  };
};

// ---------------------------------------------------------------------------
// Forme e spazio
// ---------------------------------------------------------------------------

export const shapeName = (hard = false): Gen => (id) => {
  const pool = hard ? ALL_SHAPES : BASIC_SHAPES;
  const shape = choice(pool);
  const options = shuffle([shape, ...shuffle(pool.filter((s) => s !== shape)).slice(0, 3)]).map((s) => SHAPE_LABEL[s]);
  return {
    id,
    type: 'shape',
    title: 'Che forma è?',
    instruction: 'Come si chiama questa figura?',
    speechText: 'Come si chiama questa figura?',
    visual: { kind: 'shape', shape, color: choice(SHAPE_COLORS) },
    options,
    correctAnswer: SHAPE_LABEL[shape],
    explanation: `È un ${SHAPE_LABEL[shape].toLowerCase()}! ${shape === 'cerchio' ? 'Non ha lati né punte.' : `Ha ${SHAPE_SIDES[shape]} lati.`}`,
    hint: 'Conta i lati dritti e le punte, oppure guarda se è tutta rotonda.',
  };
};

export const shapeSides = (hard = false): Gen => (id) => {
  const shape = choice(hard ? ALL_SHAPES : BASIC_SHAPES);
  const sides = SHAPE_SIDES[shape];
  return {
    id,
    type: 'shape',
    title: 'Contiamo i lati',
    instruction: 'Quanti lati dritti ha questa figura?',
    speechText: 'Quanti lati dritti ha questa figura?',
    visual: { kind: 'shape', shape, color: choice(SHAPE_COLORS) },
    options: numericOptions(sides, [-1, 1, 2, -2], 0, 8),
    correctAnswer: sides,
    explanation: `Il ${SHAPE_LABEL[shape].toLowerCase()} ha ${sides} ${sides === 1 ? 'lato' : 'lati'}${shape === 'cerchio' ? ': è tutto curvo!' : '.'}`,
    hint: 'Passa il dito su ogni lato dritto e contalo.',
  };
};

export const shapeOddOne: Gen = (id) => {
  const [common, odd] = shuffle(ALL_SHAPES).slice(0, 2);
  const pos = randomInt(0, 3);
  const shapes: ShapeName[] = Array.from({ length: 4 }, (_, i) => (i === pos ? odd : common));
  const color = choice(SHAPE_COLORS);
  return {
    id,
    type: 'shape',
    title: "Trova l'intruso!",
    instruction: 'Una figura è diversa dalle altre. Qual è il suo numero?',
    speechText: "Una figura è diversa dalle altre. Qual è il suo numero?",
    visual: { kind: 'shape_row', shapes, colors: shapes.map(() => color) },
    options: ['1', '2', '3', '4'],
    correctAnswer: String(pos + 1),
    explanation: `L'intruso è il ${SHAPE_LABEL[odd].toLowerCase()} in posizione ${pos + 1}: le altre sono ${SHAPE_LABEL[common].toLowerCase()}!`,
    hint: 'Confronta le forme una a una: quale ha un numero di lati diverso?',
  };
};

export const shapeCount: Gen = (id) => {
  const kinds = shuffle(BASIC_SHAPES).slice(0, 3);
  const target = kinds[0];
  const total = randomInt(6, 8);
  const targetCount = randomInt(2, 4);
  const list: ShapeName[] = [
    ...Array<ShapeName>(targetCount).fill(target),
    ...Array.from({ length: total - targetCount }, () => choice(kinds.slice(1))),
  ];
  return {
    id,
    type: 'shape',
    title: 'Caccia alle forme',
    instruction: `Quanti ${SHAPE_LABEL[target].toLowerCase()} vedi?`,
    speechText: `Quanti ${SHAPE_LABEL[target].toLowerCase()} vedi?`,
    visual: { kind: 'shape_row', shapes: shuffle(list), colors: list.map((_, i) => SHAPE_COLORS[i % SHAPE_COLORS.length]) },
    options: numericOptions(targetCount, [-1, 1, 2, -2], 0, 8),
    correctAnswer: targetCount,
    explanation: `Ci sono ${targetCount} ${SHAPE_LABEL[target].toLowerCase()} su ${total} figure.`,
    hint: 'Segna con il dito solo le figure con la forma giusta e contale.',
  };
};

const NEIGHBOR_EMOJI = ['🐱', '🐶', '🌳', '🏠', '⭐', '🍎', '🐟', '🦋', '🌸', '🚗'];

export const gridPosition: Gen = (id) => {
  const subject = '🐰';
  const emojis = shuffle(NEIGHBOR_EMOJI).slice(0, 4);
  const dirs = [
    { name: 'sopra', row: 0, col: 1, phrase: 'SOPRA' },
    { name: 'sotto', row: 2, col: 1, phrase: 'SOTTO' },
    { name: 'sinistra', row: 1, col: 0, phrase: 'a SINISTRA' },
    { name: 'destra', row: 1, col: 2, phrase: 'a DESTRA' },
  ];
  const items: GridItem[] = [
    { row: 1, col: 1, emoji: subject },
    ...dirs.map((d, i) => ({ row: d.row, col: d.col, emoji: emojis[i] })),
  ];
  const askIndex = randomInt(0, 3);
  const ask = dirs[askIndex];
  return {
    id,
    type: 'grid_position',
    title: 'Dove si trova?',
    instruction: `Cosa c'è ${ask.phrase} del coniglietto ${subject}?`,
    speechText: `Cosa c'è ${ask.name === 'sopra' || ask.name === 'sotto' ? ask.name : `a ${ask.name}`} del coniglietto?`,
    visual: { kind: 'grid', rows: 3, cols: 3, items, markCell: { row: 1, col: 1 } },
    options: emojis,
    correctAnswer: emojis[askIndex],
    explanation: `${emojis[askIndex]} sta ${ask.phrase.toLowerCase()} del coniglietto!`,
    hint: ask.name === 'destra' ? 'La destra è la mano con cui di solito scrivi.' : 'Guarda la casella accanto al coniglietto nella direzione giusta.',
  };
};

// ---------------------------------------------------------------------------
// Misure, tempo e denaro
// ---------------------------------------------------------------------------

const BAR_SET: Omit<BarItem, 'length'>[] = [
  { label: 'Rosso', emoji: '🟥' },
  { label: 'Blu', emoji: '🟦' },
  { label: 'Verde', emoji: '🟩' },
  { label: 'Giallo', emoji: '🟨' },
];

export const barsCompare: Gen = (id) => {
  const count = choice([3, 4]);
  const lengths = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, count);
  const bars: BarItem[] = BAR_SET.slice(0, count).map((b, i) => ({ ...b, length: lengths[i] }));
  const longest = Math.random() < 0.5;
  const target = [...bars].sort((a, b) => (longest ? b.length - a.length : a.length - b.length))[0];
  return {
    id,
    type: 'measure',
    title: 'Le Strisce di Colore',
    instruction: `Qual è la striscia più ${longest ? 'LUNGA' : 'CORTA'}?`,
    speechText: `Qual è la striscia più ${longest ? 'lunga' : 'corta'}?`,
    visual: { kind: 'bars', bars },
    options: bars.map((b) => b.label),
    correctAnswer: target.label,
    explanation: `La striscia ${target.label.toLowerCase()} è la più ${longest ? 'lunga' : 'corta'}: ${target.length} quadretti!`,
    hint: 'Confronta dove finisce ogni striscia partendo dalla stessa linea.',
  };
};

function clockLabel(hour: number, minute: 0 | 30): string {
  const base = hour === 1 ? "l'una" : `le ${hour}`;
  return minute === 0 ? base : `${base} e mezza`;
}

export const clockRead: Gen = (id) => {
  const hour = randomInt(1, 12);
  const minute: 0 | 30 = Math.random() < 0.5 ? 0 : 30;
  const answer = clockLabel(hour, minute);
  const otherHour = (hour % 12) + 1;
  const prevHour = ((hour + 10) % 12) + 1;
  const candidates = [
    clockLabel(hour, minute === 0 ? 30 : 0),
    clockLabel(otherHour, minute),
    clockLabel(prevHour, minute),
    clockLabel(otherHour, minute === 0 ? 30 : 0),
  ];
  const options = shuffle([...new Set([answer, ...candidates])].slice(0, 4));
  if (!options.includes(answer)) options[0] = answer;
  return {
    id,
    type: 'clock',
    title: "Che ore sono?",
    instruction: 'Leggi l’orologio: che ore sono?',
    speechText: 'Leggi l’orologio. Che ore sono?',
    visual: { kind: 'clock', hour, minute },
    options,
    correctAnswer: answer,
    explanation: `La lancetta corta indica ${hour}, quella lunga sul ${minute === 0 ? '12' : '6'}: sono ${answer}.`,
    hint: 'La lancetta corta dice l’ora. Se quella lunga guarda in basso è passata mezz’ora.',
  };
};

export const coinsTotal: Gen = (id) => {
  const n1 = randomInt(0, 3);
  const n2 = randomInt(0, 2);
  const n5 = randomInt(0, 1);
  const coins = [...Array(n5).fill(5), ...Array(n2).fill(2), ...Array(n1).fill(1)];
  if (coins.length === 0) coins.push(2, 1);
  const total = coins.reduce((s, c) => s + c, 0);
  return {
    id,
    type: 'money',
    title: 'Il Portamonete',
    instruction: 'Quanti euro ci sono in tutto nel portamonete?',
    speechText: 'Quanti euro ci sono in tutto?',
    visual: { kind: 'coins', coins },
    options: numericOptions(total, [-1, 1, 2, -2], 1),
    correctAnswer: total,
    explanation: `${coins.join(' + ')} = ${total} euro!`,
    hint: 'Parti dalla moneta più grande e aggiungi le altre una alla volta.',
  };
};

export const evenOddPairs: Gen = (id) => {
  const n = randomInt(1, 12);
  const isEven = n % 2 === 0;
  const e = choice(FRUIT);
  return {
    id,
    type: 'even_odd',
    title: 'Pari o Dispari?',
    instruction: 'Guarda le coppie: il numero degli oggetti è PARI o DISPARI?',
    speechText: 'Il numero degli oggetti è pari o dispari?',
    numberA: n,
    visual: { kind: 'pairs', count: n, emoji: e },
    options: ['Pari', 'Dispari'],
    correctAnswer: isEven ? 'Pari' : 'Dispari',
    explanation: isEven
      ? `${n} è PARI: tutti hanno un compagno, nessuno resta solo!`
      : `${n} è DISPARI: uno resta senza compagno!`,
    hint: 'Metti gli oggetti a coppie: ne avanza uno?',
  };
};

// ---------------------------------------------------------------------------
// Varianti per i livelli esistenti
// ---------------------------------------------------------------------------

const VARIANTS: Record<number, Gen[]> = {
  1: [tenFrameFlash(1, 5), buildNumber(1, 5)],
  2: [tenFrameFlash(6, 10), buildNumber(6, 10)],
  4: [sequenceMissing([1], 10)],
  5: [tenFrameFlash(1, 10), buildNumber(1, 10), sequenceMissing([1], 10), tapOrder(true, 10)],
  8: [balanceCompare],
  9: [tapOrder(true, 10)],
  10: [tapOrder(true, 20), balanceCompare],
  12: [tenFrameMissing, balanceMissing(10, 10)],
  14: [balanceMissing(4, 10)],
  18: [balanceMissing(5, 10)],
  20: [balanceMissing(6, 10), tenFrameMissing],
  26: [shapeName(false)],
  28: [gridPosition],
  29: [patternMissing(false), patternMissing(true)],
  30: [shapeSides(false), shapeOddOne, shapeCount],
  33: [coinsTotal],
  36: [evenOddPairs],
  37: [sequenceMissing([2, 5], 30), groupsTotal([2, 5])],
  38: [patternMissing(true), sequenceMissing([1, 2, 5, 10], 40, true)],
};

/** Probabilità che il livello usi una variante grafica al posto della domanda testuale. */
const VARIANT_CHANCE: Record<number, number> = {
  26: 1,
  28: 0.85,
  29: 1,
  30: 0.9,
  36: 0.85,
  37: 1,
};
const DEFAULT_VARIANT_CHANCE = 0.55;

/** Ritorna una domanda grafica alternativa per il livello, oppure null per usare quella classica. */
export function generateVariantQuestion(levelId: number, id: string): Question | null {
  const pool = VARIANTS[levelId];
  if (!pool) return null;
  const chance = VARIANT_CHANCE[levelId] ?? DEFAULT_VARIANT_CHANCE;
  if (Math.random() >= chance) return null;
  return choice(pool)(id);
}

// ---------------------------------------------------------------------------
// Mondo 9: Il Parco dei Giochi Logici (livelli 41-45)
// ---------------------------------------------------------------------------

const PARK: Record<number, Gen[]> = {
  41: [tenFrameFlash(1, 10), buildNumber(1, 10), tenFrameMissing],
  42: [balanceMissing(4, 10), balanceCompare, balanceMissing(3, 8)],
  43: [patternMissing(true), sequenceMissing([1, 2, 5, 10], 50, true), groupsTotal([2, 5])],
  44: [shapeName(true), shapeSides(true), shapeOddOne, shapeCount, gridPosition],
  45: [barsCompare, clockRead, coinsTotal, tapOrder(true, 20), tapOrder(false, 20), clockRead],
};

export function generateParkQuestion(levelId: number, id: string): Question {
  const pool = PARK[levelId] ?? PARK[45];
  return choice(pool)(id);
}
