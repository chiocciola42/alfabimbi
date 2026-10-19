export type QuestionType =
  | 'count_objects'
  | 'compare_numbers' // <, =, > with crocodile
  | 'number_line' // Frog jump forward or backward
  | 'before_after' // Precedente e successivo
  | 'addition_objects' // Touch to count and add
  | 'friends_of_ten' // Pairs that make 10
  | 'subtraction_objects' // Objects with some crossed out
  | 'tens_and_units' // Abacus or 1 da + X u
  | 'shapes_and_space' // Geometria e topologia (sopra, sotto, destra, sinistra)
  | 'word_problem' // Illustrated problem with story & speech
  | 'order_numbers' // Mettere in ordine
  | 'even_odd' // Pari o dispari
  | 'ten_frame' // Telaio del 10: lampo di puntini, complementi
  | 'build_number' // Costruisci il numero toccando le caselle
  | 'balance' // Bilancia a due piatti
  | 'pattern' // Ritmi e serie di simboli
  | 'sequence' // Serie di numeri con un buco
  | 'shape' // Figure geometriche disegnate
  | 'grid_position' // Posizioni su una griglia
  | 'clock' // Orologio (ore e mezze ore)
  | 'money' // Monete e resto
  | 'measure' // Confronto di lunghezze
  | 'tap_order' // Tocca i numeri nell'ordine giusto
  | 'make_ten' // Somme passando dal 10
  | 'match_quantity' // Conta e scrivi: collega il numero alla quantità
  | 'mateland_puzzle'; // Missioni e puzzle della terra di Mateland

export type ShapeName = 'cerchio' | 'quadrato' | 'triangolo' | 'rettangolo' | 'pentagono' | 'esagono';

export interface GridItem {
  row: number;
  col: number;
  emoji: string;
}

export interface BarItem {
  label: string;
  length: number; // 1-10
  emoji: string;
}

/** Rappresentazione grafica opzionale di una domanda, disegnata da MathVisual. */
export type Visual =
  | { kind: 'ten_frame'; filled: number; highlightFrom?: number; flash?: boolean }
  | { kind: 'shape'; shape: ShapeName; color?: string }
  | { kind: 'shape_row'; shapes: ShapeName[]; colors?: string[] }
  | { kind: 'pattern'; items: string[]; missingIndex: number }
  | { kind: 'balance'; left: string[]; right: string[]; rightMissing?: boolean; tilt?: 'left' | 'right' | 'level' }
  | { kind: 'bars'; bars: BarItem[] }
  | { kind: 'sequence'; numbers: (number | null)[] }
  | { kind: 'pairs'; count: number; emoji: string }
  | { kind: 'grid'; rows: number; cols: number; items: GridItem[]; markCell?: { row: number; col: number } }
  | { kind: 'clock'; hour: number; minute: 0 | 30 }
  | { kind: 'coins'; coins: number[] }
  | { kind: 'groups'; groups: number; perGroup: number; emoji: string }
  | { kind: 'make_ten'; a: number; b: number; tool: 'frame' | 'line'; hide?: 'gap' | 'rest' | 'total' };

export type QuestionInteraction = 'choice' | 'ten_frame_build' | 'tap_order' | 'match_pairs';

export interface VisualItem {
  id: string;
  emoji: string;
  counted?: boolean;
  label?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  instruction: string;
  speechText: string;
  // Question payload variations
  itemsA?: VisualItem[];
  itemsB?: VisualItem[];
  numberA?: number;
  numberB?: number;
  targetSum?: number;
  numberLineMax?: number;
  numberLineStart?: number;
  numberLineJump?: number;
  missingPosition?: 'first' | 'middle' | 'last' | 'result';
  crocodileTarget?: '<' | '>' | '=';
  shapeType?: 'cerchio' | 'quadrato' | 'triangolo' | 'rettangolo';
  positionConcept?: 'sopra' | 'sotto' | 'dentro' | 'fuori' | 'destra' | 'sinistra';
  storyIllustration?: string; // emoji scene
  options: (string | number)[];
  correctAnswer: string | number;
  explanation: string;
  hint: string;
  visual?: Visual;
  interaction?: QuestionInteraction;
  /** Solo per interaction 'ten_frame_build': numero da costruire. */
  buildTarget?: number;
  /** Solo per interaction 'tap_order': numeri mescolati da toccare in ordine crescente. */
  orderItems?: number[];
  /** Solo per 'tap_order': true se l'ordine richiesto è dal più grande al più piccolo. */
  orderDescending?: boolean;
  /** Solo per 'tap_order': lettera nascosta sotto ogni numero, svelata quando lo si tocca (messaggio segreto). */
  orderLetters?: Record<number, string>;
  /** Solo per interaction 'match_pairs': numeri a sinistra e gruppi di emoji (già mescolati) a destra. */
  matchNumbers?: number[];
  matchGroups?: MatchGroup[];
}

export interface MatchGroup {
  value: number;
  emoji: string;
}

export interface Level {
  id: number; // 1 to 50
  worldId: number; // 1 to 10
  worldLevelNumber: number; // 1 to 5
  title: string;
  subtitle: string;
  themeEmoji: string;
  description: string;
  requiredStarsToUnlock: number;
}

export interface World {
  id: number;
  title: string;
  subtitle: string;
  themeEmoji: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  description: string;
  mascotGreeting: string;
  levels: Level[];
}
