import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileModal } from '../../src/components/ProfileModal';
import { INITIAL_PROGRESS } from '../../src/data/alphabet';
import { createInitialUsage, recordEvent, addActiveTime } from '../../src/state/usage';

function setup(overrides: Partial<React.ComponentProps<typeof ProfileModal>> = {}) {
  const props = {
    progress: { ...INITIAL_PROGRESS },
    usage: createInitialUsage(),
    storageOk: true,
    persistent: false,
    onExport: vi.fn(() => '{"app":"alfabimbi"}'),
    onImport: vi.fn(() => ({ ok: true as const })),
    onClose: vi.fn(),
    onUpdateProfile: vi.fn(),
    onResetProgress: vi.fn(),
    ...overrides,
  };
  render(<ProfileModal {...props} />);
  return props;
}

describe('ProfileModal', () => {
  it('is an accessible dialog that closes with Escape and the close button', () => {
    const { onClose } = setup();
    expect(screen.getByRole('dialog', { name: /Profilo/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('saves the trimmed name and chosen avatar', () => {
    const { onUpdateProfile, onClose } = setup();
    fireEvent.change(screen.getByLabelText(/Nome della piccola campionessa/), { target: { value: '  Elisa  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Avatar 🦄' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva Profilo' }));
    expect(onUpdateProfile).toHaveBeenCalledWith('Elisa', '🦄');
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to a default name when saved empty', () => {
    const { onUpdateProfile } = setup();
    fireEvent.change(screen.getByLabelText(/Nome della piccola campionessa/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva Profilo' }));
    expect(onUpdateProfile).toHaveBeenCalledWith('Campionessa', INITIAL_PROGRESS.avatar);
  });

  it('shows usage statistics', () => {
    let usage = addActiveTime(createInitialUsage(), 3725, 'words', Date.now());
    usage = { ...usage, sessions: 7 };
    usage = recordEvent(usage, 'quiz_correct', Date.now());
    usage = recordEvent(usage, 'spelling_completed', Date.now());
    setup({ usage });
    const stats = screen.getByTestId('usage-stats');
    expect(stats).toHaveTextContent('1 h 02 min');
    expect(stats).toHaveTextContent('7');
    expect(stats).toHaveTextContent('Risposte giuste');
    expect(stats.textContent).toMatch(/Risposte giuste\s*2/);
  });

  it('warns when automatic saving is unavailable', () => {
    setup({ storageOk: false });
    expect(screen.getByRole('alert')).toHaveTextContent(/salvataggio automatico non è disponibile/i);
  });

  it('does not warn when storage works', () => {
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('requires confirmation before resetting', () => {
    const { onResetProgress, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Azzera progressi/ }));
    expect(onResetProgress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(onResetProgress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Azzera progressi/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sì, azzera/ }));
    expect(onResetProgress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('downloads a backup', () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clicked: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    const { onExport } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Scarica backup/ }));
    expect(onExport).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(clicked[0]).toMatch(/^alfabimbi-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(screen.getByRole('status')).toHaveTextContent('Backup scaricato');
    click.mockRestore();
  });

  const file = (text: string) => new File([text], 'backup.json', { type: 'application/json' });

  it('restores a valid backup and closes', async () => {
    const { onImport, onClose } = setup();
    fireEvent.change(screen.getByTestId('import-input'), { target: { files: [file('{"x":1}')] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledWith('{"x":1}'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows the error for an invalid backup and stays open', async () => {
    const onImport = vi.fn(() => ({ ok: false as const, error: 'Il file non è un backup di Alfabimbi.' }));
    const { onClose } = setup({ onImport });
    fireEvent.change(screen.getByTestId('import-input'), { target: { files: [file('zzz')] } });
    expect(await screen.findByRole('status')).toHaveTextContent('non è un backup');
    expect(onClose).not.toHaveBeenCalled();
  });
});
