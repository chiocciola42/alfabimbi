import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { ALPHABET_DATA, INITIAL_PROGRESS } from '../../src/data/alphabet';
import { applyDailyWords } from '../../src/data/dailyWords';
import { LEGACY_PROGRESS_KEY, STORAGE_KEY, loadState } from '../../src/storage/persistence';

const nav = (label: string) => screen.getAllByRole('button', { name: label })[0];

const letters = () => applyDailyWords(ALPHABET_DATA, new Date());

/** Renders the app and picks the Italian section from the home page. */
function renderItalian() {
  const view = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Italiano/ }));
  return view;
}

describe('App', () => {
  it('opens on the home page with the two subjects and the default profile', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Italiano/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Matematica/ })).toBeInTheDocument();
    expect(screen.getByText(`Ciao ${INITIAL_PROGRESS.name}!`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Per ${INITIAL_PROGRESS.name}`))).toBeInTheDocument();
  });

  it('opens the alphabet explorer from the Italian card', () => {
    renderItalian();
    expect(screen.getByText(/Tocca una lettera per ascoltare/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Per ${INITIAL_PROGRESS.name}`))).toBeInTheDocument();
  });

  it('navigates through every section without crashing', () => {
    renderItalian();
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
    renderItalian();
    fireEvent.click(screen.getAllByRole('button', { name: /Scrivi/ })[1]); // second letter: E
    expect(screen.getByText('Lettera Maiuscola')).toBeInTheDocument();
    expect(screen.getByText(`come ${letters()[1].word}`)).toBeInTheDocument();
  });

  it('wraps around when walking through letters in tracing mode', () => {
    renderItalian();
    fireEvent.click(nav('Impara a Scrivere'));
    fireEvent.click(screen.getByTitle('Lettera precedente'));
    expect(screen.getByText(`come ${letters()[25].word}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Lettera successiva'));
    expect(screen.getByText(`come ${letters()[0].word}`)).toBeInTheDocument();
  });

  it('earns stars in the quiz and shows them in the header and storage', () => {
    renderItalian();
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
    const first = renderItalian();
    fireEvent.click(screen.getByRole('button', { name: /Profilo e impostazioni/ }));
    fireEvent.change(screen.getByLabelText(/Nome della piccola campionessa/), { target: { value: 'Bianca' } });
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
    renderItalian();
    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(loadState().state.usage.totalActiveSeconds).toBe(10);
    expect(loadState().state.usage.tabSeconds.explorer).toBe(10);
  });

  it('shows a different word for each letter on the next day, consistently across the app', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 14, 10, 0, 0));
    const day1 = letters()[0];
    const first = renderItalian();
    expect(screen.getAllByText(day1.word).length).toBeGreaterThan(0);
    first.unmount();

    vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
    const day2 = letters()[0];
    expect(day2.word).not.toBe(day1.word);
    renderItalian();
    expect(screen.getAllByText(day2.word).length).toBeGreaterThan(0);
    expect(screen.queryByText(day1.word)).not.toBeInTheDocument();
    fireEvent.click(nav('Bolle Magiche'));
    expect(screen.getByText(/Trova e scoppia la lettera/)).toHaveTextContent(`(${day2.word} ${day2.emoji})`);
  });
});

describe('App - matematica e premi condivisi', () => {
  const openMath = () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Matematica/ }));
  };

  it('opens the math adventure map from the home page and can go back home', () => {
    openMath();
    expect(screen.getByText(/Scegli il tuo Mondo/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Laboratorio' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla pagina iniziale' }));
    expect(screen.getByText(/Cosa vuoi imparare oggi/)).toBeInTheDocument();
  });

  it('only unlocks the first level at the start', () => {
    openMath();
    expect(screen.getByRole('button', { name: /Gioca il livello 1:/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /livello 2:/ })).not.toBeInTheDocument();
  });

  it('opens the lab and the shared album from the math section', () => {
    openMath();
    fireEvent.click(screen.getAllByRole('button', { name: 'Laboratorio' })[0]);
    expect(screen.getByText(/Palestra dei Manipolativi/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Album Premi' })[0]);
    expect(screen.getByText(/Il Regno delle Figurine/)).toBeInTheDocument();
    // la navigazione resta quella della matematica
    expect(screen.getAllByRole('button', { name: 'Laboratorio' }).length).toBeGreaterThan(0);
  });

  it('plays a whole math level and rewards it with stars shared with the Italian side', () => {
    openMath();
    fireEvent.click(screen.getByRole('button', { name: /Gioca il livello 1:/ }));
    // Risponde sempre con la risposta del livello: legge la domanda dai dati del generatore.
    for (let i = 0; i < 5; i++) {
      const options = screen.getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''));
      expect(options.length).toBeGreaterThan(0);
      fireEvent.click(options[0]);
      fireEvent.click(screen.getByRole('button', { name: /Prossima|Avanti|Fine|Vedi|Concludi/ }));
    }
    expect(screen.getByRole('dialog', { name: 'Livello completato' })).toBeInTheDocument();
    const saved = loadState().state;
    expect(saved.progress.completedMathLevels).toBe(1);
    expect(saved.progress.stars).toBeGreaterThan(INITIAL_PROGRESS.stars);
    expect(saved.progress.mathLevelStars['1']).toBeGreaterThanOrEqual(1);
    expect(saved.usage.counters.math_level_completed).toBe(1);
  });
});
