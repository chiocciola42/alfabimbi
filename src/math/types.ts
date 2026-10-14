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
  | 'even_odd'; // Pari o dispari

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
}

export interface Level {
  id: number; // 1 to 40
  worldId: number; // 1 to 8
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
