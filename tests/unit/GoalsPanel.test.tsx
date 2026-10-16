import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalsPanel } from '../../src/components/GoalsPanel';
import { HomeScreen } from '../../src/components/HomeScreen';
import { ALPHABET_DATA, INITIAL_PROGRESS } from '../../src/data/alphabet';
import { READING_WORDS } from '../../src/data/readingWords';
import { sound } from '../../src/utils/sound';
import type { ChildProgress } from '../../src/types';

const ids = (n: number) => ALPHABET_DATA.slice(0, n).map((l) => l.id);
const withProgress = (patch: Partial<ChildProgress>): ChildProgress => ({ ...INITIAL_PROGRESS, ...patch });

function setup(patch: Partial<ChildProgress> = {}) {
  const onOpenAlbum = vi.fn();
  render(<GoalsPanel progress={withProgress(patch)} onOpenAlbum={onOpenAlbum} />);
  return { onOpenAlbum };
}

afterEach(() => vi.restoreAllMocks());

describe('GoalsPanel - missions', () => {
  it('shows an empty progress bar at the start, with no prize to claim', () => {
    setup();
    const bar = screen.getByRole('progressbar', { name: 'Missioni completate' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByRole('button', { name: /premi? da riscattare/ })).not.toBeInTheDocument();
  });

  it('fills the bar and points to the album when a prize is waiting', () => {
    const { onOpenAlbum } = setup({ lettersTracedCount: 2 });
    const bar = screen.getByRole('progressbar', { name: 'Missioni completate' });
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '1 premio da riscattare!' }));
    expect(onOpenAlbum).toHaveBeenCalled();
  });

  it('stops asking once the prize has been claimed, and counts several prizes', () => {
    const { unmount } = render(
      <GoalsPanel progress={withProgress({ lettersTracedCount: 2, claimedMissionIds: ['m_trace'] })} onOpenAlbum={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /da riscattare/ })).not.toBeInTheDocument();
    unmount();
    render(<GoalsPanel progress={withProgress({ lettersTracedCount: 2, completedBubbleLevels: 2 })} onOpenAlbum={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2 premi da riscattare!' })).toBeInTheDocument();
  });

  it('counts the reading mission', () => {
    setup({ readWords: ['CASA', 'LUNA', 'MARE'] });
    expect(screen.getByRole('button', { name: '1 premio da riscattare!' })).toBeInTheDocument();
  });
});

describe('GoalsPanel - alphabet map', () => {
  it('has a cell per letter, colouring the ones learned and started', () => {
    setup({ masteredLetters: ['A'], tracedUppercase: ['A', 'E'], tracedLowercase: ['A'] });
    const cells = within(screen.getByTestId('alphabet-map')).getAllByRole('listitem');
    expect(cells).toHaveLength(ALPHABET_DATA.length);
    expect(screen.getByLabelText('Lettera A: imparata')).toHaveAttribute('data-state', 'mastered');
    expect(screen.getByLabelText('Lettera E: quasi imparata')).toHaveAttribute('data-state', 'started');
    expect(screen.getByLabelText('Lettera I: da imparare')).toHaveAttribute('data-state', 'none');
    expect(screen.getByText('1 / 26')).toBeInTheDocument();
  });

  it('writes the letters in the style chosen by the parents', () => {
    setup({ textStyle: 'lower' });
    expect(screen.getByLabelText('Lettera B: da imparare')).toHaveTextContent('b');
  });
});

describe('GoalsPanel - word diary', () => {
  it('opens the diary from the card and closes it again', () => {
    setup({ readWords: [READING_WORDS[0].word] });
    expect(screen.getByText(`1 / ${READING_WORDS.length} parole lette`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Il mio diario/ }));
    const dialog = screen.getByRole('dialog', { name: /diario delle parole/ });
    expect(dialog.querySelectorAll('[data-read="true"]')).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('GoalsPanel - certificates', () => {
  it('counts down to the first certificate', () => {
    setup({ masteredLetters: ids(3) });
    expect(screen.getByText('Ancora 2 lettere al prossimo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Attestato/ })).not.toBeInTheDocument();
  });

  it('offers a certificate for every 5 letters learned and opens it to print', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    setup({ masteredLetters: ids(10), name: 'Sofia' });
    expect(screen.getAllByRole('button', { name: /^Attestato/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Attestato: 10 lettere imparate' }));
    const dialog = screen.getByRole('dialog', { name: /Attestato di bravura/ });
    expect(dialog).toHaveTextContent('Sofia');
    expect(dialog).toHaveTextContent('10 lettere');
    fireEvent.click(within(dialog).getByRole('button', { name: /Stampa/ }));
    expect(print).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: /Chiudi/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads the congratulation out loud', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    setup({ masteredLetters: ids(5), name: 'Sofia' });
    fireEvent.click(screen.getByRole('button', { name: /^Attestato/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta il messaggio' }));
    expect(speak).toHaveBeenCalledWith(expect.stringContaining('Sofia'), 0.9, 1.1);
  });

  it('says so when they are all earned', () => {
    setup({ masteredLetters: ids(26) });
    expect(screen.getByText('Li hai presi tutti!')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Attestato/ })).toHaveLength(6);
  });
});

describe('GoalsPanel - voice', () => {
  it('summarises the goals out loud', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    setup({ masteredLetters: ids(4), readWords: ['CASA', 'LUNA'] });
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta i traguardi' }));
    expect(speak).toHaveBeenCalledWith(expect.stringMatching(/4 lettere.*2 parole/), 0.9, 1.1);
  });
});

describe('HomeScreen', () => {
  it('shows the goals under the two subjects and a speaker on each subject card', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<HomeScreen progress={INITIAL_PROGRESS} onChooseSection={vi.fn()} onOpenAlbum={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'I miei traguardi' })).toBeInTheDocument();
    const speakers = screen.getAllByRole('button', { name: 'Ascolta la descrizione' });
    expect(speakers).toHaveLength(2);
    fireEvent.click(speakers[0]);
    expect(speak).toHaveBeenCalledWith(expect.stringContaining('Italiano'), 0.9, 1.1);
  });

  it('keeps the descriptions short (they are also read out loud)', () => {
    render(<HomeScreen progress={INITIAL_PROGRESS} onChooseSection={vi.fn()} onOpenAlbum={vi.fn()} />);
    for (const card of [screen.getByRole('button', { name: /Italiano/ }), screen.getByRole('button', { name: /Matematica/ })]) {
      const description = card.querySelector('p')!.textContent!;
      expect(description.split(/\s+/).length).toBeLessThanOrEqual(8);
    }
  });

  it('lets the child choose a subject', () => {
    const onChooseSection = vi.fn();
    vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<HomeScreen progress={INITIAL_PROGRESS} onChooseSection={onChooseSection} onOpenAlbum={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Matematica/ }));
    expect(onChooseSection).toHaveBeenCalledWith('math');
  });
});
