import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { nav, openParentArea } from './helpers';
import { ALPHABET_DATA, INITIAL_PROGRESS } from '../../src/data/alphabet';
import { applyDailyWords } from '../../src/data/dailyWords';
import { LEGACY_PROGRESS_KEY, STORAGE_KEY, loadState } from '../../src/storage/persistence';

const letters = () => applyDailyWords(ALPHABET_DATA, new Date());

/** Renders the app and picks the Italian section from the home page. */
function renderItalian() {
  const view = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Italiano/ }));
  nav('Alfabeto');
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
    nav('Impara a Scrivere');
    expect(screen.getByText('Lettera Maiuscola')).toBeInTheDocument();
    nav('Bolle Magiche');
    expect(screen.getByText(/Missione Bolle Magiche/)).toBeInTheDocument();
    nav('Caccia alle Parole');
    expect(screen.getByText(/Indovina la Lettera Iniziale/)).toBeInTheDocument();
    nav('Album Premi');
    expect(screen.getByText(/Il Regno delle Figurine/)).toBeInTheDocument();
    nav('Alfabeto');
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
    nav('Impara a Scrivere');
    fireEvent.click(screen.getByTitle('Lettera precedente'));
    expect(screen.getByText(`come ${letters()[25].word}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Lettera successiva'));
    expect(screen.getByText(`come ${letters()[0].word}`)).toBeInTheDocument();
  });

  it('earns stars in the quiz and shows them in the header and storage', () => {
    renderItalian();
    nav('Caccia alle Parole');
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
    nav('Caccia alle Parole');
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
    nav('Bolle Magiche');
    expect(screen.getByText(/Trova e scoppia la lettera/)).toHaveTextContent(`(${day2.word} ${day2.emoji})`);
  });
});

describe('App - matematica e premi condivisi', () => {
  const openMath = () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Matematica/ }));
  };

  it('opens the math island from the home page and can go back home', () => {
    openMath();
    expect(screen.getByRole('heading', { name: /Isola della Matematica/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Il Bosco dei Numeri' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Laboratorio dei Numeri' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla pagina iniziale' }));
    expect(screen.getByText(/Cosa vuoi imparare oggi/)).toBeInTheDocument();
  });

  it('only unlocks the first level and the first city at the start', () => {
    openMath();
    expect(screen.getByRole('button', { name: 'Il Fiume del Coccodrillo (bloccata)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Il Bosco dei Numeri' }));
    expect(screen.getByRole('button', { name: /Gioca il livello 1:/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /livello 2:/ })).toBeDisabled();
  });

  it('opens the lab and the shared album from the math island', () => {
    openMath();
    nav('Laboratorio');
    expect(screen.getByText(/Palestra dei Manipolativi/)).toBeInTheDocument();
    nav('Album Premi');
    expect(screen.getByText(/Il Regno delle Figurine/)).toBeInTheDocument();
    // dall'album si torna all'isola della matematica
    fireEvent.click(screen.getAllByRole('button', { name: 'Isola' })[0]);
    expect(screen.getByRole('heading', { name: /Isola della Matematica/ })).toBeInTheDocument();
  });

  it('plays a whole math level and rewards it with stars shared with the Italian side', () => {
    openMath();
    fireEvent.click(screen.getByRole('button', { name: 'Il Bosco dei Numeri' }));
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
    nav('Leggi le Parole');
    expect(screen.getByRole('button', { name: /Leggi e scegli/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ripeti le istruzioni' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Immagine / }).find((b) => b.dataset.correct === 'true')!);

    const saved = loadState().state;
    expect(saved.progress.readWords).toHaveLength(1);
    expect(saved.progress.stars).toBe(INITIAL_PROGRESS.stars + 3);
    expect(saved.usage.counters.word_read).toBe(1);
    expect(within(screen.getByRole('banner')).getByText(String(INITIAL_PROGRESS.stars + 3))).toBeInTheDocument();
  });

  it('opens the exercises, saves the syllables found and shows them on the home page', () => {
    const view = renderItalian();
    nav('Esercizi');
    expect(screen.getByText('Leggi le sillabe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ripeti le istruzioni' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trova la sillaba' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Sillaba / }).find((b) => b.dataset.correct === 'true')!);

    const saved = loadState().state;
    expect(saved.progress.syllables).toHaveLength(1);
    expect(saved.progress.stars).toBe(INITIAL_PROGRESS.stars + 2);
    expect(saved.usage.counters.syllable_learned).toBe(1);
    expect(saved.usage.tabSeconds.exercises).toBeGreaterThanOrEqual(0);
    view.unmount();

    render(<App />);
    expect(screen.getByTestId('syllable-count')).toHaveTextContent(/1 \/ \d+ sillabe/);
  });

  it('completes a word in the exercises: it enters the diary and counts as a reading word', () => {
    renderItalian();
    nav('Esercizi');
    fireEvent.click(screen.getByRole('button', { name: 'Completa la parola' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Sillaba / }).find((b) => b.dataset.correct === 'true')!);
    const saved = loadState().state;
    expect(saved.progress.readWords).toHaveLength(1);
    expect(saved.usage.counters.word_read).toBe(1);
  });

  it('counts the letter hunts in the word missions', () => {
    renderItalian();
    nav('Esercizi');
    fireEvent.click(screen.getByRole('button', { name: 'Inizia con…' }));
    const grid = screen.getByTestId('picture-grid');
    for (const b of within(grid).getAllByRole('button').filter((x) => x.dataset.starts === 'true')) fireEvent.click(b);
    const saved = loadState().state;
    expect(saved.progress.completedWordQuizRounds).toBe(1);
    expect(saved.progress.stars).toBe(INITIAL_PROGRESS.stars + 4);
  });

  it('shows the words read on the home page, in the diary and in the reading mission', () => {
    const view = renderItalian();
    nav('Leggi le Parole');
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
    nav('Album Premi');
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

    nav('Leggi le Parole');
    expect(screen.getByRole('img', { name: /^[a-z]+$/ })).toBeInTheDocument();
    view.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Italiano/ }));
    nav('Alfabeto');
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
    nav('Parole Inglesi');
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
    nav('ABC Inglese');
    expect(screen.getByText(/lettere imparate/)).toBeInTheDocument();
    nav('Leggi in Inglese');
    expect(screen.getByText('Forma la parola')).toBeInTheDocument();
    nav('Parole Inglesi');
    expect(screen.getAllByRole('button', { name: /^Immagine / })).toHaveLength(3);
    nav('Album Premi');
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
    nav('ABC Inglese');
    fireEvent.click(screen.getByRole('button', { name: 'Trova la lettera' }));
    const letters = screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ }).filter((b) => b.dataset.correct !== undefined);
    fireEvent.click(letters.find((b) => b.dataset.correct === 'true')!);
    expect(loadState().state.progress.englishLetters).toHaveLength(1);

    nav('Leggi in Inglese');
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

  it('brings the child back to the English island from the shared album', () => {
    renderEnglish();
    nav('Album Premi');
    fireEvent.click(screen.getAllByRole('button', { name: 'Isola' })[0]); // the album keeps the English island
    expect(screen.getByRole('heading', { name: /Isola dell'Inglese/ })).toBeInTheDocument();
    nav('Parole Inglesi');
    expect(screen.getAllByRole('button', { name: /^Immagine / })).toHaveLength(3);
  });

  it('reaches writing, stories and the sight words from the English navigation', () => {
    renderEnglish();
    nav('Scrivi in Inglese');
    expect(screen.getByText('Lettera Maiuscola')).toBeInTheDocument();
    expect(screen.getByText(/is for apple/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Costruisci le parole' }));
    expect(screen.getByText('Costruisci la parola')).toBeInTheDocument();
    nav('Storie e Canzoni');
    expect(screen.getByRole('button', { name: 'Ascolta la storia' })).toBeInTheDocument();
    nav('Leggi in Inglese');
    fireEvent.click(screen.getByRole('button', { name: "A colpo d'occhio" }));
    expect(screen.getAllByRole('button', { name: /^Parola / })).toHaveLength(3);
  });

  it('saves a sight word, a built word and a story, and shows them on the home goals', () => {
    const first = renderEnglish();
    nav('Leggi in Inglese');
    fireEvent.click(screen.getByRole('button', { name: "A colpo d'occhio" }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Parola / }).find((b) => b.dataset.correct === 'true')!);

    nav('Scrivi in Inglese');
    fireEvent.click(screen.getByRole('button', { name: 'Costruisci le parole' }));
    const slots = screen.getByTestId('letter-slots').children.length;
    for (let i = 0; i < slots; i++) {
      // touch every free letter until the next slot is filled
      const before = screen.getByTestId('letter-slots').querySelectorAll('.bg-emerald-400').length;
      for (const tileButton of screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ })) {
        if (tileButton.hasAttribute('disabled')) continue;
        fireEvent.click(tileButton);
        if (screen.queryByText(/Hai scritto una nuova parola/)) break;
        if (screen.getByTestId('letter-slots').querySelectorAll('.bg-emerald-400').length > before) break;
      }
    }
    expect(screen.getByText(/Hai scritto una nuova parola/)).toBeInTheDocument();

    nav('Storie e Canzoni');
    screen.getAllByRole('button', { name: /^Ascolta la riga / }).forEach((b) => fireEvent.click(b));
    fireEvent.click(screen.getByRole('button', { name: /Ho letto tutto/ }));

    const saved = loadState().state;
    expect(saved.progress.englishSightWords).toHaveLength(1);
    expect(saved.progress.englishSpelledWords).toHaveLength(1);
    expect(saved.progress.englishStories).toHaveLength(1);
    expect(saved.usage.counters).toMatchObject({ english_sight_word_read: 1, english_word_spelled: 1, english_story_read: 1 });
    first.unmount();

    render(<App />);
    expect(screen.getByTestId('english-sight')).toHaveTextContent('1 su 24');
    expect(screen.getByTestId('english-spelled')).toHaveTextContent('1 su 24');
    expect(screen.getByTestId('english-stories')).toHaveTextContent('1 su 7');
    expect(screen.getByTestId('english-traced')).toHaveTextContent('0 su 26');
    expect(screen.getByTestId('english-rime')).toHaveTextContent('0 su 24');
  });

  it('counts game stars for the city, then celebrates the cleared city with a sticker and opens the next one', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 5, progress: { ...INITIAL_PROGRESS, cityStars: { 'en-words': 8 } } }));
    renderEnglish();
    expect(screen.getByRole('button', { name: 'Torna alla città' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Immagine / }).find((b) => b.dataset.correct === 'true')!);
    expect(loadState().state.progress.cityStars['en-words']).toBe(10);

    fireEvent.click(screen.getByRole('button', { name: 'Torna alla città' }));
    const dialog = screen.getByRole('dialog', { name: /Città superata: Word Village/ });
    expect(within(dialog).getByText(/Nuova figurina/)).toBeInTheDocument();
    const saved = loadState().state.progress;
    expect(saved.claimedCities).toEqual(['en-words']);
    expect(saved.unlockedStickers.length).toBeGreaterThan(0);
    expect(loadState().state.usage.counters.city_cleared).toBe(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Avanti!' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ABC Harbour' })).toBeInTheDocument();
  });
});

