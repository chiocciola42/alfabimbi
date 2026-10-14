import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BubbleGame } from '../../src/components/BubbleGame';
import { ALPHABET_DATA } from '../../src/data/alphabet';

const target = ALPHABET_DATA[0]; // 'A'

function bubblesOf(letter: string) {
  return screen
    .queryAllByRole('button')
    .filter((b) => b.textContent === letter && b.className.includes('rounded-full'));
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('BubbleGame', () => {
  it('starts with the letter chosen in the explorer (not a random one)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(<BubbleGame letters={ALPHABET_DATA} onRewardStars={vi.fn()} preferredLetter={ALPHABET_DATA[5]} />);
    expect(screen.getByText(/Trova e scoppia la lettera/)).toHaveTextContent(`lettera ${ALPHABET_DATA[5].letter} (`);
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
  });

  it('spawns bubbles over time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<BubbleGame letters={ALPHABET_DATA} onRewardStars={vi.fn()} preferredLetter={target} />);
    expect(bubblesOf('A')).toHaveLength(0);
    advance(1000);
    expect(bubblesOf('A').length).toBeGreaterThan(0);
  });

  it('awards 5 stars and completes the level after five correct bubbles', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // every bubble carries the target letter
    const onRewardStars = vi.fn();
    const onCompleteLevel = vi.fn();
    render(
      <BubbleGame letters={ALPHABET_DATA} onRewardStars={onRewardStars} onCompleteLevel={onCompleteLevel} preferredLetter={target} />
    );
    for (let i = 0; i < 5; i++) {
      advance(900);
      const bubble = bubblesOf('A')[0];
      expect(bubble).toBeDefined();
      fireEvent.click(bubble);
    }
    expect(onRewardStars).toHaveBeenCalledTimes(1);
    expect(onRewardStars).toHaveBeenCalledWith(5);
    expect(onCompleteLevel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Bravissima!')).toBeInTheDocument();
  });

  it('does not count wrong letters', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // spawns letters[25], never the target
    const onRewardStars = vi.fn();
    render(<BubbleGame letters={ALPHABET_DATA} onRewardStars={onRewardStars} preferredLetter={target} />);
    advance(1000);
    const wrongLetter = ALPHABET_DATA[25].letter;
    fireEvent.click(bubblesOf(wrongLetter)[0]);
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
    expect(onRewardStars).not.toHaveBeenCalled();
  });

  it('rewards only once even if bubbles are tapped repeatedly after the win', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onRewardStars = vi.fn();
    render(<BubbleGame letters={ALPHABET_DATA} onRewardStars={onRewardStars} preferredLetter={target} />);
    advance(900);
    const burst = bubblesOf('A');
    for (let i = 0; i < 5; i++) {
      advance(900);
      fireEvent.click(bubblesOf('A')[0]);
    }
    burst.forEach((b) => fireEvent.click(b));
    expect(onRewardStars).toHaveBeenCalledTimes(1);
  });

  it('"Gioca ancora" restarts the round with the same letter, "Nuova Lettera" changes it', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<BubbleGame letters={ALPHABET_DATA} onRewardStars={vi.fn()} preferredLetter={target} />);
    for (let i = 0; i < 5; i++) {
      advance(900);
      fireEvent.click(bubblesOf('A')[0]);
    }
    fireEvent.click(screen.getByRole('button', { name: /Gioca ancora con A/ }));
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
    expect(screen.queryByText('Bravissima!')).not.toBeInTheDocument();

    for (let i = 0; i < 5; i++) {
      advance(900);
      fireEvent.click(bubblesOf('A')[0]);
    }
    rnd.mockReturnValue(0.3);
    fireEvent.click(screen.getByRole('button', { name: /Nuova Lettera/ }));
    expect(screen.getByText(/Trova e scoppia la lettera/)).not.toHaveTextContent('lettera A (');
    expect(screen.getByText('0 / 5')).toBeInTheDocument();
  });

  it('stops animating when unmounted', () => {
    const { unmount } = render(<BubbleGame letters={ALPHABET_DATA} onRewardStars={vi.fn()} preferredLetter={target} />);
    unmount();
    expect(() => advance(5000)).not.toThrow();
  });
});
