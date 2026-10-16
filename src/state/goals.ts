import type { ChildProgress, DailyMission } from '../types';
import { ALPHABET_DATA } from '../data/alphabet';
import { MATH_LEVEL_COUNT, WORLDS } from '../math/worlds';
import { ENGLISH_WORLDS } from '../data/englishWords';
import { ENGLISH_ALPHABET } from '../data/englishAlphabet';

/** Un attestato ogni 5 lettere imparate (e uno finale per l'alfabeto completo). */
export const CERTIFICATE_STEP = 5;

export interface Certificate {
  kind: 'letters';
  /** Numero di lettere imparate che l'attestato celebra. */
  letters: number;
  title: string;
  emoji: string;
}

/** Tutti gli attestati ottenuti con `masteredCount` lettere imparate, dal primo al più recente. */
export function certificatesEarned(masteredCount: number): Certificate[] {
  const total = ALPHABET_DATA.length;
  const out: Certificate[] = [];
  for (let n = CERTIFICATE_STEP; n <= Math.min(masteredCount, total); n += CERTIFICATE_STEP) {
    out.push({ kind: 'letters', letters: n, title: `${n} lettere imparate`, emoji: n >= 20 ? '🏆' : n >= 10 ? '🥇' : '🥈' });
  }
  if (masteredCount >= total && total % CERTIFICATE_STEP !== 0) {
    out.push({ kind: 'letters', letters: total, title: 'Tutto l\'alfabeto!', emoji: '👑' });
  }
  return out;
}

/** Quante lettere mancano al prossimo attestato (0 se li ha già ottenuti tutti). */
export function lettersToNextCertificate(masteredCount: number): number {
  const total = ALPHABET_DATA.length;
  if (masteredCount >= total) return 0;
  const next = Math.min(total, (Math.floor(masteredCount / CERTIFICATE_STEP) + 1) * CERTIFICATE_STEP);
  return next - masteredCount;
}

/** Un attestato di matematica ogni 5 livelli giocati (e uno per tutta la mappa). */
export const MATH_CERTIFICATE_STEP = 5;

export interface MathCertificate {
  kind: 'levels';
  /** Numero di livelli di matematica che l'attestato celebra. */
  levels: number;
  title: string;
  emoji: string;
}

export type AnyCertificate = Certificate | MathCertificate;

export function mathCertificatesEarned(levelsDone: number): MathCertificate[] {
  const total = MATH_LEVEL_COUNT;
  const out: MathCertificate[] = [];
  for (let n = MATH_CERTIFICATE_STEP; n <= Math.min(levelsDone, total); n += MATH_CERTIFICATE_STEP) {
    out.push({ kind: 'levels', levels: n, title: `${n} livelli di matematica`, emoji: n >= 30 ? '🏆' : n >= 15 ? '🥇' : '🥈' });
  }
  if (levelsDone >= total && total % MATH_CERTIFICATE_STEP !== 0) {
    out.push({ kind: 'levels', levels: total, title: 'Tutta la mappa dei numeri!', emoji: '👑' });
  }
  return out;
}

/** Quanti livelli mancano al prossimo attestato di matematica (0 se la mappa è finita). */
export function levelsToNextCertificate(levelsDone: number): number {
  const total = MATH_LEVEL_COUNT;
  if (levelsDone >= total) return 0;
  const next = Math.min(total, (Math.floor(levelsDone / MATH_CERTIFICATE_STEP) + 1) * MATH_CERTIFICATE_STEP);
  return next - levelsDone;
}

export interface WorldCell {
  id: number;
  emoji: string;
  title: string;
  /** Livelli del mondo con almeno una stella. */
  levelsDone: number;
  levelCount: number;
  stars: number;
  maxStars: number;
  state: LetterProgressState;
}

/** Per ogni mondo di matematica: non iniziato, iniziato o completato (tutti i livelli giocati). */
export function mathWorldMap(mathLevelStars: Record<string, number>): WorldCell[] {
  return WORLDS.map((w) => {
    const levelsDone = w.levels.filter((l) => (mathLevelStars[String(l.id)] ?? 0) > 0).length;
    const stars = w.levels.reduce((n, l) => n + (mathLevelStars[String(l.id)] ?? 0), 0);
    return {
      id: w.id,
      emoji: w.themeEmoji,
      title: w.title,
      levelsDone,
      levelCount: w.levels.length,
      stars,
      maxStars: w.levels.length * 3,
      state: levelsDone === 0 ? 'none' : levelsDone === w.levels.length ? 'mastered' : 'started',
    };
  });
}

export type LetterProgressState = 'none' | 'started' | 'mastered';

export interface EnglishWorldCell {
  id: string;
  emoji: string;
  title: string;
  /** Parole del mondo già riconosciute all'ascolto. */
  learned: number;
  total: number;
  state: LetterProgressState;
}

