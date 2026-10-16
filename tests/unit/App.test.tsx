import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { openParentArea } from './helpers';
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
  it('opens on the home page with the three subjects and the default profile', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Inglese/ })).toBeInTheDocument();
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
    openParentArea();
    fireEvent.change(screen.getByLabelText(/Nome della piccola campionessa/), { target: { value: 'Bianca' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva Profilo' }));
    fireEvent.click(nav('Caccia alle Parole'));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    first.unmount();

    render(<App />);
    expect(screen.getByText(/Per Bianca/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${INITIAL_PROGRESS.stars + 3} stelle raccolte`))).toBeInTheDocument();
    openParentArea();
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
    openParentArea();
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
    expect(screen.getAllByText(day1.word.toUpperCase()).length).toBeGreaterThan(0);
    first.unmount();

    vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
    const day2 = letters()[0];
    expect(day2.word).not.toBe(day1.word);
    renderItalian();
    expect(screen.getAllByText(day2.word.toUpperCase()).length).toBeGreaterThan(0);
    expect(screen.queryByText(day1.word.toUpperCase())).not.toBeInTheDocument();
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
      if (options.length > 0) {
        fireEvent.click(options[0]);
      } else {
        // domanda interattiva (telaio da costruire): riempie una casella e controlla
        fireEvent.click(screen.getByRole('button', { name: /Casella 1,/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Controlla' }));
      }
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

describe('App - lettura, traguardi e area genitori', () => {
  it('opens the reading game from the Italian section and earns stars, diary entry and usage', () => {
    renderItalian();
    fireEvent.click(nav('Leggi le Parole'));
    expect(screen.getByRole('button', { name: /Leggi e scegli/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ripeti le istruzioni' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Immagine / }).find((b) => b.dataset.correct === 'true')!);

    const saved = loadState().state;
    expect(saved.progress.readWords).toHaveLength(1);
    expect(saved.progress.stars).toBe(INITIAL_PROGRESS.stars + 3);
    expect(saved.usage.counters.word_read).toBe(1);
    expect(within(screen.getByRole('banner')).getByText(String(INITIAL_PROGRESS.stars + 3))).toBeInTheDocument();
  });

  it('shows the words read on the home page, in the diary and in the reading mission', () => {
    const view = renderItalian();
    fireEvent.click(nav('Leggi le Parole'));
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getAllByRole('button', { name: /^Immagine / }).find((b) => b.dataset.correct === 'true')!);
      fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    }
    view.unmount();

    render(<App />);
    expect(screen.getByText(/3 \/ \d+ parole lette/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /da riscattare/ })).toBeInTheDocument();
  });

  it('keeps the album missions in step with the home page (reading mission included)', () => {
    renderItalian();
    fireEvent.click(nav('Album Premi'));
    fireEvent.click(screen.getByRole('button', { name: /Missioni del Giorno/ }));
    expect(screen.getByText('Piccola Lettrice')).toBeInTheDocument();
  });

  it('colours the alphabet map as letters are learned', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 4, progress: { ...INITIAL_PROGRESS, masteredLetters: ['A', 'E', 'I', 'O', 'U'], tracedUppercase: ['A', 'E', 'I', 'O', 'U'], tracedLowercase: ['A', 'E', 'I', 'O', 'U'] } })
    );
    render(<App />);
    expect(screen.getByText('5 / 26')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attestato: 5 lettere imparate' })).toBeInTheDocument();
  });

  it('does not open the parents area with a tap, only with a long press', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Area genitori/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openParentArea();
    expect(screen.getByRole('dialog', { name: /Profilo/ })).toBeInTheDocument();
    expect(screen.getByText('Area genitori')).toBeInTheDocument();
  });

  it('applies the text style chosen by the parents everywhere, and remembers it', () => {
    const view = renderItalian();
    expect(screen.getAllByText(letters()[0].word.toUpperCase()).length).toBeGreaterThan(0);
    openParentArea();
    fireEvent.click(within(screen.getByRole('group', { name: /Come scrivere le parole/ })).getAllByRole('button')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.getAllByText(letters()[0].word.toLowerCase()).length).toBeGreaterThan(0);
    expect(loadState().state.progress.textStyle).toBe('lower');

    fireEvent.click(nav('Leggi le Parole'));
    expect(screen.getByRole('img', { name: /^[a-z]+$/ })).toBeInTheDocument();
    view.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Italiano/ }));
    expect(screen.getAllByText(letters()[0].word.toLowerCase()).length).toBeGreaterThan(0);
  });

  it('has a speaker button wherever a child would have to read a long text', () => {
    renderItalian();
    expect(screen.getAllByRole('button', { name: /^Ascolta/ }).length).toBeGreaterThan(5);
  });
});

describe('App - English', () => {
  /** Renders the app and picks the English section from the home page. */
  function renderEnglish() {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Inglese/ }));
    return view;
  }

  it('opens the vocabulary game from the English card', () => {
    renderEnglish();
    expect(screen.getByRole('button', { name: 'Ascolta la parola inglese' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Immagine / })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Ripeti le istruzioni' })).toBeInTheDocument();
  });

  it('navigates through the three English games without crashing', () => {
    renderEnglish();
    fireEvent.click(nav('ABC Inglese'));
    expect(screen.getByText(/lettere imparate/)).toBeInTheDocument();
    fireEvent.click(nav('Leggi in Inglese'));
    expect(screen.getByText('Forma la parola')).toBeInTheDocument();
    fireEvent.click(nav('Parole Inglesi'));
    expect(screen.getAllByRole('button', { name: /^Immagine / })).toHaveLength(3);
    fireEvent.click(nav('Album Premi'));
    expect(screen.getByText(/Il Regno delle Figurine/)).toBeInTheDocument();
  });

  it('earns stars, saves the learned word and counts the activity', () => {
    renderEnglish();
    const right = screen.getAllByRole('button', { name: /^Immagine / }).find((b) => b.dataset.correct === 'true')!;
    fireEvent.click(right);
    const saved = loadState().state;
    expect(saved.progress.englishWords).toHaveLength(1);
    expect(saved.progress.stars).toBe(INITIAL_PROGRESS.stars + 2);
    expect(saved.usage.counters.english_word_learned).toBe(1);
    expect(saved.usage.counters.stars_earned).toBe(1);
  });

  it('saves the recognised letter and the word built from a word family', () => {
    renderEnglish();
    fireEvent.click(nav('ABC Inglese'));
    fireEvent.click(screen.getByRole('button', { name: 'Trova la lettera' }));
    const letters = screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ }).filter((b) => b.dataset.correct !== undefined);
    fireEvent.click(letters.find((b) => b.dataset.correct === 'true')!);
    expect(loadState().state.progress.englishLetters).toHaveLength(1);

    fireEvent.click(nav('Leggi in Inglese'));
    const onsets = screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ });
    fireEvent.click(onsets.find((b) => b.dataset.correct === 'true')!);
    const saved = loadState().state;
    expect(saved.progress.englishFamilyWords).toHaveLength(1);
    expect(saved.usage.counters.english_letter_learned).toBe(1);
    expect(saved.usage.counters.english_family_word_read).toBe(1);
  });

  it('shows the English goals on the home page and keeps the learned words after a restart', () => {
    const first = renderEnglish();
    fireEvent.click(screen.getAllByRole('button', { name: /^Immagine / }).find((b) => b.dataset.correct === 'true')!);
    first.unmount();

    render(<App />);
    expect(screen.getByRole('button', { name: /Inglese/ })).toHaveTextContent('1 parole su 64 imparate');
    expect(within(screen.getByTestId('english-world-map')).getAllByRole('listitem')).toHaveLength(8);
    expect(within(screen.getByTestId('english-alphabet-map')).getAllByRole('listitem')).toHaveLength(26);
    expect(screen.getByText('1 su 64')).toBeInTheDocument();
    expect(screen.getByLabelText(/Parole inglesi, .*: in corso, 1 su 8/)).toHaveAttribute('data-state', 'started');
  });

  it('brings the child back to the English section from the shared album', () => {
    renderEnglish();
    fireEvent.click(nav('Album Premi'));
    expect(screen.getAllByRole('button', { name: 'Parole Inglesi' })).toHaveLength(2); // the album keeps the English navigation
    fireEvent.click(nav('Parole Inglesi'));
    expect(screen.getAllByRole('button', { name: /^Immagine / })).toHaveLength(3);
  });
});
