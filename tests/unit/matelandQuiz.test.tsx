import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MathQuiz } from '../../src/components/MathQuiz';
import * as generator from '../../src/math/questionGenerator';
import { makeTenGap, makeTenRest, makeTenTotal, matchQuantity, numberToGroup, secretMessage } from '../../src/math/matelandGenerators';
import { findLevel } from '../../src/math/worlds';

afterEach(() => vi.restoreAllMocks());

const BIG = /\bmin-h-14\b|\bh-14\b|\bh-16\b|\bh-20\b|\bh-24\b|\bmin-h-28\b/;

describe('Mateland generators', () => {
  it('make-ten questions have a consistent answer', () => {
    for (let i = 0; i < 200; i++) {
      const gap = makeTenGap('x');
      if (gap.visual?.kind !== 'make_ten') throw new Error('missing visual');
      expect(gap.correctAnswer).toBe(10 - gap.visual.a);

      const rest = makeTenRest('x');
      if (rest.visual?.kind !== 'make_ten') throw new Error('missing visual');
      expect(rest.correctAnswer).toBe(rest.visual.b - (10 - rest.visual.a));

      const total = makeTenTotal('x');
      if (total.visual?.kind !== 'make_ten') throw new Error('missing visual');
      expect(total.correctAnswer).toBe(total.visual.a + total.visual.b);
      expect(total.visual.a + total.visual.b).toBeGreaterThan(10);
    }
  });

  it('match questions pair every number with a group of that size', () => {
    for (let i = 0; i < 100; i++) {
      const q = matchQuantity(10)('x');
      expect(q.matchNumbers).toHaveLength(3);
      expect(new Set(q.matchGroups?.map((g) => g.value))).toEqual(new Set(q.matchNumbers));
    }
  });

  it('number-to-group answers have as many emoji as the number', () => {
    for (let i = 0; i < 100; i++) {
      const q = numberToGroup('x');
      expect([...String(q.correctAnswer)]).toHaveLength(q.numberA!);
    }
  });

  it('secret messages spell the word when the numbers are ordered', () => {
    for (let i = 0; i < 100; i++) {
      const q = secretMessage('x');
      const sorted = [...q.orderItems!].sort((a, b) => (q.orderDescending ? b - a : a - b));
      const word = sorted.map((n) => q.orderLetters![n]).join('');
      expect(q.explanation).toContain(word);
    }
  });
});

describe('Mateland quiz', () => {
  it('links numbers to groups and completes the question', () => {
    vi.spyOn(generator, 'generateLevelQuestions').mockReturnValue([matchQuantity(6)('q1')]);
    render(<MathQuiz level={findLevel(47)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
    const q = generator.generateLevelQuestions(47, 1)[0];
    for (const n of q.matchNumbers!) {
      fireEvent.click(screen.getByRole('button', { name: `Numero ${n}` }));
      const group = screen
        .getAllByRole('button', { name: 'Gruppo di oggetti' })
        .find((b) => b.querySelectorAll('span').length === n)!;
      fireEvent.click(group);
    }
    expect(screen.getByText(/Risposta Corretta/)).toBeTruthy();
  });

  it('marks the question wrong when a number is linked to the wrong group', () => {
    vi.spyOn(generator, 'generateLevelQuestions').mockReturnValue([matchQuantity(6)('q1')]);
    render(<MathQuiz level={findLevel(47)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
    const q = generator.generateLevelQuestions(47, 1)[0];
    const n = q.matchNumbers![0];
    fireEvent.click(screen.getByRole('button', { name: `Numero ${n}` }));
    const wrong = screen.getAllByRole('button', { name: 'Gruppo di oggetti' }).find((b) => b.querySelectorAll('span').length !== n)!;
    fireEvent.click(wrong);
    expect(screen.getByText(/impariamo insieme/)).toBeTruthy();
  });

  it('shows the puzzle strip only on the puzzle level and unlocks a tile for a right answer', () => {
    vi.spyOn(generator, 'generateLevelQuestions').mockReturnValue([secretMessage('q1'), secretMessage('q2')]);
    const { unmount } = render(<MathQuiz level={findLevel(49)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
    expect(screen.getByRole('img', { name: /0 su 2/ })).toBeTruthy();
    unmount();
    render(<MathQuiz level={findLevel(48)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
    expect(screen.queryByRole('img', { name: /Tessere del puzzle/ })).toBeNull();
  });

  it('has only big buttons on every Mateland level', () => {
    for (const id of [46, 47, 48, 49, 50]) {
      for (let run = 0; run < 15; run++) {
        const { unmount } = render(<MathQuiz level={findLevel(id)!} onBackToMap={vi.fn()} onLevelComplete={vi.fn()} />);
        const small = screen
          .getAllByRole('button')
          .filter((b) => !BIG.test(b.className))
          .map((b) => b.getAttribute('aria-label') ?? b.textContent);
        expect(small, `level ${id}`).toEqual([]);
        unmount();
      }
    }
  });
});
