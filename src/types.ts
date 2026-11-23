export type LetterId = string;

export interface StrokePoint {
  x: number; // 0 to 100
  y: number; // 0 to 100
}

export interface StrokeGuide {
  id: number;
  label: string;
  points: StrokePoint[];
}

export interface LetterData {
  id: string; // e.g. "A"
  letter: string; // "A"
  lowercase: string; // "a"
  word: string; // "Ape"
  category: 'Animale' | 'Oggetto' | 'Natura' | 'Cibo';
  emoji: string;
  color: string; // Tailwind color or hex
  accentBg: string;
  borderCol: string;
  phonics: string; // "A come Ape"
  funFact: string;
  funFactEmoji?: string; // emoji of the word the fun fact is about (differs from `emoji` when the word rotates)
  sampleWords: { word: string; emoji: string }[];
  level: 1 | 2 | 3 | 4; // 1: Vocali, 2: Consonanti comuni, 3: Consonanti avanzate, 4: Lettere speciali
  strokesUppercase: StrokeGuide[];
  strokesLowercase: StrokeGuide[];
}

export type StickerRarity = 'comune' | 'rara' | 'leggendaria';
export type AlbumCategory = 'animali' | 'magia' | 'spazio' | 'dolcezze' | 'musica' | 'trofei';

export interface StickerItem {
  id: string;
  name: string;
  emoji: string;
  albumId: AlbumCategory;
  category: AlbumCategory;
  rarity: StickerRarity;
  requiredStars: number;
  description: string;
  soundLabel?: string;
}

export interface AlbumTheme {
  id: AlbumCategory;
  tierNumber: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  minStarsToUnlock: number;
  maxStars: number;
  color: string;
  gradient: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  goal: number;
  rewardStars: number;
  completed: boolean;
  claimed: boolean;
}

export interface PlacedSticker {
  id: string;
  stickerId: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  rotation: number;
  scale: number;
}

/** Come si mostrano le parole: stampatello maiuscolo, stampatello minuscolo o corsivo. */
export type TextStyle = 'upper' | 'lower' | 'cursive';

export interface ChildProgress {
  name: string;
  avatar: string;
  stars: number;
  gems: number;
  packsOpened: number;
  masteredLetters: string[]; // ['A', 'B']
  tracedUppercase: string[];
  tracedLowercase: string[];
  unlockedStickers: string[];
  placedStickers: PlacedSticker[];
  currentBackground: string;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  completedBubbleLevels: number;
  completedWordQuizRounds: number;
  lettersTracedCount: number;
  claimedMissionIds: string[];
  /** Parole lette bene nel gioco "Leggi" (maiuscolo, senza ripetizioni): il diario delle parole. */
  readWords: string[];
  /** Sillabe ("LA", "AL"…) trovate o scritte giuste negli esercizi di sillabe, in maiuscolo. */
  syllables: string[];
  /** Carattere scelto dai genitori per le parole (di solito si inizia dallo stampatello maiuscolo). */
  textStyle: TextStyle;
  /** Matematica: stelle (0-3) ottenute in ogni livello, chiave = id livello. */
  mathLevelStars: Record<string, number>;
  completedMathLevels: number;
  mathExercisesSolved: number;
  mathCorrectFirstTry: number;
  /** Inglese: parole del vocabolario riconosciute all'ascolto (minuscolo, senza ripetizioni). */
  englishWords: string[];
  /** Inglese: lettere dell'alfabeto riconosciute dal nome (maiuscolo). */
  englishLetters: string[];
  /** Inglese: parole delle famiglie (cat, hat…) lette formandole con la lettera iniziale. */
  englishFamilyWords: string[];
  /** Inglese: parole a colpo d'occhio riconosciute (minuscolo). */
  englishSightWords: string[];
  /** Inglese: lettere tracciate; la maiuscola ("A") e la minuscola ("a") contano separatamente. */
  englishTraced: string[];
  /** Inglese: parole costruite con le lettere nel gioco "costruisci la parola" (minuscolo). */
  englishSpelledWords: string[];
  /** Inglese: id delle storie e canzoncine lette fino in fondo. */
  englishStories: string[];
  /** Sbloccato dai genitori con un codice: tutti i livelli sono giocabili (stelle e figurine non cambiano). */
  allLevelsUnlocked: boolean;
  /** Isole: stelle guadagnate giocando in ogni città (chiave = id città). In matematica contano le stelline dei livelli. */
  cityStars: Record<string, number>;
  /** Isole: città già superate, cioè con premio (figurina) ritirato. */
  claimedCities: string[];
}

export type TabId =
  | 'home'
  | 'explorer'
  | 'tracing'
  | 'bubbles'
  | 'words'
  | 'reading'
  | 'exercises'
  | 'mathmap'
  | 'lab'
  | 'enlisten'
  | 'enalphabet'
  | 'enfamilies'
  | 'enwrite'
  | 'enstories'
  | 'island'
  | 'stickers';

export type Section = 'italian' | 'math' | 'english';

export type UsageEventType =
  | 'letter_traced'
  | 'bubble_round_completed'
  | 'quiz_correct'
  | 'quiz_wrong'
  | 'spelling_completed'
  | 'word_read'
  | 'syllable_learned'
  | 'english_word_learned'
  | 'english_letter_learned'
  | 'english_family_word_read'
  | 'english_sight_word_read'
  | 'english_letter_traced'
  | 'english_word_spelled'
  | 'english_story_read'
  | 'math_level_completed'
  | 'pack_opened'
  | 'mission_claimed'
  | 'city_cleared'
  | 'stars_earned';

export interface UsageEvent {
  t: number; // epoch milliseconds
  type: UsageEventType;
  amount?: number;
  detail?: string;
}

export interface DailyUsage {
  seconds: number;
  stars: number;
  activities: number;
}

export interface UsageStats {
  firstOpenedAt: number | null;
  lastOpenedAt: number | null;
  sessions: number;
  totalActiveSeconds: number;
  tabSeconds: Record<TabId, number>;
  counters: Record<UsageEventType, number>;
  daily: Record<string, DailyUsage>; // key: YYYY-MM-DD (local time)
  log: UsageEvent[]; // most recent events, capped
}

export interface AppState {
  progress: ChildProgress;
  usage: UsageStats;
}
