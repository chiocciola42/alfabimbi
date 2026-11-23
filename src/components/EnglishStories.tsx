import React, { useEffect, useRef, useState } from 'react';
import { Check, Play, Volume2 } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import {
  ENGLISH_STORIES,
  findStory,
  storyWords,
  suggestedStory,
  wordDurationMs,
  type EnglishStory,
} from '../data/englishStories';
import { ENGLISH_REPEAT_REWARD_STARS, ENGLISH_STORY_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface EnglishStoriesProps {
  /** Ids of the stories and songs already read to the end. */
  readStories: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A story or song was read to the end. */
  onStoryRead: (storyId: string) => void;
}

interface Cursor {
  line: number;
  word: number;
}

const READ_RATE = 0.7;
const LINE_PAUSE_MS = 500;
const INSTRUCTION = 'Ascolta e leggi con me! Tocca una parola per sentirla.';

/** Time (ms) the voice is estimated to need for a line, and when each of its words starts. */
function lineSchedule(text: string): { starts: number[]; total: number } {
  const starts: number[] = [];
  let at = 0;
  for (const w of storyWords(text)) {
    starts.push(at);
    at += wordDurationMs(w.spoken);
  }
  return { starts, total: at };
}

/**
 * Short stories and songs to read along: the voice reads line by line while the words light up
 * (timing is estimated: the browser does not say when each word is spoken). Any word or line can be tapped.
 */
export const EnglishStories: React.FC<EnglishStoriesProps> = ({ readStories, textStyle, onRewardStars, onStoryRead }) => {
  const [storyId, setStoryId] = useState<string>(() => suggestedStory(readStories).id);
  const story = findStory(storyId);

  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [heard, setHeard] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [wasNew, setWasNew] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // A different story starts from scratch.
  useEffect(() => {
    clearTimers();
    sound.stopSpeaking();
    setCursor(null);
    setHeard([]);
    setPlaying(false);
    setDone(false);
    setWasNew(false);
    const t = setTimeout(() => sound.speakInstruction(INSTRUCTION), 300);
    return () => clearTimeout(t);
  }, [storyId]);

  const markHeard = (line: number) => setHeard((h) => (h.includes(line) ? h : [...h, line]));

  /** Reads one line and lights its words up; returns how long it should take. */
  const readLine = (s: EnglishStory, lineIndex: number, offset: number): number => {
    const { starts, total } = lineSchedule(s.lines[lineIndex].text);
    const start = () => {
      sound.speakEnglish(s.lines[lineIndex].text, READ_RATE);
      markHeard(lineIndex);
      setCursor({ line: lineIndex, word: 0 });
    };
    if (offset === 0) start();
    else timers.current.push(setTimeout(start, offset));
    starts.forEach((start, w) => {
      if (w === 0) return;
      timers.current.push(setTimeout(() => setCursor({ line: lineIndex, word: w }), offset + start));
    });
    return total;
  };

  const playAll = () => {
    if (playing) return;
    clearTimers();
    sound.playClick();
    setPlaying(true);
    let at = 0;
    story.lines.forEach((_, i) => {
      at += readLine(story, i, at) + LINE_PAUSE_MS;
    });
    timers.current.push(
      setTimeout(() => {
        setCursor(null);
        setPlaying(false);
      }, at)
    );
  };

  const playLine = (i: number) => {
    clearTimers();
    setPlaying(false);
    const total = readLine(story, i, 0);
    timers.current.push(setTimeout(() => setCursor(null), total + 200));
  };

  const speakWord = (line: number, word: number, spoken: string) => {
    clearTimers();
    setPlaying(false);
    sound.speakEnglish(spoken, READ_RATE);
    setCursor({ line, word });
    timers.current.push(setTimeout(() => setCursor(null), wordDurationMs(spoken) + 200));
  };

  const allHeard = heard.length >= story.lines.length;

  const finish = () => {
    if (done || !allHeard) return;
    const isNew = !readStories.includes(story.id);
    clearTimers();
    setPlaying(false);
    setCursor(null);
    setDone(true);
    setWasNew(isNew);
    sound.playFanfare();
    onStoryRead(story.id);
    onRewardStars(isNew ? ENGLISH_STORY_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
    celebrate({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    timers.current.push(setTimeout(() => sound.speak(`Bravissima! Hai letto ${story.title}!`), 400));
  };

  const nextStory = () => {
    const i = ENGLISH_STORIES.findIndex((s) => s.id === story.id);
    setStoryId(ENGLISH_STORIES[(i + 1) % ENGLISH_STORIES.length].id);
    sound.playClick();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div role="group" aria-label="Scegli una storia o una canzoncina" className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {ENGLISH_STORIES.map((s) => {
          const isRead = readStories.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={storyId === s.id}
              aria-label={`${s.kind === 'song' ? 'Canzoncina' : 'Storia'} ${s.title}: ${isRead ? 'letta' : 'da leggere'}`}
              onClick={() => {
                setStoryId(s.id);
                sound.playClick();
              }}
              className={`relative shrink-0 flex flex-col items-center justify-center px-4 ${TOUCH_TARGET} rounded-2xl border-2 text-2xl transition-colors cursor-pointer ${
                storyId === s.id
                  ? 'bg-emerald-500 border-emerald-600 shadow-sm'
                  : 'bg-white border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span aria-hidden="true">{s.emoji}</span>
              <span aria-hidden="true" className={`text-[10px] font-bold ${storyId === s.id ? 'text-white' : 'text-slate-600'}`}>
                {s.kind === 'song' ? '🎵' : '📖'}
                {isRead ? ' ✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-8 border-2 border-emerald-200 shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-4 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {story.kind === 'song' ? '🎵 Canzoncina' : '📖 Storia'}
          </span>
          <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
        </div>
        <h2 className={`text-center text-2xl sm:text-3xl font-black text-slate-900 mb-5 ${textStyleClass(textStyle)}`}>
          {story.emoji} {applyTextStyle(story.title, textStyle)}
        </h2>

        <div
          aria-hidden="true"
          data-stage-prop="curtain"
          data-stage-active={playing ? 'true' : 'false'}
          className="h-40 mb-3 mx-auto max-w-sm rounded-2xl bg-sky-50 border border-sky-100"
        />

        <div className="flex justify-center mb-5">
          <button
            type="button"
            onClick={playAll}
            disabled={playing}
            className={`inline-flex items-center gap-2 px-6 ${TOUCH_TARGET} rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black text-base shadow-sm cursor-pointer active:scale-95 transition-all`}
          >
            <Play className="w-5 h-5 fill-white" aria-hidden="true" />
            <span>{story.kind === 'song' ? 'Ascolta la canzoncina' : 'Ascolta la storia'}</span>
          </button>
        </div>

        <ol className="space-y-3" data-testid="story-lines">
          {story.lines.map((l, li) => (
            <li
              key={li}
              data-active={cursor?.line === li ? 'true' : undefined}
              className={`flex items-center gap-3 rounded-2xl border-2 p-2 sm:p-3 transition-colors ${
                cursor?.line === li ? 'border-emerald-400 bg-emerald-50' : 'border-transparent'
              }`}
            >
              <button
                type="button"
                onClick={() => playLine(li)}
                aria-label={`Ascolta la riga ${li + 1}`}
                className={`${TOUCH_TARGET} shrink-0 flex items-center justify-center gap-1 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer active:scale-95 transition-colors`}
              >
                <span className="text-2xl" aria-hidden="true">{l.emoji}</span>
                <Volume2 className="w-5 h-5" aria-hidden="true" />
              </button>
              <p className={`flex flex-wrap items-center gap-x-1 gap-y-1 font-black text-xl sm:text-2xl text-slate-800 ${textStyleClass(textStyle)}`}>
                {storyWords(l.text).map((w, wi) => (
                  <button
                    key={wi}
                    type="button"
                    onClick={() => speakWord(li, wi, w.spoken)}
                    data-active={cursor?.line === li && cursor.word === wi ? 'true' : undefined}
                    className={`min-h-14 px-1.5 rounded-xl cursor-pointer transition-all ${
                      cursor?.line === li && cursor.word === wi
                        ? 'bg-amber-200 scale-110 text-slate-900'
                        : 'hover:bg-emerald-100'
                    }`}
                  >
                    {applyTextStyle(w.text, textStyle)}
                  </button>
                ))}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-6 pt-4 border-t border-emerald-100 text-center space-y-3">
          {!done ? (
            <>
              <button
                type="button"
                onClick={finish}
                disabled={!allHeard}
                className={`inline-flex items-center justify-center gap-2 px-8 ${TOUCH_TARGET} rounded-2xl font-black text-base shadow-sm transition-all ${
                  allHeard
                    ? 'bg-gradient-to-r from-emerald-400 to-sky-400 hover:from-emerald-500 hover:to-sky-500 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5" aria-hidden="true" />
                <span>Ho letto tutto!</span>
              </button>
              {!allHeard && (
                <p className="text-xs font-bold text-slate-600" role="status">
                  Ascolta tutte le righe per finire ({heard.length}/{story.lines.length})
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3 animate-in zoom-in-95 duration-200">
              <p className="text-sm font-bold text-emerald-700" role="status">
                {wasNew
                  ? `🌟 Hai letto ${story.title}! +${ENGLISH_STORY_REWARD_STARS} ⭐`
                  : `+${ENGLISH_REPEAT_REWARD_STARS} ⭐`}
              </p>
              <button
                type="button"
                onClick={nextStory}
                className={`py-3.5 px-8 ${TOUCH_TARGET} bg-gradient-to-r from-emerald-400 to-sky-400 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-base rounded-2xl shadow-sm transition-all cursor-pointer`}
              >
                Prossima storia &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
