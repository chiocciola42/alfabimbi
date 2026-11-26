import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SyllableText } from '../../src/components/SyllableText';
import { WordDiary } from '../../src/components/WordDiary';
import { READING_WORDS } from '../../src/data/readingWords';
import { sound } from '../../src/utils/sound';

afterEach(() => vi.restoreAllMocks());

describe('WordDiary', () => {
  it('has a page for every word: a picture for the ones read, a question mark for the others', () => {
    render(<WordDiary readWords={['CASA', 'LUNA']} textStyle="upper" onClose={vi.fn()} />);
    const items = screen.getByTestId('diary-grid').querySelectorAll('li');
    expect(items).toHaveLength(READING_WORDS.length);
    expect(screen.getByTestId('diary-grid').querySelectorAll('[data-read="true"]')).toHaveLength(2);
    expect(screen.getAllByLabelText('Parola ancora da leggere')).toHaveLength(READING_WORDS.length - 2);
    const bar = screen.getByRole('progressbar', { name: 'Parole lette' });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', String(READING_WORDS.length));
  });

  it('lets the child listen to a word she has read', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<WordDiary readWords={['CASA']} textStyle="lower" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta casa' }));
    expect(speak).toHaveBeenCalledWith('casa', 0.85, 1.1);
  });

  it('says how many words were read out loud', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<WordDiary readWords={['CASA']} textStyle="upper" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta quante parole hai letto' }));
    expect(speak).toHaveBeenCalledWith(`Hai letto 1 parole su ${READING_WORDS.length}!`, 0.9, 1.1);
  });

  it('closes with the button and with Escape', async () => {
    const onClose = vi.fn();
    render(<WordDiary readWords={[]} textStyle="upper" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    // Esc: il browser chiude il <dialog> nativo e avvisa con l'evento "close".
    act(() => (screen.getByRole('dialog') as HTMLDialogElement).close());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });
});

describe('SyllableText', () => {
  it('colours each syllable differently and exposes the whole word', () => {
    render(<SyllableText syllables={['CA', 'SA']} textStyle="upper" />);
    const word = screen.getByRole('img', { name: 'CASA' });
    const [a, b] = Array.from(word.querySelectorAll('span'));
    expect(a.className).not.toBe(b.className);
    expect(a.className).toMatch(/text-/);
  });

  it('highlights the syllable being read', () => {
    const { rerender } = render(<SyllableText syllables={['CA', 'SA']} textStyle="upper" activeIndex={1} />);
    expect(document.querySelector('[data-active="true"]')?.textContent).toBe('SA');
    rerender(<SyllableText syllables={['CA', 'SA']} textStyle="upper" activeIndex={null} />);
    expect(document.querySelector('[data-active="true"]')).toBeNull();
  });

  it('follows the text style', () => {
    render(<SyllableText syllables={['CA', 'SA']} textStyle="cursive" />);
    expect(screen.getByRole('img', { name: 'casa' }).className).toContain('font-cursive');
  });
});
