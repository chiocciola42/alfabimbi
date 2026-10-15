import React, { useEffect, useMemo, useState } from 'react';
import { ALPHABET_DATA } from './data/alphabet';
import { applyDailyWords, dayNumber } from './data/dailyWords';
import { LetterData, Section, TabId } from './types';
import type { Level } from './math/types';
import { findLevel } from './math/worlds';
import { MATH_QUESTIONS_PER_LEVEL, mathLevelReward } from './state/progress';
import { useProgress } from './hooks/useProgress';
import { Header } from './components/Header';
import { LetterExplorer } from './components/LetterExplorer';
import { TracingCanvas } from './components/TracingCanvas';
import { BubbleGame } from './components/BubbleGame';
import { WordMatchQuiz } from './components/WordMatchQuiz';
import { StickerAlbum } from './components/StickerAlbum';
import { ProfileModal } from './components/ProfileModal';
import { HomeScreen } from './components/HomeScreen';
import { MathMap } from './components/MathMap';
import { MathQuiz } from './components/MathQuiz';
import { MathLab } from './components/MathLab';
import { MathLevelComplete } from './components/MathLevelComplete';
import { useUsageTracker } from './hooks/useUsageTracker';
import { sound } from './utils/sound';

export default function App() {
  const {
    progress,
    usage,
    storageOk,
    persistent,
    addStars,
    markLetterTraced,
    openSurprisePack,
    claimMission,
    incrementBubbleLevel,
    incrementWordQuizRound,
    completeMathLevel,
    recordWrongAnswer,
    recordActiveTime,
    exportData,
    importData,
    updateProfile,
    toggleSound,
    toggleVoice,
    updatePlacedStickers,
    setBackground,
    resetProgress,
  } = useProgress();

  const [currentTab, setCurrentTab] = useState<TabId>('home');
  // Sezione in cui si trova la bambina: l'Album Premi è condiviso, quindi ricordiamo da dove è arrivata.
  const [section, setSection] = useState<Section>('italian');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [levelResult, setLevelResult] = useState<{ stars: number; correct: number } | null>(null);

  const goToTab = (tab: TabId) => {
    if (tab === 'explorer' || tab === 'tracing' || tab === 'bubbles' || tab === 'words') setSection('italian');
    if (tab === 'mathmap' || tab === 'lab') setSection('math');
    setCurrentLevel(null);
    setLevelResult(null);
    setCurrentTab(tab);
  };

  const handleChooseSection = (next: Section) => goToTab(next === 'italian' ? 'explorer' : 'mathmap');

  const handleLevelComplete = (stars: number, correct: number) => {
    if (!currentLevel) return;
    completeMathLevel(currentLevel.id, stars, correct);
    setLevelResult({ stars, correct });
  };

  const nextLevel = currentLevel ? findLevel(currentLevel.id + 1) : null;
  const [selectedLetterId, setSelectedLetterId] = useState<string>(ALPHABET_DATA[0].id);

  // Words rotate daily; re-evaluate when the app comes back to the foreground (e.g. the next morning).
  const [today, setToday] = useState<Date>(() => new Date());
  useEffect(() => {
    const refresh = () => setToday((prev) => {
      const now = new Date();
      return dayNumber(now) === dayNumber(prev) ? prev : now;
    });
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const letters = useMemo(() => applyDailyWords(ALPHABET_DATA, today), [today]);
  const selectedLetter = letters.find((l) => l.id === selectedLetterId) ?? letters[0];
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  useUsageTracker(currentTab, recordActiveTime);

  // Switch to Tracing Canvas for a specific letter
  const handleSelectLetterToTrace = (letter: LetterData) => {
    setSelectedLetterId(letter.id);
    setCurrentTab('tracing');
    sound.playClick();
  };

  // Switch to Bubble Game with a specific letter
  const handlePlayGameWithLetter = (letter: LetterData) => {
    setSelectedLetterId(letter.id);
    setCurrentTab('bubbles');
    sound.playClick();
  };

  // Letter navigation in Tracing mode
  const currentLetterIdx = letters.findIndex((l) => l.id === selectedLetter.id);
  const handleNextLetter = () => {
    const nextIdx = (currentLetterIdx + 1) % letters.length;
    setSelectedLetterId(letters[nextIdx].id);
    sound.playClick();
  };

  const handlePrevLetter = () => {
    const prevIdx =
      (currentLetterIdx - 1 + letters.length) % letters.length;
    setSelectedLetterId(letters[prevIdx].id);
    sound.playClick();
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#FFFBEB]/60 text-slate-800 font-sans select-none">
      {/* Universal Header with Top Bar contract */}
      <Header
        currentTab={currentTab}
        section={currentTab === 'home' ? null : section}
        onSelectTab={(tab: TabId) => {
          goToTab(tab);
          sound.playClick();
        }}
        progress={progress}
        onOpenProfile={() => setIsProfileOpen(true)}
        onToggleSound={toggleSound}
        onToggleVoice={toggleVoice}
      />

      {/* Main Active View */}
      <main className="flex-1 pb-8 xl:pb-16">
        {currentTab === 'home' && (
          <HomeScreen
            progress={progress}
            onChooseSection={handleChooseSection}
            onOpenAlbum={() => goToTab('stickers')}
          />
        )}

        {currentTab === 'mathmap' &&
          (currentLevel ? (
            <MathQuiz
              key={`${currentLevel.id}-${playKey}`}
              level={currentLevel}
              onBackToMap={() => goToTab('mathmap')}
              onLevelComplete={handleLevelComplete}
            />
          ) : (
            <MathMap progress={progress} onSelectLevel={setCurrentLevel} />
          ))}

        {currentTab === 'lab' && <MathLab />}

        {currentTab === 'explorer' && (
          <LetterExplorer
            letters={letters}
            masteredLetters={progress.masteredLetters}
            tracedUppercase={progress.tracedUppercase}
            tracedLowercase={progress.tracedLowercase}
            onSelectLetterToTrace={handleSelectLetterToTrace}
            onPlayGameWithLetter={handlePlayGameWithLetter}
          />
        )}

        {currentTab === 'tracing' && (
          <TracingCanvas
            letter={selectedLetter}
            onLetterComplete={markLetterTraced}
            onNextLetter={handleNextLetter}
            onPrevLetter={handlePrevLetter}
            isCompletedUppercase={progress.tracedUppercase.includes(selectedLetter.id)}
            isCompletedLowercase={progress.tracedLowercase.includes(selectedLetter.id)}
          />
        )}

        {currentTab === 'bubbles' && (
          <BubbleGame
            letters={letters}
            onRewardStars={addStars}
            onCompleteLevel={incrementBubbleLevel}
            preferredLetter={selectedLetter}
          />
        )}

        {currentTab === 'words' && (
          <WordMatchQuiz
            letters={letters}
            onRewardStars={addStars}
            onCompleteRound={incrementWordQuizRound}
            onWrongAnswer={recordWrongAnswer}
          />
        )}

        {currentTab === 'stickers' && (
          <StickerAlbum
            unlockedStickers={progress.unlockedStickers}
            placedStickers={progress.placedStickers}
            currentStars={progress.stars}
            onUpdatePlacedStickers={updatePlacedStickers}
            currentBackground={progress.currentBackground}
            onSetBackground={setBackground}
            onOpenPack={openSurprisePack}
            childName={progress.name}
            avatar={progress.avatar}
            masteredCount={progress.masteredLetters.length}
            lettersTracedCount={progress.lettersTracedCount || progress.tracedUppercase.length}
            completedBubbleLevels={progress.completedBubbleLevels}
            completedWordQuizRounds={progress.completedWordQuizRounds}
            completedMathLevels={progress.completedMathLevels}
            claimedMissionIds={progress.claimedMissionIds || []}
            onClaimMission={claimMission}
          />
        )}
      </main>

      {/* Footer / Parental encouragement */}
      <footer className="py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] xl:pb-4 border-t border-amber-200/60 bg-white/70 text-center text-xs text-amber-900/70">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Alfabimbi · Imparare l'italiano e la matematica con amore e gioco
          </span>
          <span className="font-semibold text-amber-800">
            Per {progress.name} {progress.avatar} · {progress.stars} stelle raccolte · {progress.unlockedStickers.length} figurine
          </span>
        </div>
      </footer>

      {/* Fine livello di matematica */}
      {currentLevel && levelResult && (
        <MathLevelComplete
          stars={levelResult.stars}
          correctCount={levelResult.correct}
          totalQuestions={MATH_QUESTIONS_PER_LEVEL}
          rewardStars={mathLevelReward(levelResult.stars)}
          hasNextLevel={nextLevel !== null}
          onNextLevel={() => {
            setLevelResult(null);
            setCurrentLevel(nextLevel);
          }}
          onReplay={() => {
            setLevelResult(null);
            setPlayKey((k) => k + 1);
          }}
          onBackToMap={() => goToTab('mathmap')}
          onGoToStickers={() => goToTab('stickers')}
        />
      )}

      {/* Child Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          progress={progress}
          usage={usage}
          storageOk={storageOk}
          persistent={persistent}
          onExport={exportData}
          onImport={importData}
          onClose={() => setIsProfileOpen(false)}
          onUpdateProfile={updateProfile}
          onResetProgress={resetProgress}
        />
      )}
    </div>
  );
}
