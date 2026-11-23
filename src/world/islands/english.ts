import type { IslandDef } from '../types';
import { tabGame } from '../games';

export const ENGLISH_ISLAND: IslandDef = {
  id: 'inglese',
  section: 'english',
  name: "Isola dell'Inglese",
  emoji: '🇬🇧',
  tagline: 'Words, letters and stories',
  palette: { grass: '#7fd9a6', grassDark: '#4fb58a', sand: '#f3e3b0', accent: '#10b981' },
  cities: [
    {
      id: 'en-words', name: 'Word Village', emoji: '👂', theme: 'village', color: '#10b981', clearStars: 10,
      description: 'Ascolta le parole inglesi e tocca il disegno giusto.',
      games: [tabGame('enlisten')],
    },
    {
      id: 'en-abc', name: 'ABC Harbour', emoji: '🔠', theme: 'lighthouse', color: '#0ea5e9', clearStars: 10,
      description: "Il porto dell'alfabeto inglese, lettera dopo lettera.",
      games: [tabGame('enalphabet')],
    },
    {
      id: 'en-read', name: 'Reading Tower', emoji: '🧱', theme: 'tower', color: '#f97316', clearStars: 12,
      description: 'Costruisci e leggi le parole delle famiglie rimate.',
      games: [tabGame('enfamilies')],
    },
    {
      id: 'en-write', name: 'Writing Workshop', emoji: '✍️', theme: 'market', color: '#ec4899', clearStars: 12,
      description: 'Traccia le lettere e costruisci le parole.',
      games: [tabGame('enwrite')],
    },
    {
      id: 'en-stories', name: 'Story Theatre', emoji: '🎵', theme: 'theater', color: '#8b5cf6', clearStars: 15,
      description: 'Storie e canzoncine da ascoltare e leggere.',
      games: [tabGame('enstories')],
    },
  ],
};
