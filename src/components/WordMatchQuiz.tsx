import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LetterData } from '../types';
import { sound } from '../utils/sound';
import { Volume2, Sparkles, Check, RotateCcw, Star, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { dailySpellList, type SpellWord } from '../data/dailyWords';

interface WordMatchQuizProps {
  letters: LetterData[];
  /** Words for "Componi la Parolina"; defaults to today's rotation. */
  spellWords?: SpellWord[];
  onRewardStars: (stars: number) => void;
  onCompleteRound?: (kind: 'quiz' | 'spelling') => void;
  onWrongAnswer?: () => void;
}


export const WordMatchQuiz: React.FC<WordMatchQuizProps> = ({
  letters,
  spellWords,
  onRewardStars,
  onCompleteRound,
  onWrongAnswer,
}) => {
  const [gameMode, setGameMode] = useState<'initialLetter' | 'spelling'>('initialLetter');

  // Mode 1: Initial letter quiz
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // Mode 2: Word spelling builder
  const [spellIndex, setSpellIndex] = useState<number>(0);
  const [spelledLetters, setSpelledLetters] = useState<string[]>([]);
  const [scrambledOptions, setScrambledOptions] = useState<string[]>([]);
  const [isSpellComplete, setIsSpellComplete] = useState<boolean>(false);
  const spellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick question items
  const quizLetter = letters[currentQuizIndex % letters.length];
  const todaysWords = useMemo(() => spellWords ?? dailySpellList(new Date()), [spellWords]);
  const currentSpell = todaysWords[spellIndex % todaysWords.length];

  // Options for initial letter
  const [quizOptions, setQuizOptions] = useState<string[]>([]);

  useEffect(() => {
    // Generate 4 letter options (1 correct, 3 distractors)
    const otherLetters = letters
      .filter((l) => l.letter !== quizLetter.letter)
      .map((l) => l.letter);
    const shuffledOthers = [...otherLetters].sort(() => 0.5 - Math.random()).slice(0, 3);
    const opts = [quizLetter.letter, ...shuffledOthers].sort(() => 0.5 - Math.random());
    setQuizOptions(opts);
    setSelectedLetter(null);
    setIsAnswerCorrect(null);

    if (gameMode !== 'initialLetter') return;

    // Speak prompt
    const timer = setTimeout(() => {
      sound.speakInstruction(`Con quale lettera inizia la parola ${quizLetter.word}?`);
    }, 250);
    return () => clearTimeout(timer);
  }, [currentQuizIndex, quizLetter, letters, gameMode]);

  useEffect(() => {
    if (gameMode !== 'spelling') return;
    setupSpellingWord();
    return () => {
      if (spellTimerRef.current) clearTimeout(spellTimerRef.current);
    };
  }, [spellIndex, gameMode]);

  const setupSpellingWord = () => {
    if (spellTimerRef.current) clearTimeout(spellTimerRef.current);
    setSpelledLetters([]);
    setIsSpellComplete(false);
    // Scramble letters of current word
    const lettersArr = currentSpell.word.split('');
    const shuffled = [...lettersArr].sort(() => 0.5 - Math.random());
    setScrambledOptions(shuffled);

    spellTimerRef.current = setTimeout(() => {
      sound.speakInstruction(`Componiamo la parolina ${currentSpell.word}!`);
    }, 250);
  };

  const handleOptionClick = (chosen: string) => {
    if (selectedLetter !== null) return;
    setSelectedLetter(chosen);

    if (chosen === quizLetter.letter) {
      setIsAnswerCorrect(true);
      sound.playSuccessChime();
      sound.speakEncouragement();
      onRewardStars(3);
      if (onCompleteRound) onCompleteRound('quiz');

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    } else {
      setIsAnswerCorrect(false);
      if (onWrongAnswer) onWrongAnswer();
      sound.playErrorSoft();
      sound.speak(`Quasi! Prova ancora. La parola ${quizLetter.word} inizia con ${quizLetter.letter}!`);
    }
  };

  const handleNextQuiz = () => {
    setCurrentQuizIndex((prev) => prev + 1);
  };

  const handleSpellingLetterClick = (letter: string, optionIndex: number) => {
    if (isSpellComplete) return;

    const nextTargetLetter = currentSpell.word[spelledLetters.length];

    if (letter === nextTargetLetter) {
      sound.playClick();
      sound.speakLetter(letter);

      const updatedSpelled = [...spelledLetters, letter];
      setSpelledLetters(updatedSpelled);

      // Remove from scrambled pool
      const updatedOptions = [...scrambledOptions];
      updatedOptions.splice(optionIndex, 1);
      setScrambledOptions(updatedOptions);

      // Check if finished spelling word
      if (updatedSpelled.length === currentSpell.word.length) {
        setIsSpellComplete(true);
        sound.playFanfare();
        if (onCompleteRound) onCompleteRound('spelling');
        setTimeout(() => {
          sound.speak(`Bravissima! Hai scritto ${currentSpell.word}!`);
        }, 300);
        onRewardStars(5);
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    } else {
      sound.playErrorSoft();
      sound.speak(`Serve la lettera ${nextTargetLetter}!`);
    }
  };

  const handleResetSpelling = () => {
    setupSpellingWord();
    sound.playClick();
  };

  const handleNextSpellingWord = () => {
    setSpellIndex((prev) => prev + 1);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Game Mode Switcher */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => {
            setGameMode('initialLetter');
            sound.playClick();
          }}
          className={`px-5 py-3 min-h-11 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
            gameMode === 'initialLetter'
              ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          1. Qual è l'Iniziale?
        </button>
        <button
          onClick={() => {
            setGameMode('spelling');
            sound.playClick();
          }}
          className={`px-5 py-3 min-h-11 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
            gameMode === 'spelling'
              ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          2. Componi la Parolina
        </button>
      </div>

      {/* MODE 1: Initial Letter Match */}
      {gameMode === 'initialLetter' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Indovina la Lettera Iniziale
            </span>
            <button
              onClick={() =>
                sound.speakInstruction(`Con quale lettera inizia la parola ${quizLetter.word}?`)
              }
              className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Cute Mascot Card */}
          <div className="w-28 h-28 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-6xl shadow-inner mb-4 border border-amber-200 animate-in zoom-in-90 duration-200">
            {quizLetter.emoji}
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            {quizLetter.word}
          </h3>
          <p className="text-sm font-semibold text-amber-800 mb-6">
            Con quale lettera inizia "{quizLetter.word}"?
          </p>

          {/* 4 Large Choice Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-lg mx-auto mb-6">
            {quizOptions.map((opt) => {
              const isSelected = selectedLetter === opt;
              const isCorrectOpt = opt === quizLetter.letter;

              let btnStyle =
                'bg-amber-50/80 hover:bg-amber-100 text-slate-800 border-amber-200';

              if (selectedLetter !== null) {
                if (isCorrectOpt) {
                  btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-105';
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle = 'bg-rose-100 text-rose-700 border-rose-300 opacity-70';
                }
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleOptionClick(opt)}
                  disabled={selectedLetter !== null && isAnswerCorrect === true}
                  className={`h-24 rounded-3xl border-2 font-black text-4xl sm:text-5xl transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-95 ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Result Feedback & Next */}
          {selectedLetter && (
            <div className="mt-4 pt-4 border-t border-amber-100">
              {isAnswerCorrect ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                    <Check className="w-6 h-6 stroke-[3]" />
                    <span>Esatto! {quizLetter.letter} come {quizLetter.word}!</span>
                  </div>
                  <button
                    onClick={handleNextQuiz}
                    className="py-3.5 px-8 min-h-12 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-sm transition-all hover:scale-102 cursor-pointer"
                  >
                    Prossima Parola &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-rose-600 font-bold text-sm">
                    Non fa niente! Riprova, quale letterina suona come "{quizLetter.word}"?
                  </p>
                  <button
                    onClick={() => {
                      setSelectedLetter(null);
                      setIsAnswerCorrect(null);
                    }}
                    className="py-3 px-5 min-h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl cursor-pointer"
                  >
                    Riprova ora
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Spelling Builder */}
      {gameMode === 'spelling' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Componi la Parola con le Lettere
            </span>
            <button
              onClick={() => sound.speak(currentSpell.word)}
              className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Cute Object Illustration */}
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-5xl shadow-inner mb-2 border border-amber-200">
            {currentSpell.emoji}
          </div>
          <p className="text-xs text-amber-800 font-semibold mb-6">
            {currentSpell.hint}
          </p>

          {/* Target Word Slots */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
            {currentSpell.word.split('').map((char, idx) => {
              const isFilled = idx < spelledLetters.length;
              const letterInSlot = spelledLetters[idx];

              return (
                <div
                  key={idx}
                  className={`w-14 h-16 sm:w-18 sm:h-20 rounded-2xl border-2 flex items-center justify-center font-black text-3xl sm:text-4xl transition-all duration-200 ${
                    isFilled
                      ? 'bg-amber-400 border-amber-500 text-white shadow-sm scale-102'
                      : 'bg-amber-50/60 border-dashed border-amber-300 text-slate-400'
                  }`}
                >
                  {isFilled ? letterInSlot : '_'}
                </div>
              );
            })}
          </div>

          {/* Available Letter Tiles to Tap */}
          {!isSpellComplete && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Tocca le lettere nell'ordine giusto:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-md mx-auto mb-6">
                {scrambledOptions.map((letter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSpellingLetterClick(letter, i)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-500 text-amber-950 hover:bg-amber-100 font-black text-2xl sm:text-3xl shadow-xs transition-all active:scale-90 cursor-pointer"
                  >
                    {letter}
                  </button>
                ))}
              </div>

              <button
                onClick={handleResetSpelling}
                className="inline-flex items-center gap-1.5 px-4 min-h-11 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ricomincia parola</span>
              </button>
            </div>
          )}

          {/* Victory Celebration */}
          {isSpellComplete && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xl">
                <span>🎉 Bravissima! Hai scritto "{currentSpell.word}"!</span>
              </div>
              <p className="text-xs font-bold text-amber-600">
                +5 Stelle d'oro aggiunte al tuo tesoro! ⭐
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleNextSpellingWord}
                  className="py-3 px-6 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-sm transition-all hover:scale-102 cursor-pointer"
                >
                  Prossima Parola &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
