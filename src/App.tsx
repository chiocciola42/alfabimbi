import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ALPHABET_DATA } from './data/alphabet';
import { applyDailyWords, dayNumber } from './data/dailyWords';
import { LetterData, Section, StickerItem, TabId } from './types';
import type { Level } from './math/types';
import { findLevel } from './math/worlds';
import { MATH_QUESTIONS_PER_LEVEL, TRACE_REWARD_STARS, mathLevelReward } from './state/progress';
import { pendingCityRewards } from './state/world';
import { ISLANDS, findCity, findIsland, findIslandBySection, parentCityId } from './world';
import type { CityDef, GameDef } from './world';
import { IslandView, frontierCityId } from './components/IslandView';
import { CityRewardModal } from './components/CityRewardModal';
import { supportsWebGL } from './world3d/webgl';
import { useProgress } from './hooks/useProgress';
import { Header } from './components/Header';
import { LetterExplorer } from './components/LetterExplorer';
import { TracingCanvas } from './components/TracingCanvas';
import { BubbleGame } from './components/BubbleGame';
import { WordMatchQuiz } from './components/WordMatchQuiz';
import { ReadingGame } from './components/ReadingGame';
import { ItalianPractice } from './components/ItalianPractice';
import { StickerAlbum } from './components/StickerAlbum';
import { ProfileModal } from './components/ProfileModal';
import { HomeScreen } from './components/HomeScreen';
import { MathQuiz } from './components/MathQuiz';
import { MathLab } from './components/MathLab';
import { RepeatInstructionButton } from './components/RepeatInstructionButton';
import { MathLevelComplete } from './components/MathLevelComplete';
import { EnglishListen } from './components/EnglishListen';
import { EnglishAlphabet } from './components/EnglishAlphabet';
import { EnglishRead } from './components/EnglishRead';
import { EnglishWrite } from './components/EnglishWrite';
import { EnglishStories } from './components/EnglishStories';
import { useUsageTracker } from './hooks/useUsageTracker';
import { sound } from './utils/sound';

/** La città che si apre quando si supera `city` (la prima che ha questa come genitore). */
function nextCityNameAfter(city: CityDef): string | undefined {
  const found = findCity(city.id);
  if (!found) return undefined;
  return found.island.cities.find((c, i) => parentCityId(found.island, i) === city.id)?.name;
}

