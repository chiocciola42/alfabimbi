import React, { useState } from 'react';
import { Award, Gift } from 'lucide-react';
import type { ChildProgress } from '../types';
import { ALPHABET_DATA } from '../data/alphabet';
import { READING_WORDS } from '../data/readingWords';
import {
  alphabetMap,
  buildMissions,
  certificatesEarned,
  lettersToNextCertificate,
  summarizeMissions,
  type AnyCertificate,
  levelsToNextCertificate,
  mathCertificatesEarned,
  mathWorldMap,
  englishAlphabetMap,
  englishWorldMap,
} from '../state/goals';
import { ENGLISH_ALPHABET } from '../data/englishAlphabet';
import { ENGLISH_WORDS } from '../data/englishWords';
import { FAMILY_WORDS } from '../data/englishFamilies';
import { MATH_LEVEL_COUNT, WORLDS } from '../math/worlds';
import { mathMedals } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { CertificateModal } from './CertificateModal';
import { SpeakButton } from './SpeakButton';
import { WordDiary } from './WordDiary';

interface GoalsPanelProps {
  progress: ChildProgress;
  onOpenAlbum: () => void;
}

const CELL_STYLE = {
  none: 'bg-slate-100 text-slate-400 border-slate-200',
  started: 'bg-amber-50 text-amber-700 border-amber-400 border-dashed',
  mastered: 'bg-amber-400 text-white border-amber-500 shadow-xs',
} as const;

const WORLD_LABEL = { none: 'da esplorare', started: 'in corso', mastered: 'completato' } as const;
const MATH_MEDALS_MAX = WORLDS.reduce((n, w) => n + w.levels.length * 3, 0);

interface CertificateCardProps {
  remainingText: string;
  items: Array<{ key: string; certificate: AnyCertificate; count: number }>;
  onOpen: (certificate: AnyCertificate) => void;
}

