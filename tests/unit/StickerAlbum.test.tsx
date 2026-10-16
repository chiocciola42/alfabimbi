import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StickerAlbum } from '../../src/components/StickerAlbum';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';

function setup(overrides: Partial<React.ComponentProps<typeof StickerAlbum>> = {}) {
  const props: React.ComponentProps<typeof StickerAlbum> = {
    unlockedStickers: INITIAL_PROGRESS.unlockedStickers,
    placedStickers: INITIAL_PROGRESS.placedStickers,
    currentStars: 12,
    onUpdatePlacedStickers: vi.fn(),
    currentBackground: 'meadow',
    onSetBackground: vi.fn(),
    onOpenPack: vi.fn(() => []),
    childName: 'Sofia',
    avatar: '👧',
    masteredCount: 1,
    lettersTracedCount: 1,
    completedBubbleLevels: 1,
    completedWordQuizRounds: 2,
    completedMathLevels: 0,
    claimedMissionIds: [],
    onClaimMission: vi.fn(),
    ...overrides,
  };
  render(<StickerAlbum {...props} />);
  return props;
}

describe('StickerAlbum', () => {
  it('shows the collection counter and star treasury', () => {
    setup();
    expect(screen.getByText(`${INITIAL_PROGRESS.unlockedStickers.length} / ${STICKERS_CATALOG.length}`)).toBeInTheDocument();
    expect(screen.getByText(/Il Regno delle Figurine di Sofia/)).toBeInTheDocument();
  });

  it('pastes an unlocked sticker on the board', () => {
    // Il progresso iniziale non ha figurine sbloccate: ne passiamo una del primo album.
    const { onUpdatePlacedStickers } = setup({ unlockedStickers: ['stk_1'] });
    fireEvent.click(screen.getAllByRole('button', { name: /Incolla sulla Scena/ })[0]);
    expect(onUpdatePlacedStickers).toHaveBeenCalledTimes(1);
    const next = (onUpdatePlacedStickers as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(next).toHaveLength(INITIAL_PROGRESS.placedStickers.length + 1);
  });

  describe('surprise pack', () => {
    const openPackTab = () => fireEvent.click(screen.getByRole('button', { name: /Apri la Bustina Magica/ }));

    it('is disabled / refused without 15 stars', () => {
      const { onOpenPack } = setup({ currentStars: 14 });
      openPackTab();
      const open = screen.getByRole('button', { name: /Apri Bustina/ });
      expect(open).toBeDisabled();
      fireEvent.click(open);
      expect(onOpenPack).not.toHaveBeenCalled();
    });

    it('opens a pack at 15 stars and lets the child reveal the three cards', () => {
      const drawn = STICKERS_CATALOG.slice(0, 3);
      const onOpenPack = vi.fn(() => drawn);
      setup({ currentStars: 15, onOpenPack });
      openPackTab();
      fireEvent.click(screen.getByRole('button', { name: /Apri Bustina/ }));
      expect(onOpenPack).toHaveBeenCalledWith(15);
      expect(screen.queryByText(drawn[0].name)).not.toBeInTheDocument(); // face-down until tapped
      screen.getAllByText('Tocca per girare!').forEach((hint) => fireEvent.click(hint));
      for (const card of drawn) expect(screen.getAllByText(card.name).length).toBeGreaterThan(0);
    });
  });

  describe('missions', () => {
    const openMissions = () => fireEvent.click(screen.getByRole('button', { name: /Missioni del Giorno/ }));

    it('lets the child claim a completed mission', () => {
      const { onClaimMission } = setup({ completedWordQuizRounds: 2, lettersTracedCount: 2 });
      openMissions();
      const claims = screen.getAllByRole('button', { name: /Riscatta/ });
      expect(claims.length).toBeGreaterThanOrEqual(2);
      fireEvent.click(claims[0]);
      expect(onClaimMission).toHaveBeenCalledWith('m_trace', 10);
    });

    it('rewards completed levels of the math section too', () => {
      const { onClaimMission } = setup({ completedMathLevels: 2, completedWordQuizRounds: 0, lettersTracedCount: 0 });
      openMissions();
      fireEvent.click(screen.getByRole('button', { name: /Riscatta/ }));
      expect(onClaimMission).toHaveBeenCalledWith('m_math', 10);
    });

    it('shows already claimed missions as redeemed', () => {
      setup({ lettersTracedCount: 2, claimedMissionIds: ['m_trace'] });
      openMissions();
      expect(screen.getByText('Premio Riscattato!')).toBeInTheDocument();
    });

    it('keeps incomplete missions in progress', () => {
      setup({ lettersTracedCount: 0, completedBubbleLevels: 0, completedWordQuizRounds: 0, currentStars: 0 });
      openMissions();
      expect(screen.queryByRole('button', { name: /Riscatta/ })).not.toBeInTheDocument();
      expect(screen.getAllByText(/In corso/)).toHaveLength(6);
    });
  });

  it('changes the scene background', () => {
    const { onSetBackground } = setup();
    fireEvent.click(screen.getByRole('button', { name: /La Mia Scena delle Figurine/ }));
    fireEvent.click(screen.getByRole('button', { name: /Spazio Galattico/ }));
    expect(onSetBackground).toHaveBeenCalledWith('space');
  });
});
