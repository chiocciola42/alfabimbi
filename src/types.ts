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
  sampleWords: { word: string; emoji: string }[];
  level: 1 | 2 | 3 | 4; // 1: Vocali, 2: Consonanti comuni, 3: Consonanti avanzate, 4: Lettere speciali
  strokesUppercase: StrokeGuide[];
  strokesLowercase: StrokeGuide[];
}

export type StickerRarity = 'comune' | 'rara' | 'leggendaria';
export type AlbumCategory = 'animali' | 'magia' | 'spazio' | 'dolcezze' | 'trofei';

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
  title: string;
  description: string;
  icon: string;
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
}
