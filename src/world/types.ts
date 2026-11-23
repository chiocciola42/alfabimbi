import type { Section, TabId } from '../types';

/** Aspetto procedurale degli edifici di una città nella scena 3D. */
export type CityTheme = 'village' | 'harbor' | 'castle' | 'tower' | 'market' | 'lighthouse' | 'forest' | 'lab' | 'theater';

/** Un gioco (o un livello) giocabile dentro una città. */
export interface GameDef {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  /** Scheda dell'app che mostra il gioco (vedi `App.tsx`). */
  tab: TabId;
  /** Solo matematica: id del livello da aprire con `MathQuiz`. */
  levelId?: number;
}

export interface CityDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  theme: CityTheme;
  /** Colore principale dei tetti e dei segnaposto (esadecimale). */
  color: string;
  games: GameDef[];
  /** Stelle da raccogliere in questa città per "superarla": sblocca la città successiva e dà una figurina. */
  clearStars: number;
  /** Posizione sull'isola; se manca viene calcolata da `layoutIsland`. */
  pos?: { x: number; z: number };
  /** Città da cui parte il sentiero (di default la precedente nella catena principale). */
  branchFrom?: string;
  /** Sempre aperta, ad esempio un laboratorio di gioco libero. */
  alwaysOpen?: boolean;
  /** Matematica: id dei livelli le cui stelline (0-3) contano come stelle della città. */
  levelIds?: number[];
}

export interface IslandPalette {
  grass: string;
  grassDark: string;
  sand: string;
  accent: string;
}

export interface IslandDef {
  id: string;
  section: Section;
  name: string;
  emoji: string;
  tagline: string;
  palette: IslandPalette;
  cities: CityDef[];
}