/** Card with the certificates earned so far (one button each) and how far the next one is. */
const CertificateCard: React.FC<CertificateCardProps> = ({ remainingText, items, onOpen }) => (
  <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-3 flex flex-col gap-2">
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center">
        <Award className="w-6 h-6 text-violet-600" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-base font-black text-slate-900">Attestati</span>
        <span className="block text-xs font-bold text-violet-800">{remainingText}</span>
      </span>
    </div>
    {items.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {items.map(({ key, certificate, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              sound.playClick();
              onOpen(certificate);
            }}
            aria-label={`Attestato: ${certificate.title}`}
            className={`inline-flex items-center gap-1.5 px-3 ${TOUCH_TARGET} rounded-2xl bg-white border-2 border-violet-300 hover:bg-violet-100 text-violet-900 font-black text-sm cursor-pointer`}
          >
            <span aria-hidden="true">{certificate.emoji}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const CELL_LABEL = { none: 'da imparare', started: 'quasi imparata', mastered: 'imparata' } as const;

/** Home page goals: today's missions, the alphabet map that fills with colour, the word diary and the certificates. */
export const GoalsPanel: React.FC<GoalsPanelProps> = ({ progress, onOpenAlbum }) => {
  const [showDiary, setShowDiary] = useState(false);
  const [certificate, setCertificate] = useState<AnyCertificate | null>(null);

  const missions = buildMissions({
    lettersTracedCount: progress.lettersTracedCount,
    completedBubbleLevels: progress.completedBubbleLevels,
    completedWordQuizRounds: progress.completedWordQuizRounds,
    completedMathLevels: progress.completedMathLevels,
    stars: progress.stars,
    readWordsCount: progress.readWords.length,
    englishWordsCount: progress.englishWords.length,
  });
  const summary = summarizeMissions(missions, progress.claimedMissionIds);
  const cells = alphabetMap(progress);
  const mastered = progress.masteredLetters.length;
  const certificates = certificatesEarned(mastered);
  const toNext = lettersToNextCertificate(mastered);
  const wordsRead = progress.readWords.length;
  const worlds = mathWorldMap(progress.mathLevelStars);
  const levelsDone = Object.keys(progress.mathLevelStars).length;
  const medals = mathMedals(progress);
  const mathCertificates = mathCertificatesEarned(levelsDone);
  const mathToNext = levelsToNextCertificate(levelsDone);
  const englishWorlds = englishWorldMap(progress.englishWords);
  const englishLetters = englishAlphabetMap(progress.englishLetters);

  const summaryText =
    `Hai imparato ${mastered} lettere, letto ${wordsRead} parole e giocato ${levelsDone} livelli di matematica. ` +
    `In inglese conosci ${progress.englishWords.length} parole e ${progress.englishLetters.length} lettere.` +
    (summary.toClaim > 0 ? ` Hai ${summary.toClaim} premi da riscattare!` : '');

  return (
    <section aria-labelledby="goals-title" className="mt-6 bg-white rounded-3xl border-2 border-amber-200 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id="goals-title" className="text-xl sm:text-2xl font-black text-slate-900">
          I miei traguardi
        </h2>
        <SpeakButton text={summaryText} label="Ascolta i traguardi" />
      </div>

      {/* Missions */}
      <div className="mb-5">
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-sm font-black text-slate-800">
            <span aria-hidden="true">🎯 </span>Missioni
          </span>
          <span className="text-sm font-black text-amber-700 tabular-nums">
            {summary.completed} / {summary.total}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Missioni completate"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percent}
          className="h-6 rounded-full bg-amber-100 overflow-hidden border border-amber-200"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-400 transition-all duration-500"
            style={{ width: `${summary.percent}%` }}
          />
        </div>
        {summary.toClaim > 0 && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenAlbum();
            }}
            className={`mt-3 inline-flex items-center gap-2 px-4 ${TOUCH_TARGET} rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-sm animate-pulse cursor-pointer`}
          >
            <Gift className="w-5 h-5" aria-hidden="true" />
            <span>
              {summary.toClaim === 1 ? '1 premio da riscattare!' : `${summary.toClaim} premi da riscattare!`}
            </span>
          </button>
        )}
      </div>

      {/* Italiano */}
      <div className="mb-5 rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-3 sm:p-4">
        <h3 className="text-base font-black text-slate-900 mb-3">
          <span aria-hidden="true">✏️ </span>Italiano
        </h3>

        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-black text-slate-800">
              <span aria-hidden="true">🔤 </span>La mappa dell'alfabeto
            </span>
            <span className="text-sm font-black text-amber-700 tabular-nums">
              {mastered} / {ALPHABET_DATA.length}
            </span>
          </div>
          <ul className="grid grid-cols-7 sm:grid-cols-9 lg:grid-cols-13 gap-1.5" data-testid="alphabet-map">
            {cells.map((cell) => (
              <li
                key={cell.id}
                aria-label={`Lettera ${cell.letter}: ${CELL_LABEL[cell.state]}`}
                data-state={cell.state}
                className={`aspect-square rounded-xl border-2 flex items-center justify-center font-black text-lg sm:text-xl ${CELL_STYLE[cell.state]}`}
              >
                {applyTextStyle(cell.letter, progress.textStyle === 'upper' ? 'upper' : 'lower')}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* Word diary */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowDiary(true);
            }}
            className={`flex items-center gap-3 text-left rounded-2xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 p-3 ${TOUCH_TARGET} cursor-pointer transition-colors`}
          >
            <span className="text-4xl" aria-hidden="true">📖</span>
            <span>
              <span className="block text-base font-black text-slate-900">Il mio diario</span>
              <span className="block text-xs font-bold text-sky-800 tabular-nums">
                {wordsRead} / {READING_WORDS.length} parole lette
              </span>
            </span>
          </button>

          <CertificateCard
            remainingText={toNext > 0 ? `Ancora ${toNext} ${toNext === 1 ? 'lettera' : 'lettere'} al prossimo` : 'Li hai presi tutti!'}
            items={certificates.map((c) => ({ key: `l${c.letters}`, certificate: c, count: c.letters }))}
            onOpen={setCertificate}
          />
        </div>
      </div>

      {/* Matematica */}
      <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/40 p-3 sm:p-4">
        <h3 className="text-base font-black text-slate-900 mb-3">
          <span aria-hidden="true">🔢 </span>Matematica
        </h3>

        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-black text-slate-800">
              <span aria-hidden="true">🗺️ </span>La mappa dei numeri
            </span>
            <span className="text-sm font-black text-sky-700 tabular-nums">
              {levelsDone} / {MATH_LEVEL_COUNT} livelli
            </span>
          </div>
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5" data-testid="math-map">
            {worlds.map((w) => (
              <li
                key={w.id}
                aria-label={`Mondo ${w.id}, ${w.title}: ${WORLD_LABEL[w.state]}, ${w.stars} stelle su ${w.maxStars}`}
                data-state={w.state}
                className={`rounded-xl border-2 p-1.5 flex flex-col items-center justify-center gap-0.5 min-h-16 ${CELL_STYLE[w.state]}`}
              >
                <span className="text-2xl" aria-hidden="true">{w.emoji}</span>
                <span className="text-[11px] font-black tabular-nums" aria-hidden="true">
                  {w.stars}/{w.maxStars}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold text-sky-800 tabular-nums">
            <span aria-hidden="true">⭐ </span>
            {medals} / {MATH_MEDALS_MAX} stelline dei livelli
          </p>
        </div>

        <CertificateCard
          remainingText={mathToNext > 0 ? `Ancora ${mathToNext} ${mathToNext === 1 ? 'livello' : 'livelli'} al prossimo` : 'Li hai presi tutti!'}
          items={mathCertificates.map((c) => ({ key: `m${c.levels}`, certificate: c, count: c.levels }))}
          onOpen={setCertificate}
        />
      </div>

      {/* Inglese */}
      <div className="mt-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-3 sm:p-4">
        <h3 className="text-base font-black text-slate-900 mb-3">
          <span aria-hidden="true">🇬🇧 </span>Inglese
        </h3>

        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-black text-slate-800">
              <span aria-hidden="true">🗣️ </span>Le parole inglesi
            </span>
            <span className="text-sm font-black text-emerald-700 tabular-nums">
              {progress.englishWords.length} su {ENGLISH_WORDS.length}
            </span>
          </div>
          <ul className="grid grid-cols-4 sm:grid-cols-8 gap-1.5" data-testid="english-world-map">
            {englishWorlds.map((w) => (
              <li
                key={w.id}
                aria-label={`Parole inglesi, ${w.title}: ${WORLD_LABEL[w.state]}, ${w.learned} su ${w.total}`}
                data-state={w.state}
                className={`rounded-xl border-2 p-1.5 flex flex-col items-center justify-center gap-0.5 min-h-16 ${CELL_STYLE[w.state]}`}
              >
                <span className="text-2xl" aria-hidden="true">{w.emoji}</span>
                <span className="text-[11px] font-black tabular-nums" aria-hidden="true">
                  {w.learned}/{w.total}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm font-black text-slate-800">
              <span aria-hidden="true">🔤 </span>L'alfabeto inglese
            </span>
            <span className="text-sm font-black text-emerald-700 tabular-nums">
              {progress.englishLetters.length} su {ENGLISH_ALPHABET.length}
            </span>
          </div>
          <ul className="grid grid-cols-7 sm:grid-cols-9 lg:grid-cols-13 gap-1.5" data-testid="english-alphabet-map">
            {englishLetters.map((cell) => (
              <li
                key={cell.letter}
                aria-label={`Lettera inglese ${cell.letter}: ${cell.state === 'mastered' ? 'imparata' : 'da imparare'}`}
                data-state={cell.state}
                className={`aspect-square rounded-xl border-2 flex items-center justify-center font-black text-lg sm:text-xl ${CELL_STYLE[cell.state]}`}
              >
                {applyTextStyle(cell.letter, progress.textStyle === 'upper' ? 'upper' : 'lower')}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs font-bold text-emerald-800 tabular-nums">
          <span aria-hidden="true">📖 </span>
          {progress.englishFamilyWords.length} su {FAMILY_WORDS.length} paroline lette (cat, hat, dog…)
        </p>
      </div>

      {showDiary && <WordDiary readWords={progress.readWords} textStyle={progress.textStyle} onClose={() => setShowDiary(false)} />}
      {certificate && (
        <CertificateModal
          certificate={certificate}
          childName={progress.name}
          avatar={progress.avatar}
          onClose={() => setCertificate(null)}
        />
      )}
    </section>
  );
};
