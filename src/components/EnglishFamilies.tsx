import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import {
  WORD_FAMILIES,
  familyRoundOrder,
  findFamily,
  pickOnsetChoices,
  suggestedFamily,
  type FamilyWord,
} from '../data/englishFamilies';
import { dayNumber } from '../data/dailyWords';
import { ENGLISH_FAMILY_REWARD_STARS, ENGLISH_REPEAT_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface EnglishFamiliesProps {
  /** Family words already read (lowercase). */
  readWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A word was built correctly: it goes among the words read. */
  onWordRead: (word: string) => void;
  onWrongAnswer?: () => void;
  /** Inside the Read tab, which provides the page container. */
  embedded?: boolean;
}

type Blend = 'rime' | 'word' | null;

const CHOICES = 3;
const BLEND_PAUSE_MS = 900;
const INSTRUCTION = 'Guarda la figura e scegli la lettera che manca!';

/**
 * Word families (phonics): the ending is fixed, the child slides the first letter in front of it
 * and the word changes (c-at, h-at, b-at). The first real reading in English.
 */
export const EnglishFamilies: React.FC<EnglishFamiliesProps> = ({
  readWords,
  textStyle,
  onRewardStars,
  onWordRead,
  onWrongAnswer,
  embedded = false,
}) => {
  const [familyId, setFamilyId] = useState<string>(() => suggestedFamily(readWords).id);
  // The order is fixed when the family changes, so words read meanwhile do not reshuffle it.
  const [startRead] = useState(readWords);
  const queue = useMemo(
    () => familyRoundOrder(familyId, startRead, dayNumber(new Date()) + familyId.length),
    [familyId, startRead]
  );
  const [index, setIndex] = useState(0);
  const word = queue[index % queue.length];
  const choices = useMemo(() => pickOnsetChoices(word, CHOICES), [word, index]);
  const family = findFamily(familyId);

  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string | null>(null);
  const [blend, setBlend] = useState<Blend>(null);
  const [wasNew, setWasNew] = useState(false);
  const solved = placed !== null;
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** "at ... cat": the ending first, then the whole word, each one lit up while it is heard. */
  const readAloud = (w: FamilyWord) => {
    clearTimers();
    setBlend('rime');
    sound.speakEnglish(w.family, 0.7);
    timers.current.push(
      setTimeout(() => {
        setBlend('word');
        sound.speakEnglish(w.word, 0.6);
      }, BLEND_PAUSE_MS),
      setTimeout(() => setBlend(null), BLEND_PAUSE_MS * 2)
    );
  };

  const hintLetter = wrongPicks.length >= 2 && !solved ? word.onset : null;

  // New word or family: reset and, after a short pause, say what to do and the English word.
  useEffect(() => {
    clearTimers();
    setBlend(null);
    setWrongPicks([]);
    setPlaced(null);
    setWasNew(false);
    const t = setTimeout(
      () =>
        sound.speakInstructionParts([
          { text: INSTRUCTION },
          { text: word.word, lang: 'en-GB', rate: 0.75, pitch: 1.05 },
        ]),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, familyId]);

  useEffect(() => setIndex(0), [familyId]);

  const handleChoice = (letter: string) => {
    if (solved || wrongPicks.includes(letter)) return;
    if (letter === word.onset) {
      const isNew = !readWords.includes(word.word);
      sound.playSuccessChime();
      setPlaced(letter);
      setWasNew(isNew);
      onWordRead(word.word);
      onRewardStars(isNew ? ENGLISH_FAMILY_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
      celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      readAloud(word);
    } else {
      sound.playErrorSoft();
      setWrongPicks((prev) => [...prev, letter]);
      onWrongAnswer?.();
      sound.speakEnglish(word.word);
    }
  };

  const familyDone = (id: string) => findFamily(id).words.filter((w) => readWords.includes(w.word)).length;
  const ending = applyTextStyle(family.id, textStyle);
  const slotText = placed !== null ? applyTextStyle(placed, textStyle) : '?';

  return (
    <div className={embedded ? undefined : 'max-w-3xl mx-auto px-4 py-6'}>
      {/* The word families */}
      <div role="group" aria-label="Scegli una famiglia di parole" className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {WORD_FAMILIES.map((f) => {
          const done = familyDone(f.id);
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={familyId === f.id}
              aria-label={`Parole che finiscono con ${f.id}: ${done} su ${f.words.length}`}
              onClick={() => {
                setFamilyId(f.id);
                sound.playClick();
              }}
              className={`shrink-0 flex flex-col items-center justify-center px-4 ${TOUCH_TARGET} rounded-2xl border-2 text-xs font-bold transition-colors cursor-pointer ${
                familyId === f.id
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span aria-hidden="true" className={`text-xl font-black leading-none ${textStyleClass(textStyle)}`}>
                -{applyTextStyle(f.id, textStyle)}
              </span>
              <span aria-hidden="true" className="tabular-nums">
                {done}/{f.words.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 shadow-lg text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Forma la parola</span>
          <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
        </div>

        <div className="w-28 h-28 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center text-6xl shadow-inner mb-2 border border-emerald-200">
          {word.emoji}
        </div>
        <div className="mb-5 flex justify-center">
          <SpeakButton withLabel text={word.word} lang="en-GB" rate={0.7} label="Ascolta la parola inglese" />
        </div>

        {/* The empty slot and the fixed ending */}
        <button
          type="button"
          onClick={() => solved && readAloud(word)}
          aria-label={solved ? `Ascolta ${word.word}` : `La parola finisce con ${family.id}`}
          className={`mx-auto flex items-center justify-center gap-2 mb-6 ${TOUCH_TARGET} rounded-3xl px-4 py-3 bg-emerald-50/60 border-2 border-emerald-200 ${
            solved ? 'cursor-pointer hover:bg-emerald-100 active:scale-95' : 'cursor-default'
          } ${textStyleClass(textStyle)} transition-transform`}
        >
          <span
            data-testid="onset-slot"
            data-filled={solved ? 'true' : 'false'}
            className={`min-w-16 h-20 sm:h-24 px-3 rounded-2xl border-2 flex items-center justify-center font-black text-5xl sm:text-6xl transition-all duration-200 ${
              solved
                ? `bg-rose-100 border-rose-400 text-rose-600 ${blend === 'word' ? 'scale-110 bg-amber-200' : ''}`
                : 'bg-white border-dashed border-emerald-300 text-slate-300'
            }`}
          >
            {slotText}
          </span>
          <span
            data-testid="rime"
            className={`h-20 sm:h-24 px-3 rounded-2xl flex items-center justify-center font-black text-5xl sm:text-6xl text-sky-600 transition-all duration-200 ${
              blend === 'rime' || blend === 'word' ? 'bg-amber-200 scale-110' : ''
            }`}
          >
            {ending}
          </span>
        </button>

        {!solved && (
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
            {choices.map((letter) => {
              const isWrong = wrongPicks.includes(letter);
              const isHint = hintLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleChoice(letter)}
                  disabled={isWrong}
                  aria-label={`Lettera ${letter.toUpperCase()}`}
                  data-correct={letter === word.onset ? 'true' : 'false'}
                  data-hint={isHint ? 'true' : undefined}
                  className={`min-w-20 h-20 sm:h-24 px-4 rounded-2xl bg-white border-2 font-black text-5xl shadow-xs transition-all cursor-pointer active:scale-95 ${textStyleClass(textStyle)} ${
                    isWrong
                      ? 'opacity-30 border-slate-200'
                      : isHint
                        ? 'border-emerald-500 ring-4 ring-emerald-200 animate-pulse text-emerald-700'
                        : 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 text-slate-800'
                  }`}
                >
                  {applyTextStyle(letter, textStyle)}
                </button>
              );
            })}
          </div>
        )}

        {wrongPicks.length > 0 && !solved && (
          <p role="status" className="mt-3 text-rose-600 font-bold text-sm">
            {wrongPicks.length >= 2 ? 'Ti aiuto io: guarda la lettera che brilla ✨' : 'Quasi! Ascolta ancora e riprova 👂'}
          </p>
        )}

        {/* The words of this family: they light up as they are read */}
        <ul className="mt-5 flex items-center justify-center gap-2 flex-wrap" aria-label="Le parole di questa famiglia">
          {family.words.map((w) => {
            const isRead = readWords.includes(w.word);
            return (
              <li
                key={w.word}
                data-read={isRead ? 'true' : 'false'}
                aria-label={`${w.word}: ${isRead ? 'letta' : 'da leggere'}`}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl ${
                  isRead ? 'bg-emerald-100 border-emerald-400' : 'bg-slate-50 border-slate-200 opacity-50 grayscale'
                }`}
              >
                <span aria-hidden="true">{w.emoji}</span>
              </li>
            );
          })}
        </ul>

        {solved && (
          <div className="mt-6 pt-4 border-t border-emerald-100 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-black">
                <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
                <span className={`text-3xl ${textStyleClass(textStyle)}`}>{applyTextStyle(word.word, textStyle)}</span>
              </div>
              <p className="text-sm font-bold text-emerald-700">
                {wasNew
                  ? `📖 Nuova parola letta! +${ENGLISH_FAMILY_REWARD_STARS} ⭐`
                  : `+${ENGLISH_REPEAT_REWARD_STARS} ⭐`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIndex((i) => i + 1);
              }}
              className={`py-3.5 px-8 ${TOUCH_TARGET} bg-gradient-to-r from-emerald-400 to-sky-400 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-base rounded-2xl shadow-sm transition-all cursor-pointer`}
            >
              Prossima parola &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
