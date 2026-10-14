import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { ALPHABET_DATA, INITIAL_PROGRESS } from '../../src/data/alphabet';
import { LEGACY_PROGRESS_KEY, STORAGE_KEY, loadState } from '../../src/storage/persistence';

const nav = (label: string) => screen.getAllByRole('button', { name: label })[0];

describe('App', () => {
  it('opens on the alphabet explorer with the default profile', () => {
    render(<App />);
    expect(screen.getByText(/Tocca una lettera per ascoltare/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Per ${INITIAL_PROGRESS.name}`))).toBeInTheDocument();
  });

  it('navigates through every section without crashing', () => {
    render(<App />);
    fireEvent.click(nav('Impara a Scrivere'));
    expect(screen.getByText('Lettera Maiuscola')).toBeInTheDocument();
    fireEvent.click(nav('Bolle Magiche'));
    expect(screen.getByText(/Missione Bolle Magiche/)).toBeInTheDocument();
    fireEvent.click(nav('Caccia alle Parole'));
    expect(screen.getByText(/Indovina la Lettera Iniziale/)).toBeInTheDocument();
    fireEvent.click(nav('Album Premi'));
    expect(screen.getByText(/Il Regno delle Figurine/)).toBeInTheDocument();
    fireEvent.click(nav('Alfabeto'));
    expect(screen.getByText(/Tocca una lettera per ascoltare/)).toBeInTheDocument();
  });

  it('opens the tracing page for the letter picked in the explorer', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Scrivi/ })[1]); // second letter: E
    expect(screen.getByText('Lettera Maiuscola')).toBeInTheDocument();
    expect(screen.getByText('come Elefante')).toBeInTheDocument();
  });

  it('wraps around when walking through letters in tracing mode', () => {
    render(<App />);
    fireEvent.click(nav('Impara a Scrivere'));
    fireEvent.click(screen.getByTitle('Lettera precedente'));
    expect(screen.getByText(`come ${ALPHABET_DATA[ALPHABET_DATA.length - 1].word}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Lettera successiva'));
    expect(screen.getByText('come Ape')).toBeInTheDocument();
  });

  it('earns stars in the quiz and shows them in the header and storage', () => {
    render(<App />);
    fireEvent.click(nav('Caccia alle Parole'));
    fireEvent.click(screen.getByRole('button', { name: 'A' })); // first word is "Ape"
    const stars = INITIAL_PROGRESS.stars + 3;
    expect(within(screen.getByRole('banner')).getByText(String(stars))).toBeInTheDocument();
    const saved = loadState().state;
    expect(saved.progress.stars).toBe(stars);
    expect(saved.progress.completedWordQuizRounds).toBe(INITIAL_PROGRESS.completedWordQuizRounds + 1);
    expect(saved.usage.counters.quiz_correct).toBe(1);
  });

  it('keeps the profile and progress after the app is closed and reopened', () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Profilo e impostazioni/ }));
    fireEvent.change(screen.getByLabelText(/Nome della piccola scrittrice/), { target: { value: 'Bianca' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva Profilo' }));
    fireEvent.click(nav('Caccia alle Parole'));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    first.unmount();

    render(<App />);
    expect(screen.getByText(/Per Bianca/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${INITIAL_PROGRESS.stars + 3} stelle raccolte`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Profilo e impostazioni/ }));
    expect(screen.getByTestId('usage-stats')).toHaveTextContent(/Sessioni\s*2/);
  });

  it('migrates data saved by the old AI Studio version', () => {
    localStorage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ ...INITIAL_PROGRESS, name: 'Vecchia', stars: 88 }));
    render(<App />);
    expect(screen.getByText(/Per Vecchia/)).toBeInTheDocument();
    expect(screen.getByText(/88 stelle raccolte/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('starts cleanly from corrupted storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    render(<App />);
    expect(screen.getByText(new RegExp(`Per ${INITIAL_PROGRESS.name}`))).toBeInTheDocument();
  });

  it('can reset the progress from the profile', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, progress: { ...INITIAL_PROGRESS, name: 'Tizia', stars: 200 } }));
    render(<App />);
    expect(screen.getByText(/200 stelle raccolte/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Profilo e impostazioni/ }));
    fireEvent.click(screen.getByRole('button', { name: /Azzera progressi/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sì, azzera/ }));
    expect(screen.getByText(new RegExp(`${INITIAL_PROGRESS.stars} stelle raccolte`))).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('records active time while the app is used', () => {
    vi.useFakeTimers();
    render(<App />);
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(loadState().state.usage.totalActiveSeconds).toBe(10);
    expect(loadState().state.usage.tabSeconds.explorer).toBe(10);
  });
});
