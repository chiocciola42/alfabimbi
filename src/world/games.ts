import type { GameDef } from './types';

/** Giochi "a scheda": l'id coincide con la `TabId` che li mostra in `App.tsx`. */
export const TAB_GAMES = {
  explorer: { id: 'explorer', tab: 'explorer', title: 'Alfabeto', subtitle: 'Scopri le lettere', emoji: '🔤' },
  tracing: { id: 'tracing', tab: 'tracing', title: 'Impara a Scrivere', subtitle: 'Ripassa le lettere col dito', emoji: '✏️' },
  bubbles: { id: 'bubbles', tab: 'bubbles', title: 'Bolle Magiche', subtitle: 'Scoppia la lettera giusta', emoji: '🫧' },
  words: { id: 'words', tab: 'words', title: 'Caccia alle Parole', subtitle: 'Trova la parola', emoji: '🔎' },
  reading: { id: 'reading', tab: 'reading', title: 'Leggi le Parole', subtitle: 'Metti insieme le sillabe', emoji: '📖' },
  exercises: { id: 'exercises', tab: 'exercises', title: 'Esercizi', subtitle: 'Sillabe e lettere', emoji: '📝' },
  lab: { id: 'lab', tab: 'lab', title: 'Laboratorio', subtitle: 'Gioca liberamente con i numeri', emoji: '🧪' },
  enlisten: { id: 'enlisten', tab: 'enlisten', title: 'Parole Inglesi', subtitle: 'Ascolta e scegli', emoji: '👂' },
  enalphabet: { id: 'enalphabet', tab: 'enalphabet', title: 'ABC Inglese', subtitle: "L'alfabeto inglese", emoji: '🔠' },
  enfamilies: { id: 'enfamilies', tab: 'enfamilies', title: 'Leggi in Inglese', subtitle: 'Famiglie di parole', emoji: '🧱' },
  enwrite: { id: 'enwrite', tab: 'enwrite', title: 'Scrivi in Inglese', subtitle: 'Lettere e parole', emoji: '✍️' },
  enstories: { id: 'enstories', tab: 'enstories', title: 'Storie e Canzoni', subtitle: 'Ascolta e leggi', emoji: '🎵' },
} as const satisfies Record<string, GameDef>;

export type TabGameId = keyof typeof TAB_GAMES;

export function tabGame(id: TabGameId): GameDef {
  return { ...TAB_GAMES[id] };
}
