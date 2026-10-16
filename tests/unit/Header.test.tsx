import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../../src/components/Header';
import { openParentArea } from './helpers';
import { INITIAL_PROGRESS } from '../../src/data/alphabet';
import type { Section } from '../../src/types';

function setup(progress = INITIAL_PROGRESS, overrides: { section?: Section | null } = {}) {
  const props = {
    currentTab: 'explorer' as const,
    section: 'italian' as Section | null,
    onSelectTab: vi.fn(),
    progress,
    onOpenProfile: vi.fn(),
    onToggleSound: vi.fn(),
    onToggleVoice: vi.fn(),
  };
  render(<Header {...props} {...overrides} />);
  return props;
}

describe('Header', () => {
  it('offers the Italian sections, home and album (desktop and mobile nav)', () => {
    setup();
    for (const label of ['Home', 'Alfabeto', 'Impara a Scrivere', 'Bolle Magiche', 'Caccia alle Parole', 'Leggi le Parole', 'Album Premi']) {
      expect(screen.getAllByRole('button', { name: label })).toHaveLength(2);
    }
    expect(screen.queryByRole('button', { name: 'Laboratorio' })).not.toBeInTheDocument();
  });

  it('offers the math sections when playing maths', () => {
    setup(INITIAL_PROGRESS, { section: 'math' });
    for (const label of ['Home', 'Mappa dei Numeri', 'Laboratorio', 'Album Premi']) {
      expect(screen.getAllByRole('button', { name: label })).toHaveLength(2);
    }
    expect(screen.queryByRole('button', { name: 'Alfabeto' })).not.toBeInTheDocument();
  });

  it('offers the English sections when learning English', () => {
    setup(INITIAL_PROGRESS, { section: 'english' });
    for (const label of ['Home', 'Parole Inglesi', 'ABC Inglese', 'Leggi in Inglese', 'Scrivi in Inglese', 'Storie e Canzoni', 'Album Premi']) {
      expect(screen.getAllByRole('button', { name: label })).toHaveLength(2);
    }
    expect(screen.queryByRole('button', { name: 'Alfabeto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Laboratorio' })).not.toBeInTheDocument();
  });

  it('has no section navigation on the home page and the brand goes home', () => {
    const { onSelectTab } = setup(INITIAL_PROGRESS, { section: null });
    expect(screen.queryByRole('button', { name: 'Album Premi' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla pagina iniziale' }));
    expect(onSelectTab).toHaveBeenCalledWith('home');
  });

  it('navigates through the tabs', () => {
    const { onSelectTab } = setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Bolle Magiche' })[0]);
    expect(onSelectTab).toHaveBeenCalledWith('bubbles');
  });

  it('shows the star count and the child profile', () => {
    setup({ ...INITIAL_PROGRESS, stars: 42, name: 'Ada', avatar: '🐰' });
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('exposes sound / voice state and toggles', () => {
    const { onToggleSound, onToggleVoice } = setup({ ...INITIAL_PROGRESS, soundEnabled: false, voiceEnabled: true });
    const sound = screen.getByRole('button', { name: /suoni/i });
    const voice = screen.getByRole('button', { name: /voce/i });
    expect(sound).toHaveAttribute('aria-pressed', 'false');
    expect(voice).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(sound);
    fireEvent.click(voice);
    expect(onToggleSound).toHaveBeenCalled();
    expect(onToggleVoice).toHaveBeenCalled();
  });

  it('opens the parents area only after a long press', () => {
    const { onOpenProfile } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Area genitori/ }));
    expect(onOpenProfile).not.toHaveBeenCalled();
    openParentArea();
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });
});
