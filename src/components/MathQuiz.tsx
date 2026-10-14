import React, { useState, useEffect } from 'react';
import { Level, Question, VisualItem } from '../math/types';
import { generateLevelQuestions } from '../math/questionGenerator';
import { sound } from '../utils/sound';
import { Volume2, HelpCircle, ArrowLeft, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathVisual, TenFrameBuilder, TapOrderBoard } from './MathVisual';

interface MathQuizProps {
  level: Level;
  onBackToMap: () => void;
  onLevelComplete: (starsEarned: number, correctCount: number) => void;
}

export const MathQuiz: React.FC<MathQuizProps> = ({
  level,
  onBackToMap,
  onLevelComplete,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countedItems, setCountedItems] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [useKeypad, setUseKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const [builtCells, setBuiltCells] = useState<boolean[]>(() => Array(10).fill(false));
  const [tappedOrder, setTappedOrder] = useState<number[]>([]);

  const resetInteractions = () => {
    setBuiltCells(Array(10).fill(false));
    setTappedOrder([]);
  };

  // Load questions for level
  useEffect(() => {
    const qs = generateLevelQuestions(level.id, 5);
    setQuestions(qs);
    setCurrentIndex(0);
    setCorrectAnswersCount(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setCountedItems({});
    setShowHint(false);
    setKeypadInput('');
    resetInteractions();
  }, [level]);

  const currentQ = questions[currentIndex];

  // Auto-speak question on load if voice enabled
  useEffect(() => {
    if (currentQ && sound.isVoiceEnabled()) {
      sound.speak(currentQ.speechText);
    }
    return () => {
      sound.stopSpeaking();
    };
  }, [currentQ]);

  if (!currentQ) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <p className="text-slate-500 font-medium">Caricamento domande...</p>
      </div>
    );
  }

  // Handle manipulative touch/count
  const handleItemTouch = (itemId: string) => {
    sound.playPop();
    setCountedItems((prev) => {
      if (prev[itemId] !== undefined) {
        // Toggle uncount
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      const count = Object.keys(prev).length + 1;
      return { ...prev, [itemId]: count };
    });
  };

  const handleSelectAnswer = (ans: string | number) => {
    if (isAnswerSubmitted) return;
    sound.playClick();
    setSelectedAnswer(ans);

    const correct = String(ans).trim().toLowerCase() === String(currentQ.correctAnswer).trim().toLowerCase();
    setIsCorrect(correct);
    setIsAnswerSubmitted(true);

    if (correct) {
      sound.playSuccessChime();
      setCorrectAnswersCount((prev) => prev + 1);
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#f43f5e', '#10b981', '#6366f1'],
      });
    } else {
      sound.playErrorSoft();
    }
  };

  const handleKeypadSubmit = () => {
    if (!keypadInput) return;
    handleSelectAnswer(Number(keypadInput));
  };

  const handleToggleCell = (index: number) => {
    if (isAnswerSubmitted) return;
    sound.playPop();
    setBuiltCells((prev) => prev.map((on, i) => (i === index ? !on : on)));
  };

  const handleTapOrder = (value: number) => {
    if (isAnswerSubmitted || !currentQ.orderItems) return;
    const sorted = [...currentQ.orderItems].sort((a, b) => (currentQ.orderDescending ? b - a : a - b));
    const next = [...tappedOrder, value];
    setTappedOrder(next);
    if (value !== sorted[tappedOrder.length]) {
      handleSelectAnswer('errore');
    } else if (next.length === sorted.length) {
      handleSelectAnswer('ok');
    } else {
      sound.playPop();
    }
  };

  const handleNextQuestion = () => {
    sound.playClick();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setIsCorrect(false);
      setCountedItems({});
      setShowHint(false);
      setKeypadInput('');
      resetInteractions();
    } else {
      // Completed level!
      const totalCorrect = correctAnswersCount;
      let stars = 1;
      if (totalCorrect >= 5) stars = 3;
      else if (totalCorrect >= 4) stars = 2;

      onLevelComplete(stars, totalCorrect);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={() => {
            sound.playClick();
            sound.stopSpeaking();
            onBackToMap();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Mappa</span>
        </button>

        <div className="text-center">
          <span className="text-[11px] font-bold text-amber-600 block uppercase tracking-wider">
            Livello {level.worldLevelNumber} · {level.title}
          </span>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            Domanda {currentIndex + 1} di {questions.length}
          </span>
        </div>

        {/* Listen button */}
        <button
          onClick={() => {
            sound.speak(currentQ.speechText);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
          title="Ascolta la domanda a voce alta"
        >
          <Volume2 className="w-4 h-4" />
          <span className="hidden sm:inline">Ascolta</span>
        </button>
      </div>

      {/* Progress line dots */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={`flex-1 border-r border-white/60 transition-colors ${
              idx < currentIndex
                ? 'bg-emerald-500'
                : idx === currentIndex
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Main Question Card */}
      <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Question Prompt */}
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold text-slate-400">
            {currentQ.title}
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
            {currentQ.instruction}
          </h2>
        </div>

        {/* Visual Interactive Manipulative Area */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 min-h-[160px] flex items-center justify-center">
          
          {/* Nuovi giochi: visual grafico + interazioni dedicate */}
          {currentQ.visual && (
            <MathVisual visual={currentQ.visual} answer={selectedAnswer} answered={isAnswerSubmitted} />
          )}

          {currentQ.interaction === 'ten_frame_build' && (
            <div className="flex flex-col items-center gap-4">
              <TenFrameBuilder cells={builtCells} onToggle={handleToggleCell} disabled={isAnswerSubmitted} />
              {!isAnswerSubmitted && (
                <button
                  type="button"
                  onClick={() => handleSelectAnswer(builtCells.filter(Boolean).length)}
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Controlla
                </button>
              )}
            </div>
          )}

          {currentQ.interaction === 'tap_order' && currentQ.orderItems && (
            <TapOrderBoard
              items={currentQ.orderItems}
              tapped={tappedOrder}
              onTap={handleTapOrder}
              disabled={isAnswerSubmitted}
            />
          )}

          {/* Case 1: Count Objects (touch to count) */}
          {currentQ.type === 'count_objects' && currentQ.itemsA && (
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-lg">
              {currentQ.itemsA.map((item, idx) => {
                const countNumber = countedItems[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemTouch(item.id)}
                    className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 shadow-sm flex items-center justify-center text-4xl cursor-pointer active:scale-95 transition-transform"
                  >
                    <span>{item.emoji}</span>
                    {countNumber !== undefined && (
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md animate-bounce">
                        {countNumber}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Case 2: Number Line with Jumping Frog */}
          {currentQ.type === 'number_line' && (
            <div className="w-full space-y-6 py-2">
              <div className="relative flex items-center justify-between border-b-4 border-amber-400 pb-3 px-2">
                {Array.from({ length: (currentQ.numberLineMax || 10) + 1 }, (_, n) => {
                  const isFrogHere = n === currentQ.numberLineStart;
                  const isDestination = currentQ.correctAnswer === n && isAnswerSubmitted;
                  return (
                    <div key={n} className="flex flex-col items-center relative">
                      {isFrogHere && (
                        <div className="absolute -top-10 text-3xl animate-bounce">
                          🐸
                        </div>
                      )}
                      {isDestination && (
                        <div className="absolute -top-9 text-2xl text-emerald-600">
                          🚩
                        </div>
                      )}
                      <div
                        className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-transform ${
                          isFrogHere
                            ? 'bg-amber-400 text-white shadow-md scale-110'
                            : 'bg-white border-2 border-slate-300 text-slate-700'
                        }`}
                      >
                        {n}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-xs font-semibold text-slate-500">
                Parti dal sasso <strong className="text-amber-600">{currentQ.numberLineStart}</strong> e fai <strong className="text-amber-600">{Math.abs(currentQ.numberLineJump || 0)}</strong> salti { (currentQ.numberLineJump || 0) >= 0 ? 'in avanti ➡️' : 'all’indietro ⬅️'}!
              </div>
            </div>
          )}

          {/* Case 3: Compare Numbers & Crocodile */}
          {currentQ.type === 'compare_numbers' && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-10 w-full">
              {/* Left group */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center min-w-[120px]">
                <span className="text-3xl font-black text-blue-700 block mb-2">
                  {currentQ.numberA}
                </span>
                {currentQ.itemsA && (
                  <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
                    {currentQ.itemsA.map((it) => (
                      <span key={it.id} className="text-xl">{it.emoji}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Crocodile in middle */}
              <div className="text-center">
                <span className="text-5xl block animate-pulse-slow">🐊</span>
                <span className="text-xs font-bold text-slate-400 mt-1 block">
                  {selectedAnswer ? String(selectedAnswer) : '?'}
                </span>
              </div>

              {/* Right group */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center min-w-[120px]">
                <span className="text-3xl font-black text-orange-700 block mb-2">
                  {currentQ.numberB}
                </span>
                {currentQ.itemsB && (
                  <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
                    {currentQ.itemsB.map((it) => (
                      <span key={it.id} className="text-xl">{it.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Case 4: Addition with Visual Items */}
          {currentQ.type === 'addition_objects' && currentQ.itemsA && currentQ.itemsB && (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                {currentQ.itemsA.map((it) => (
                  <span key={it.id} className="text-3xl">{it.emoji}</span>
                ))}
                <span className="text-xs font-bold text-slate-400 ml-2">({currentQ.numberA})</span>
              </div>
              <span className="text-3xl font-extrabold text-amber-500">+</span>
              <div className="flex items-center gap-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                {currentQ.itemsB.map((it) => (
                  <span key={it.id} className="text-3xl">{it.emoji}</span>
                ))}
                <span className="text-xs font-bold text-slate-400 ml-2">({currentQ.numberB})</span>
              </div>
            </div>
          )}

          {/* Case 5: Friends of Ten */}
          {currentQ.type === 'friends_of_ten' && (
            <div className="flex items-center justify-center gap-4">
              <div className="w-20 h-24 rounded-2xl bg-amber-100 border-2 border-amber-300 flex flex-col items-center justify-center shadow-xs">
                <span className="text-xs font-bold text-amber-700">Amico 1</span>
                <span className="text-4xl font-black text-amber-800">{currentQ.numberA}</span>
              </div>
              <span className="text-3xl font-extrabold text-amber-500">+</span>
              <div className="w-20 h-24 rounded-2xl bg-rose-100 border-2 border-dashed border-rose-300 flex flex-col items-center justify-center shadow-xs">
                <span className="text-xs font-bold text-rose-700">Amico ?</span>
                <span className="text-4xl font-black text-rose-800">
                  {selectedAnswer ? String(selectedAnswer) : '?'}
                </span>
              </div>
              <span className="text-3xl font-extrabold text-slate-400">=</span>
              <div className="w-20 h-24 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex flex-col items-center justify-center shadow-xs">
                <span className="text-xs font-bold text-emerald-700">Totale</span>
                <span className="text-4xl font-black text-emerald-800">10</span>
              </div>
            </div>
          )}

          {/* Case 6: Subtraction with crossed out items */}
          {currentQ.type === 'subtraction_objects' && currentQ.itemsA && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {currentQ.itemsA.map((it) => (
                <div
                  key={it.id}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl relative border shadow-2xs ${
                    it.label === '❌'
                      ? 'bg-rose-50 border-rose-200 opacity-60'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <span>{it.emoji}</span>
                  {it.label === '❌' && (
                    <span className="absolute text-2xl font-black text-rose-600">❌</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Case 7: Tens and Units / Abacus */}
          {currentQ.type === 'tens_and_units' && (
            <div className="flex items-center justify-center gap-8">
              {/* Abacus visual */}
              <div className="bg-amber-100/60 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex items-end gap-6">
                {/* Tens column (red) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-24 bg-amber-400 rounded-full flex flex-col-reverse items-center justify-start py-1 gap-1">
                    {Array.from({ length: currentQ.numberA || 1 }).map((_, i) => (
                      <div key={i} className="w-6 h-5 rounded-full bg-rose-500 border border-rose-600 shadow-xs" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-rose-600 mt-1">da (decine)</span>
                </div>

                {/* Units column (blue) */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-24 bg-amber-400 rounded-full flex flex-col-reverse items-center justify-start py-1 gap-1">
                    {Array.from({ length: currentQ.numberB || 0 }).map((_, i) => (
                      <div key={i} className="w-6 h-5 rounded-full bg-blue-500 border border-blue-600 shadow-xs" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-blue-600 mt-1">u (unità)</span>
                </div>
              </div>
            </div>
          )}

          {/* Case 8: Word problem illustration */}
          {currentQ.type === 'word_problem' && (
            <div className="text-center space-y-2">
              <div className="text-5xl">{currentQ.storyIllustration || '📖 ✨ 🎈'}</div>
            </div>
          )}

          {/* Case 9: Before / After */}
          {currentQ.type === 'before_after' && (
            <div className="flex items-center justify-center gap-3">
              <div
                className={`w-16 h-20 rounded-2xl flex items-center justify-center text-3xl font-black border-2 ${
                  currentQ.missingPosition === 'first'
                    ? 'bg-amber-50 border-dashed border-amber-400 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {currentQ.missingPosition === 'first'
                  ? selectedAnswer !== null
                    ? String(selectedAnswer)
                    : '?'
                  : (currentQ.numberA || 0) - 1}
              </div>
              <div className="w-16 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-md">
                {currentQ.numberA}
              </div>
              <div
                className={`w-16 h-20 rounded-2xl flex items-center justify-center text-3xl font-black border-2 ${
                  currentQ.missingPosition === 'last'
                    ? 'bg-amber-50 border-dashed border-amber-400 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {currentQ.missingPosition === 'last'
                  ? selectedAnswer !== null
                    ? String(selectedAnswer)
                    : '?'
                  : (currentQ.numberA || 0) + 1}
              </div>
            </div>
          )}
        </div>

        {/* Options Selection Buttons */}
        <div className="space-y-4">
          <div className={`grid grid-cols-2 gap-3 ${currentQ.options.some((o) => String(o).length > 5) ? '' : 'sm:grid-cols-4'}`}>
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedAnswer === opt;
              let btnClass = 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-900';

              if (isAnswerSubmitted) {
                if (String(opt).toLowerCase() === String(currentQ.correctAnswer).toLowerCase()) {
                  btnClass = 'bg-emerald-500 border-emerald-600 text-white shadow-md scale-102';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-rose-500 border-rose-600 text-white';
                } else {
                  btnClass = 'bg-slate-100 border-slate-200 text-slate-400 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectAnswer(opt)}
                  className={`h-16 md:h-20 rounded-2xl border-2 text-xl md:text-2xl font-black transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 ${btnClass}`}
                >
                  <span className="font-mono">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback banner after answer */}
          {isAnswerSubmitted && (
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 animate-float transition-all ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-amber-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-extrabold text-base">
                    {isCorrect ? 'Bravissima! Risposta Corretta! 🎉' : 'Non ti preoccupare, impariamo insieme! 💪'}
                  </h4>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {currentQ.explanation}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-102 shrink-0"
              >
                <span>{currentIndex + 1 < questions.length ? 'Prossima Domanda' : 'Vedi Risultato!'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Hint button */}
        {!isAnswerSubmitted && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              onClick={() => {
                sound.playClick();
                setShowHint(!showHint);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showHint ? 'Nascondi Aiutino' : 'Serve un Aiutino?'}</span>
            </button>

            <span className="text-[11px] text-slate-400 font-medium">
              {currentQ.interaction === 'ten_frame_build'
                ? 'Tocca le caselle del telaio!'
                : currentQ.interaction === 'tap_order'
                  ? 'Tocca i numeri uno alla volta!'
                  : 'Tocca le opzioni per rispondere!'}
            </span>
          </div>
        )}

        {showHint && !isAnswerSubmitted && (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>{currentQ.hint}</span>
          </div>
        )}
      </div>
    </div>
  );
};
