import type { IslandDef } from '../types';
import { tabGame } from '../games';

export const ITALIAN_ISLAND: IslandDef = {
  id: 'italiano',
  section: 'italian',
  name: "Isola dell'Italiano",
  emoji: '✏️',
  tagline: 'Lettere, parole e storie',
  palette: { grass: '#8fd46b', grassDark: '#5fb04f', sand: '#f6dd9b', accent: '#f59e0b' },
  cities: [
    {
      id: 'it-borgo', name: "Borgo dell'Alfabeto", emoji: '🔤', theme: 'village', color: '#f59e0b', clearStars: 10,
      description: 'Qui vivono tutte le lettere: scoprile e impara a scriverle.',
      games: [tabGame('explorer'), tabGame('tracing')],
    },
    {
      id: 'it-porto', name: 'Porto delle Bolle', emoji: '🫧', theme: 'harbor', color: '#06b6d4', clearStars: 10,
      description: 'Le lettere galleggiano nelle bolle: scoppia quella giusta!',
      games: [tabGame('bubbles')],
    },
    {
      id: 'it-parole', name: 'Città delle Parole', emoji: '🔎', theme: 'market', color: '#ec4899', clearStars: 12,
      description: 'Cerca e trova le parole nascoste al mercato.',
      games: [tabGame('words')],
    },
    {
      id: 'it-torre', name: 'Torre della Lettura', emoji: '📖', theme: 'tower', color: '#8b5cf6', clearStars: 12,
      description: 'Sali sulla torre leggendo parole sempre più lunghe.',
      games: [tabGame('reading')],
    },
    {
      id: 'it-sillabe', name: 'Castello delle Sillabe', emoji: '🏰', theme: 'castle', color: '#10b981', clearStars: 15,
      description: 'Sillabe, lettere iniziali e caccia alle lettere.',
      games: [tabGame('exercises')],
    },
  ],
};