const StageRoot = lazy(() => import('./world3d/stage/StageRoot'));
const WEBGL_OK = supportsWebGL();

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
    recordWordRead,
    recordSyllable,
    recordEnglishWord,
    recordEnglishLetter,
    recordEnglishFamilyWord,
    recordEnglishSightWord,
    recordEnglishLetterTraced,
    recordEnglishWordSpelled,
    recordEnglishStoryRead,
    setTextStyle,
    submitAccessCode,
    recordWrongAnswer,
    creditCity,
    claimCityReward,
    recordActiveTime,
    exportData,
    importData,
    updateProfile,
    toggleSound,
    toggleVoice,
    toggleGraphics3d,
    updatePlacedStickers,
    setBackground,
    resetProgress,
  } = useProgress();

  const [currentTab, setCurrentTab] = useState<TabId>('home');
  // Isola in cui si trova la bambina: l'Album Premi è condiviso, quindi ricordiamo da dove è arrivata.
  const [islandId, setIslandId] = useState<string>(ISLANDS[0].id);
  // Città in cui si trova (o in cui sta giocando) e se la sua scheda è aperta.
  const [cityId, setCityId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reward, setReward] = useState<{ city: CityDef; sticker?: StickerItem } | null>(null);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [levelResult, setLevelResult] = useState<{ stars: number; correct: number } | null>(null);

  const island = findIsland(islandId) ?? ISLANDS[0];
  const section: Section = island.section;
  const standingCityId = cityId ?? frontierCityId(island, progress);
  const activeCity = findCity(standingCityId)?.city;

  const goToTab = (tab: TabId) => {
    setCurrentLevel(null);
    setLevelResult(null);
    if (tab === 'island') setPanelOpen(false);
    setCurrentTab(tab);
  };

  const handleChooseSection = (next: Section) => {
    setIslandId(findIslandBySection(next).id);
    setCityId(null);
    setPanelOpen(false);
    goToTab('island');
  };

  const handleSelectCity = (id: string) => {
    setCityId(id);
    setPanelOpen(true);
  };

  /** Si apre un gioco della città: da qui in poi le stelle guadagnate contano per quella città. */
  const handlePlayGame = (id: string, game: GameDef) => {
    setCityId(id);
    setPanelOpen(false);
    setLevelResult(null);
    if (game.levelId !== undefined) setCurrentLevel(findLevel(game.levelId) ?? null);
    else setCurrentLevel(null);
    setCurrentTab(game.tab);
  };

  const backToCity = () => {
    setCurrentLevel(null);
    setLevelResult(null);
    setPanelOpen(true);
    setCurrentTab('island');
  };

  /** Stelle di un gioco: vanno nel totale e anche nella città in cui si sta giocando. */
  const rewardStars = (count: number) => {
    addStars(count);
    if (activeCity) creditCity(activeCity.id, count);
  };

  const handleLetterTraced = (letterId: string, isUppercase: boolean) => {
    markLetterTraced(letterId, isUppercase);
    if (activeCity) creditCity(activeCity.id, TRACE_REWARD_STARS);
  };

  const handleLevelComplete = (stars: number, correct: number) => {
    if (!currentLevel) return;
    completeMathLevel(currentLevel.id, stars, correct);
    setLevelResult({ stars, correct });
  };

  // Games that give spoken instructions get a "repeat" button.
  const hasGameInstructions =
    currentTab === 'tracing' ||
    currentTab === 'bubbles' ||
    currentTab === 'words' ||
    currentTab === 'reading' ||
    currentTab === 'exercises' ||
    currentTab === 'lab' ||
    currentTab === 'enlisten' ||
    currentTab === 'enalphabet' ||
    currentTab === 'enfamilies' ||
    currentTab === 'enwrite' ||
    currentTab === 'enstories' ||
    (currentTab === 'mathmap' && currentLevel !== null);

  // Il livello successivo, solo se sta nella stessa città (le altre si aprono con le stelle).
  const nextLevel = (() => {
    if (!currentLevel || !activeCity) return null;
    const idx = activeCity.games.findIndex((g) => g.levelId === currentLevel.id);
    const nextId = idx >= 0 ? activeCity.games[idx + 1]?.levelId : undefined;
    return nextId !== undefined ? findLevel(nextId) ?? null : null;
  })();

  const isGameTab = currentTab !== 'home' && currentTab !== 'island' && currentTab !== 'stickers';

  const rewardedRef = useRef<Set<string>>(new Set());

  // Città superata: arriva il premio (solo fuori dai giochi, così non interrompe).
  useEffect(() => {
    if (reward || (currentTab !== 'island' && currentTab !== 'home')) return;
    const [next] = pendingCityRewards(progress).filter((c) => !rewardedRef.current.has(c.id));
    if (!next) return;
    rewardedRef.current.add(next.id);
    setReward({ city: next, sticker: claimCityReward(next.id) });
  }, [progress, currentTab, reward, claimCityReward]);
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
    <div className="min-h-dvh flex flex-col bg-[#FFFBEB]/60 text-slate-800 font-sans">
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

      {isGameTab && activeCity && (
        <div aria-label="Gioco in corso" className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={backToCity}
            aria-label="Torna alla città"
            className="min-h-11 flex items-center gap-2 px-4 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 text-sm font-black text-amber-900 cursor-pointer"
          >
            <span aria-hidden="true">←</span>
            <span aria-hidden="true">{activeCity.emoji}</span>
            {activeCity.name}
          </button>
          {activeCity.games.filter((g) => g.levelId === undefined).length > 1 &&
            activeCity.games
              .filter((g) => g.levelId === undefined)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() => handlePlayGame(activeCity.id, g)}
                  aria-pressed={currentTab === g.tab}
                  className={`min-h-11 px-4 rounded-2xl text-sm font-bold cursor-pointer border-2 ${
                    currentTab === g.tab ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-900 hover:border-amber-400'
                  }`}
                >
                  {g.title}
                </button>
              ))}
        </div>
      )}


      {/* Main Active View */}
      <main className="flex-1 pb-8 xl:pb-16">
        {currentTab === 'home' && (
          <HomeScreen
            progress={progress}
            onChooseSection={handleChooseSection}
            onOpenAlbum={() => goToTab('stickers')}
          />
        )}

        {currentTab === 'island' && (
          <IslandView
            island={island}
            progress={progress}
            standingCityId={cityId}
            panelOpen={panelOpen}
            onSelectCity={handleSelectCity}
            onClosePanel={() => setPanelOpen(false)}
            onPlay={handlePlayGame}
            onBack={() => goToTab('home')}
          />
        )}

        {currentTab === 'mathmap' && currentLevel && (
          <MathQuiz
            key={`${currentLevel.id}-${playKey}`}
            level={currentLevel}
            onBackToMap={backToCity}
            onLevelComplete={handleLevelComplete}
          />
        )}

        {currentTab === 'lab' && <MathLab />}

        {currentTab === 'explorer' && (
          <LetterExplorer
            letters={letters}
            masteredLetters={progress.masteredLetters}
            tracedUppercase={progress.tracedUppercase}
            tracedLowercase={progress.tracedLowercase}
            onSelectLetterToTrace={handleSelectLetterToTrace}
            onPlayGameWithLetter={handlePlayGameWithLetter}
            textStyle={progress.textStyle}
          />
        )}

        {currentTab === 'tracing' && (
          <TracingCanvas
            letter={selectedLetter}
            onLetterComplete={handleLetterTraced}
            onNextLetter={handleNextLetter}
            onPrevLetter={handlePrevLetter}
            isCompletedUppercase={progress.tracedUppercase.includes(selectedLetter.id)}
            isCompletedLowercase={progress.tracedLowercase.includes(selectedLetter.id)}
          />
        )}

        {currentTab === 'bubbles' && (
          <BubbleGame
            letters={letters}
            onRewardStars={rewardStars}
            onCompleteLevel={incrementBubbleLevel}
            preferredLetter={selectedLetter}
          />
        )}

        {currentTab === 'words' && (
          <WordMatchQuiz
            letters={letters}
            onRewardStars={rewardStars}
            onCompleteRound={incrementWordQuizRound}
            onWrongAnswer={recordWrongAnswer}
            textStyle={progress.textStyle}
          />
        )}

        {currentTab === 'reading' && (
          <ReadingGame
            readWords={progress.readWords}
            textStyle={progress.textStyle}
            onRewardStars={rewardStars}
            onWordRead={recordWordRead}
            onWrongAnswer={recordWrongAnswer}
          />
        )}

        {currentTab === 'exercises' && (
          <ItalianPractice
            readWords={progress.readWords}
            learnedSyllables={progress.syllables}
            textStyle={progress.textStyle}
            onRewardStars={rewardStars}
            onWordRead={recordWordRead}
            onSyllableLearned={recordSyllable}
            onRoundComplete={incrementWordQuizRound}
            onWrongAnswer={recordWrongAnswer}
          />
        )}

        {currentTab === 'enlisten' && (
          <EnglishListen
            learnedWords={progress.englishWords}
            textStyle={progress.textStyle}
            onRewardStars={rewardStars}
            onWordLearned={recordEnglishWord}
            onWrongAnswer={recordWrongAnswer}
          />
        )}

        {currentTab === 'enalphabet' && (
          <EnglishAlphabet
            learnedLetters={progress.englishLetters}
            textStyle={progress.textStyle}
            onRewardStars={rewardStars}
            onLetterLearned={recordEnglishLetter}
            onWrongAnswer={recordWrongAnswer}
          />
        )}

        {currentTab === 'enfamilies' && (
          <EnglishRead
            families={{
              readWords: progress.englishFamilyWords,
              textStyle: progress.textStyle,
              onRewardStars: rewardStars,
              onWordRead: recordEnglishFamilyWord,
              onWrongAnswer: recordWrongAnswer,
            }}
            sight={{
              learnedWords: progress.englishSightWords,
              textStyle: progress.textStyle,
              onRewardStars: rewardStars,
              onWordLearned: recordEnglishSightWord,
              onWrongAnswer: recordWrongAnswer,
            }}
          />
        )}

        {currentTab === 'enwrite' && (
          <EnglishWrite
            tracedLetters={progress.englishTraced}
            spelledWords={progress.englishSpelledWords}
            textStyle={progress.textStyle}
            onRewardStars={rewardStars}
            onLetterTraced={recordEnglishLetterTraced}
            onWordSpelled={recordEnglishWordSpelled}
            onWrongAnswer={recordWrongAnswer}
          />
        )}

        {currentTab === 'enstories' && (
          <EnglishStories
            readStories={progress.englishStories}
            textStyle={progress.textStyle}
            onRewardStars={rewardStars}
            onStoryRead={recordEnglishStoryRead}
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
            readWordsCount={progress.readWords.length}
            englishWordsCount={progress.englishWords.length}
            claimedMissionIds={progress.claimedMissionIds || []}
            onClaimMission={claimMission}
          />
        )}
      </main>

      {hasGameInstructions && <RepeatInstructionButton />}

      {/* Footer / Parental encouragement */}
      <footer className="py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] xl:pb-4 border-t border-amber-200/60 bg-white/70 text-center text-xs text-amber-900/70">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Alfabimbi · Imparare l'italiano, la matematica e l'inglese con amore e gioco
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
          onBackToMap={backToCity}
          onGoToStickers={() => goToTab('stickers')}
        />
      )}

      {/* Città superata */}
      {reward && (
        <CityRewardModal
          city={reward.city}
          sticker={reward.sticker}
          nextCityName={nextCityNameAfter(reward.city)}
          onContinue={() => setReward(null)}
          onOpenAlbum={() => {
            setReward(null);
            goToTab('stickers');
          }}
        />
      )}

      {/* Palco 3D: ridisegna i giochi (solo dove c'è WebGL e la grafica 3D è attiva) */}
      {WEBGL_OK && progress.graphics3d && isGameTab && (
        <Suspense fallback={null}>
          <StageRoot />
        </Suspense>
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
          onChangeTextStyle={setTextStyle}
          onToggleGraphics3d={toggleGraphics3d}
          onSubmitAccessCode={submitAccessCode}
          onResetProgress={resetProgress}
        />
      )}
    </div>
  );
}
