import React, { useState, useEffect, useRef } from 'react';
import { LetterData } from '../types';
import { sound } from '../utils/sound';
import { Sparkles, Trophy, RotateCcw, Volume2, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BubbleGameProps {
  letters: LetterData[];
  onRewardStars: (stars: number) => void;
  onCompleteLevel?: () => void;
  preferredLetter?: LetterData | null;
}

interface Bubble {
  id: number;
  letter: string;
  x: number; // percentage 5 to 85
  y: number; // percentage 105 down to -15
  speed: number;
  size: number; // px 70 to 95
  color: string;
  isPopping: boolean;
}

export const BubbleGame: React.FC<BubbleGameProps> = ({
  letters,
  onRewardStars,
  onCompleteLevel,
  preferredLetter,
}) => {
  const [targetLetter, setTargetLetter] = useState<LetterData>(
    preferredLetter || letters[0]
  );
  const [score, setScore] = useState<number>(0);
  const roundGoal = 5;
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [roundCompleted, setRoundCompleted] = useState<boolean>(false);

  const bubbleIdRef = useRef<number>(1);
  const animationFrameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const scoreRef = useRef<number>(0);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announceTarget = (letter: LetterData) => {
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      sound.speak(`Scoppia tutte le bolle con la lettera: ${letter.letter}!`);
    }, 300);
  };

  const resetRound = (letter: LetterData) => {
    setTargetLetter(letter);
    scoreRef.current = 0;
    setScore(0);
    setRoundCompleted(false);
    setBubbles([]);
    announceTarget(letter);
  };

  // Announce the first target (the one chosen from the explorer, if any); clear timers on exit.
  useEffect(() => {
    announceTarget(targetLetter);
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A different letter was requested from outside (e.g. via the explorer).
  useEffect(() => {
    if (preferredLetter && preferredLetter.id !== targetLetter.id) resetRound(preferredLetter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredLetter?.id]);

  const pickNewTargetLetter = () => {
    const pool = letters.filter((l) => l.id !== targetLetter.id);
    const candidates = pool.length > 0 ? pool : letters;
    resetRound(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  // Main game physics loop (spawn and move bubbles)
  useEffect(() => {
    if (roundCompleted) return;

    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      // Spawn new bubble every ~800ms
      if (timestamp - lastSpawnRef.current > 850) {
        lastSpawnRef.current = timestamp;

        // 40% chance the bubble has the target letter, 60% random letter
        const isTarget = Math.random() < 0.42;
        const letterChar = isTarget
          ? targetLetter.letter
          : letters[Math.floor(Math.random() * letters.length)].letter;

        const colors = [
          'from-cyan-300/80 to-blue-400/80',
          'from-pink-300/80 to-rose-400/80',
          'from-amber-200/80 to-yellow-400/80',
          'from-emerald-300/80 to-teal-400/80',
          'from-purple-300/80 to-violet-400/80',
        ];

        const newBubble: Bubble = {
          id: bubbleIdRef.current++,
          letter: letterChar,
          x: 8 + Math.random() * 78,
          y: 105, // start just below screen
          speed: 0.28 + Math.random() * 0.22,
          size: 72 + Math.random() * 18,
          color: colors[Math.floor(Math.random() * colors.length)],
          isPopping: false,
        };

        setBubbles((prev) => [...prev.slice(-12), newBubble]);
      }

      // Move existing bubbles up
      setBubbles((prev) =>
        prev
          .map((b) => ({
            ...b,
            y: b.y - b.speed,
          }))
          .filter((b) => b.y > -20 && !b.isPopping)
      );

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetLetter, roundCompleted, letters]);

  const handleBubbleTap = (bubble: Bubble) => {
    if (bubble.isPopping || roundCompleted) return;

    if (bubble.letter === targetLetter.letter) {
      sound.playPop();
      sound.playStarDing();

      // Mark bubble as popping
      setBubbles((prev) =>
        prev.map((b) => (b.id === bubble.id ? { ...b, isPopping: true } : b))
      );

      const nextScore = scoreRef.current + 1;
      scoreRef.current = nextScore;
      setScore(nextScore);

      if (nextScore >= roundGoal) {
        // Round Victory!
        setRoundCompleted(true);
        sound.playFanfare();
        sound.speakEncouragement();
        onRewardStars(5);
        if (onCompleteLevel) onCompleteLevel();
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.5 },
          });
        } catch {}
      } else {
        const praises = ['Presa!', 'Bravissima!', 'Perfetto!', 'Avanti così!'];
        sound.speak(praises[Math.floor(Math.random() * praises.length)], 1, 1.2);
      }
    } else {
      sound.playErrorSoft();
      sound.speak(`Quella è la ${bubble.letter}! Cerca la ${targetLetter.letter}!`, 0.9, 1.1);
    }
  };

  const nextLevel = () => {
    pickNewTargetLetter();
  };

  const replayLetter = () => resetRound(targetLetter);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Banner & Target Prompt */}
      <div className="bg-white rounded-3xl p-5 border-2 border-amber-200 shadow-md mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 text-white flex items-center justify-center font-black text-3xl shadow-sm animate-pulse">
            {targetLetter.letter}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Missione Bolle Magiche
              </span>
              <button
                onClick={() =>
                  sound.speak(
                    `Scoppia tutte le bolle con la lettera ${targetLetter.letter} come ${targetLetter.word}!`
                  )
                }
                className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Trova e scoppia la lettera{' '}
              <span className="text-blue-600 underline decoration-amber-400">
                {targetLetter.letter}
              </span>{' '}
              ({targetLetter.word} {targetLetter.emoji})
            </h2>
          </div>
        </div>

        {/* Score Progress */}
        <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200">
          <div className="text-right">
            <span className="text-xs font-bold text-amber-800 block">Obiettivo</span>
            <span className="text-xl font-black text-amber-900 tabular-nums">
              {score} / {roundGoal}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: roundGoal }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < score
                    ? 'fill-amber-400 text-amber-500 scale-110'
                    : 'text-slate-300'
                } transition-all duration-200`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bubble Stage Canvas Area */}
      <div className="relative w-full h-[520px] bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 rounded-3xl border-2 border-sky-300 shadow-inner overflow-hidden select-none">
        {/* Decorative Floating Clouds */}
        <div className="absolute top-4 left-6 text-4xl opacity-60 pointer-events-none animate-pulse">
          ☁️
        </div>
        <div className="absolute top-12 right-10 text-5xl opacity-50 pointer-events-none">
          ☁️
        </div>

        {/* Bubbles */}
        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => handleBubbleTap(b)}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr ${b.color} border-2 border-white/80 shadow-md backdrop-blur-xs flex items-center justify-center font-black text-3xl sm:text-4xl text-white select-none active:scale-90 transition-transform cursor-pointer hover:brightness-110`}
          >
            {/* Gloss shine reflection on bubble */}
            <div className="absolute top-2 left-2.5 w-4 h-2 bg-white/60 rounded-full rotate-[-30deg]" />
            <span className="drop-shadow-sm pointer-events-none">{b.letter}</span>
          </button>
        ))}

        {/* Victory Level Overlay */}
        {roundCompleted && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-30">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center border-4 border-amber-300 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto mb-3 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-4xl shadow-sm">
                🎉
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">
                Bravissima!
              </h3>
              <p className="text-sm text-slate-600 font-medium mb-4">
                Hai scoppiato tutte le bolle con la lettera {targetLetter.letter}!
                Hai vinto 5 stelle d'oro!
              </p>
              <div className="flex items-center justify-center gap-1.5 text-amber-500 font-bold text-lg mb-5">
                <Star className="w-6 h-6 fill-amber-400" />
                <span className="tabular-nums">+5 Stelle Guadagnate!</span>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={nextLevel}
                  className="w-full py-3.5 min-h-12 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-101"
                >
                  Nuova Lettera &rarr;
                </button>
                <button
                  onClick={replayLetter}
                  className="w-full py-3 min-h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl cursor-pointer"
                >
                  Gioca ancora con {targetLetter.letter}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
