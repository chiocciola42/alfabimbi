import type { CityDef, CityTheme, IslandDef } from '../types';
import { tabGame } from '../games';
import { WORLDS } from '../../math/worlds';

const THEMES: CityTheme[] = ['forest', 'village', 'harbor', 'market', 'tower', 'lighthouse', 'castle', 'lab', 'theater', 'castle'];

/** Ogni mondo di matematica diventa una città e ogni livello un gioco: nuovi mondi in `WORLDS` allungano l'isola. */
const worldCities: CityDef[] = WORLDS.map((world, i) => ({
  id: `math-${world.id}`,
  name: world.title,
  emoji: world.themeEmoji,
  theme: THEMES[i % THEMES.length],
  color: world.accentColor,
  description: world.description,
  clearStars: Math.max(3, Math.round(world.levels.length * 1.6)),
  levelIds: world.levels.map((l) => l.id),
  games: world.levels.map((level) => ({
    id: `math-level-${level.id}`,
    title: level.title,
    subtitle: level.subtitle,
    emoji: level.themeEmoji,
    tab: 'mathmap' as const,
    levelId: level.id,
  })),
}));

export const MATH_ISLAND: IslandDef = {
  id: 'matematica',
  section: 'math',
  name: 'Isola della Matematica',
  emoji: '🔢',
  tagline: 'Numeri, forme e problemi',
  palette: { grass: '#a6dc6f', grassDark: '#78c25a', sand: '#f6e3b0', accent: '#0ea5e9' },
  cities: [
    ...worldCities,
    {
      id: 'math-lab', name: 'Laboratorio dei Numeri', emoji: '🧪', theme: 'lab', color: '#a855f7', clearStars: 1,
      description: 'Un laboratorio dove sperimentare liberamente con i numeri.',
      games: [tabGame('lab')],
      branchFrom: worldCities[0].id,
      alwaysOpen: true,
    },
  ],
};