/** Per ogni mondo del vocabolario inglese: non iniziato, iniziato o completato (tutte le parole imparate). */
export function englishWorldMap(englishWords: readonly string[]): EnglishWorldCell[] {
  const known = new Set(englishWords);
  return ENGLISH_WORLDS.map((w) => {
    const learned = w.words.filter((x) => known.has(x.word)).length;
    return {
      id: w.id,
      emoji: w.emoji,
      title: w.title,
      learned,
      total: w.words.length,
      state: learned === 0 ? 'none' : learned === w.words.length ? 'mastered' : 'started',
    };
  });
}

export interface EnglishLetterCell {
  letter: string;
  lowercase: string;
  state: 'none' | 'mastered';
}

/** Per ogni lettera dell'alfabeto inglese: da imparare o riconosciuta. */
export function englishAlphabetMap(englishLetters: readonly string[]): EnglishLetterCell[] {
  return ENGLISH_ALPHABET.map((x) => ({
    letter: x.letter,
    lowercase: x.lowercase,
    state: englishLetters.includes(x.letter) ? 'mastered' : 'none',
  }));
}

export interface AlphabetCell {
  id: string;
  letter: string;
  lowercase: string;
  state: LetterProgressState;
}

/** Per ogni lettera: non iniziata, iniziata (scritta solo maiuscola o solo minuscola) o imparata. */
export function alphabetMap(progress: Pick<ChildProgress, 'masteredLetters' | 'tracedUppercase' | 'tracedLowercase'>): AlphabetCell[] {
  return ALPHABET_DATA.map((l) => ({
    id: l.id,
    letter: l.letter,
    lowercase: l.lowercase,
    state: progress.masteredLetters.includes(l.id)
      ? 'mastered'
      : progress.tracedUppercase.includes(l.id) || progress.tracedLowercase.includes(l.id)
        ? 'started'
        : 'none',
  }));
}

export type MissionProgress = Pick<
  ChildProgress,
  'lettersTracedCount' | 'completedBubbleLevels' | 'completedWordQuizRounds' | 'completedMathLevels' | 'stars'
> & { readWordsCount: number; englishWordsCount?: number };

export interface Mission extends Pick<DailyMission, 'id' | 'title' | 'description' | 'icon'> {
  current: number;
  goal: number;
  reward: number;
}

/** Le missioni dell'Album Premi, condivise con la home per mostrare i progressi in grande. */
export function buildMissions(p: MissionProgress): Mission[] {
  return [
    {
      id: 'm_trace',
      title: 'Scrivi le Letterine',
      description: 'Esercitati con la scrittura guidata di almeno 2 lettere',
      icon: '✍️',
      current: p.lettersTracedCount,
      goal: 2,
      reward: 10,
    },
    {
      id: 'm_bubbles',
      title: 'Scoppia le Bolle',
      description: 'Supera 2 livelli del minigioco delle bolle volanti',
      icon: '🫧',
      current: p.completedBubbleLevels,
      goal: 2,
      reward: 10,
    },
    {
      id: 'm_quiz',
      title: 'Caccia alle Parole',
      description: 'Completa almeno 2 sfide di riconoscimento parole',
      icon: '🧩',
      current: p.completedWordQuizRounds,
      goal: 2,
      reward: 10,
    },
    {
      id: 'm_read',
      title: 'Piccola Lettrice',
      description: 'Leggi bene almeno 3 parole nel gioco "Leggi"',
      icon: '📖',
      current: p.readWordsCount,
      goal: 3,
      reward: 10,
    },
    {
      id: 'm_math',
      title: 'Esploratrice dei Numeri',
      description: 'Completa 2 livelli nella mappa di matematica',
      icon: '🔢',
      current: p.completedMathLevels,
      goal: 2,
      reward: 10,
    },
    {
      id: 'm_english',
      title: 'Primi Passi in Inglese',
      description: 'Impara 5 parole inglesi nel gioco delle immagini',
      icon: '🇬🇧',
      current: p.englishWordsCount ?? 0,
      goal: 5,
      reward: 10,
    },
    {
      id: 'm_stars',
      title: 'Cacciatrice di Stelle',
      description: 'Raggiungi almeno 30 stelle nel tuo forziere d’oro',
      icon: '⭐',
      current: p.stars,
      goal: 30,
      reward: 15,
    },
  ];
}

export interface MissionSummary {
  total: number;
  /** Missioni raggiunte (anche se il premio non è ancora stato riscattato). */
  completed: number;
  /** Missioni raggiunte ma con il premio ancora da riscattare. */
  toClaim: number;
  /** Percentuale 0-100 di avanzamento complessivo (ogni missione pesa uguale, al massimo il suo obiettivo). */
  percent: number;
}

export function summarizeMissions(missions: Mission[], claimedIds: readonly string[]): MissionSummary {
  const completed = missions.filter((m) => m.current >= m.goal).length;
  const toClaim = missions.filter((m) => m.current >= m.goal && !claimedIds.includes(m.id)).length;
  const sum = missions.reduce((acc, m) => acc + Math.min(1, m.current / m.goal), 0);
  return {
    total: missions.length,
    completed,
    toClaim,
    percent: missions.length === 0 ? 0 : Math.round((sum / missions.length) * 100),
  };
}
