import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MathLab } from '../../src/components/MathLab';
import { MathLevelComplete } from '../../src/components/MathLevelComplete';
import { MathMap } from '../../src/components/MathMap';
import { MathQuiz, optionGridClass } from '../../src/components/MathQuiz';
import { INITIAL_PROGRESS } from '../../src/data/alphabet';
import { MAX_QUESTION_CHOICES, limitChoices } from '../../src/math/random';
import { MATH_LEVEL_COUNT, WORLDS, findLevel } from '../../src/math/worlds';
import { sound } from '../../src/utils/sound';

/** Every control a child taps must be at least 56px (h-14 / w-14 / min-h-14 or bigger). */
const BIG = /\bmin-h-14\b|\bh-14\b|\bh-16\b|\bh-20\b|\bh-24\b|\bmin-h-28\b/;
const tooSmall = (except: RegExp = /^$/) =>
  screen
    .getAllByRole('button')
    .filter((b) => !BIG.test(b.className) && !except.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))
    .map((b) => b.getAttribute('aria-label') ?? b.textContent ?? b.className);

afterEach(() => vi.restoreAllMocks());

describe('limitChoices', () => {
  it('keeps short lists untouched', () => {
    expect(limitChoices<string | number>([1, 2, 3], 2)).toEqual([1, 2, 3]);
    expect(limitChoices<string | number>(['Sinistra', 'Destra'], 'Destra')).toEqual(['Sinistra', 'Destra']);
  });

  it('reduces to three choices, always keeping the right one and the original order', () => {
    for (let i = 0; i < 100; i++) {
      const out = limitChoices<string | number>([4, 7, 9, 2, 5], 9);
      expect(out).toHaveLength(MAX_QUESTION_CHOICES);
      expect(out).toContain(9);
      expect(out).toEqual([4, 7, 9, 2, 5].filter((n) => out.includes(n)));
    }
  });

  it('matches the answer like the quiz does (text, case and spaces ignored)', () => {
    expect(limitChoices<string | number>(['>', '<', '=', '≠'], ' = ')).toContain('=');
    expect(limitChoices<string | number>([1, 2, 3, 4], '3', 2)).toContain(3);
  });

  it('is repeatable with a given random source and copes with a missing answer', () => {
    expect(limitChoices<string | number>([1, 2, 3, 4, 5], 3, 3, () => 0)).toEqual(limitChoices<string | number>([1, 2, 3, 4, 5], 3, 3, () => 0));
    expect(limitChoices<string | number>([1, 2, 3, 4], 99)).toEqual([1, 2, 3]);
  });
});

describe('optionGridClass', () => {
  it('puts three short answers on one row and stacks long ones on a phone', () => {
    expect(optionGridClass([1, 2, 3])).toBe('grid-cols-3');
    expect(optionGridClass(['Sinistra', 'Destra'])).toBe('grid-cols-2');
    expect(optionGridClass(['Molto lungo', 'B', 'C'])).toBe('grid-cols-1 sm:grid-cols-3');
  });
});

describe('MathQuiz', () => {
  it('shows at most three answers on every level, each a big target', () => {
    for (let id = 1; id <= MATH_LEVEL_COUNT; id += 4) {
      const { unmount } = render(<MathQuiz level={findLevel(id)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
      const answers = screen.queryAllByRole('button').filter((b) => b.className.includes('rounded-2xl border-2') && b.querySelector('.font-mono'));
      expect(answers.length, `level ${id}`).toBeLessThanOrEqual(MAX_QUESTION_CHOICES);
      answers.forEach((b) => expect(b.className).toMatch(/h-16/));
      unmount();
    }
  });

  it('has only big buttons on a level', () => {
    render(<MathQuiz level={findLevel(1)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
    expect(tooSmall()).toEqual([]);
  });
});

describe('MathMap', () => {
  it('has big buttons and reads the mascot and the world out loud', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<MathMap progress={INITIAL_PROGRESS} onSelectLevel={vi.fn()} />);
    expect(tooSmall()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta il saluto' }));
    expect(speak).toHaveBeenLastCalledWith(WORLDS[0].mascotGreeting, 0.9, 1.1);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta il mondo' }));
    expect(speak).toHaveBeenLastCalledWith(expect.stringContaining(WORLDS[0].title), 0.9, 1.1);
  });

  it('plays every level of the first world only once the parents unlock them', () => {
    const { rerender } = render(<MathMap progress={INITIAL_PROGRESS} onSelectLevel={vi.fn()} />);
    const playable = () => screen.queryAllByRole('button', { name: /^Gioca il livello/ }).length;
    const levels = WORLDS[0].levels.length;
    expect(playable()).toBeLessThan(levels);
    rerender(<MathMap progress={{ ...INITIAL_PROGRESS, allLevelsUnlocked: true }} onSelectLevel={vi.fn()} />);
    expect(playable()).toBe(levels);
  });
});

describe('MathLab', () => {
  it('has only big buttons, also after switching tool', () => {
    render(<MathLab />);
    expect(tooSmall()).toEqual([]);
    for (const tool of [/Linea|Ranocchia/, /Amici del 10|10/, /Monet/, /Rekenrek/, /Bilancia/]) {
      const tab = screen.queryAllByRole('button').find((b) => tool.test(b.textContent ?? '') && b.className.includes('rounded-lg'));
      if (tab) fireEvent.click(tab);
      // the points of the number line and the beads of the rekenrek are a scale to slide along: they stay compact
      expect(tooSmall(/^(🐸)?\d+$|perlina/), String(tool)).toEqual([]);
    }
  });
});

describe('MathLevelComplete', () => {
  it('has big buttons', () => {
    vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(
      <MathLevelComplete
        stars={3}
        correctCount={5}
        totalQuestions={5}
        rewardStars={10}
        hasNextLevel
        onNextLevel={vi.fn()}
        onReplay={vi.fn()}
        onBackToMap={vi.fn()}
        onGoToStickers={vi.fn()}
      />
    );
    expect(tooSmall()).toEqual([]);
  });
});
