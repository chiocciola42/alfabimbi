import React, { useEffect, useRef, useState } from 'react';
import { ChildProgress, TextStyle, UsageStats } from '../types';
import { TEXT_STYLES, TEXT_STYLE_NAMES, applyTextStyle, textStyleClass } from '../utils/textStyle';
import { currentStreak } from '../state/usage';
import { backupFileName, formatDuration } from '../utils/format';
import { sound } from '../utils/sound';
import type { AccessCodeResult } from '../state/progress';
import { X, Download, Upload, KeyRound } from 'lucide-react';

interface ProfileModalProps {
  progress: ChildProgress;
  usage: UsageStats;
  storageOk: boolean;
  persistent: boolean;
  onExport: () => string;
  onImport: (text: string) => { ok: true } | { ok: false; error: string };
  onClose: () => void;
  onUpdateProfile: (name: string, avatar: string) => void;
  /** Parents choose how words are written (applies immediately). */
  onChangeTextStyle: (style: TextStyle) => void;
  /** Codice dei genitori: sblocca tutti i livelli o ripristina la visibilità normale. */
  onSubmitAccessCode: (code: string) => AccessCodeResult;
  onResetProgress: () => void;
}

const AVATAR_OPTIONS = ['👧', '👸', '🧒', '🦄', '🐱', '🐰', '🦁', '⭐', '🚀', '🎨'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  progress,
  usage,
  storageOk,
  persistent,
  onExport,
  onImport,
  onClose,
  onUpdateProfile,
  onChangeTextStyle,
  onSubmitAccessCode,
  onResetProgress,
}) => {
  const [name, setName] = useState<string>(progress.name);
  const [avatar, setAvatar] = useState<string>(progress.avatar);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const [accessCode, setAccessCode] = useState<string>('');
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [backupMessage, setBackupMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    const finalName = name.trim() || 'Campionessa';
    onUpdateProfile(finalName, avatar);
    sound.playSuccessChime();
    sound.speak(`Ciao ${finalName}! Sei pronta per giocare ancora?`);
    onClose();
  };

  const handleExport = () => {
    try {
      const blob = new Blob([onExport()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage({ ok: true, text: 'Backup scaricato.' });
    } catch {
      setBackupMessage({ ok: false, text: 'Non è stato possibile creare il backup.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const result = onImport(await file.text());
      if (result.ok) {
        onClose();
      } else {
        setBackupMessage({ ok: false, text: result.error });
      }
    } catch {
      setBackupMessage({ ok: false, text: 'Impossibile leggere il file.' });
    }
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmitAccessCode(accessCode);
    setAccessCode('');
    if (result === 'unlocked') {
      sound.playSuccessChime();
      setCodeMessage({ ok: true, text: 'Tutti i livelli sono ora sbloccati.' });
    } else if (result === 'restored') {
      sound.playPop();
      setCodeMessage({ ok: true, text: 'Livelli ripristinati in base alle stelline raccolte.' });
    } else {
      sound.playErrorSoft();
      setCodeMessage({ ok: false, text: 'Codice non valido.' });
    }
  };

  const handleReset = () => {
    onResetProgress();
    setShowConfirmReset(false);
    onClose();
    sound.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="bg-white rounded-3xl max-w-md w-full my-auto p-6 sm:p-7 border-2 border-amber-300 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-sm mb-3">
            {avatar}
          </div>
          <span className="text-[11px] font-black tracking-widest uppercase text-slate-500">Area genitori</span>
          <h3 id="profile-title" className="text-2xl font-black text-slate-900">
            Profilo della Bambina
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Personalizza il tuo nome e scegli il tuo avatar preferito!
          </p>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label htmlFor="profile-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nome della piccola campionessa
          </label>
          <input
            id="profile-name"
            type="text"
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es: Sofia, Giulia..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-amber-200 focus:border-amber-500 focus:outline-hidden font-bold text-slate-800 text-base"
          />
        </div>

        {/* Avatar Picker */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Scegli il tuo Avatar
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_OPTIONS.map((item) => (
              <button
                key={item}
                aria-label={`Avatar ${item}`}
                aria-pressed={avatar === item}
                onClick={() => {
                  setAvatar(item);
                  sound.playPop();
                }}
                className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                  avatar === item
                    ? 'border-amber-500 bg-amber-100 scale-105 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* How words are written */}
        <div className="mb-6">
          <span id="text-style-label" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Come scrivere le parole
          </span>
          <div role="group" aria-labelledby="text-style-label" className="grid grid-cols-3 gap-2">
            {TEXT_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={progress.textStyle === style}
                onClick={() => {
                  onChangeTextStyle(style);
                  sound.playPop();
                }}
                className={`min-h-14 rounded-2xl border-2 px-1 py-2 transition-all cursor-pointer ${
                  progress.textStyle === style
                    ? 'border-amber-500 bg-amber-100 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <span className={`block text-xl font-black text-slate-900 ${textStyleClass(style)}`}>
                  {applyTextStyle('Casa', style)}
                </span>
                <span className="block text-[11px] font-bold text-slate-500">{TEXT_STYLE_NAMES[style]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 mb-6">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
            Traguardi Conquistati
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Stelle</span>
              <span className="font-black text-amber-600 text-base tabular-nums">
                {progress.stars} ⭐
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Scritte</span>
              <span className="font-black text-blue-600 text-base tabular-nums">
                {progress.tracedUppercase.length} / 26
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Parole lette</span>
              <span className="font-black text-violet-600 text-base tabular-nums">
                {progress.readWords.length}
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Figurine</span>
              <span className="font-black text-emerald-600 text-base tabular-nums">
                {progress.unlockedStickers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Usage statistics */}
        <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200 mb-4" data-testid="usage-stats">
          <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-2">
            Utilizzo dell'app
          </h4>
          <dl className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white p-2 rounded-xl border border-sky-200">
              <dt className="text-xs text-slate-500">Tempo di gioco</dt>
              <dd className="font-black text-sky-700 text-base tabular-nums">{formatDuration(usage.totalActiveSeconds)}</dd>
            </div>
            <div className="bg-white p-2 rounded-xl border border-sky-200">
              <dt className="text-xs text-slate-500">Sessioni</dt>
              <dd className="font-black text-sky-700 text-base tabular-nums">{usage.sessions}</dd>
            </div>
            <div className="bg-white p-2 rounded-xl border border-sky-200">
              <dt className="text-xs text-slate-500">Giorni di fila</dt>
              <dd className="font-black text-sky-700 text-base tabular-nums">{currentStreak(usage, Date.now())}</dd>
            </div>
            <div className="bg-white p-2 rounded-xl border border-sky-200">
              <dt className="text-xs text-slate-500">Risposte giuste</dt>
              <dd className="font-black text-sky-700 text-base tabular-nums">
                {usage.counters.quiz_correct + usage.counters.spelling_completed}
              </dd>
            </div>
            <div className="bg-white p-2 rounded-xl border border-sky-200">
              <dt className="text-xs text-slate-500">Livelli di matematica</dt>
              <dd className="font-black text-sky-700 text-base tabular-nums">{progress.completedMathLevels}</dd>
            </div>
            <div className="bg-white p-2 rounded-xl border border-sky-200">
              <dt className="text-xs text-slate-500">Esercizi di matematica</dt>
              <dd className="font-black text-sky-700 text-base tabular-nums">
                {progress.mathCorrectFirstTry}/{progress.mathExercisesSolved}
              </dd>
            </div>
          </dl>
        </div>

        {/* Parent access code: unlock every level / restore normal visibility */}
        <form onSubmit={handleSubmitCode} className="mb-5 p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <label htmlFor="access-code" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Codice genitori
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            {progress.allLevelsUnlocked
              ? 'Tutti i livelli sono sbloccati. Inserisci il codice di ripristino per tornare alla visibilità normale.'
              : 'Inserisci il codice per sbloccare tutti i livelli di gioco. Stelle e figurine non cambiano.'}
          </p>
          <div className="flex gap-2">
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Codice"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-hidden font-bold text-slate-800 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 min-h-11 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> Applica
            </button>
          </div>
          {codeMessage && (
            <p role="status" className={`mt-2 text-xs font-semibold ${codeMessage.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {codeMessage.text}
            </p>
          )}
        </form>

        {!storageOk && (
          <p role="alert" className="mb-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            Il salvataggio automatico non è disponibile su questo dispositivo (navigazione privata o archivio pieno).
            Scarica un backup per non perdere i progressi.
          </p>
        )}

        {/* Backup */}
        <div className="mb-5">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 min-h-11 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Scarica backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 min-h-11 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Ripristina backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="import-input"
              onChange={handleImportFile}
            />
          </div>
          {backupMessage && (
            <p role="status" className={`mt-2 text-xs font-semibold ${backupMessage.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {backupMessage.text}
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            I progressi sono salvati su questo dispositivo{persistent ? ' (archivio protetto dal browser)' : ''}.
          </p>
        </div>

        {/* Save & Reset Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSave}
            className="w-full py-3.5 min-h-12 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-sm transition-all hover:scale-101 cursor-pointer"
          >
            Salva Profilo
          </button>

          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-sm text-slate-500 hover:text-rose-600 font-semibold py-3 min-h-11 transition-colors cursor-pointer"
            >
              Azzera progressi (per iniziare da capo)
            </button>
          ) : (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
              <p className="text-xs text-rose-800 font-bold mb-2">
                Vuoi davvero ricominciare da zero?
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 min-h-11 bg-rose-600 text-white text-sm font-bold rounded-lg cursor-pointer"
                >
                  Sì, azzera
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2.5 min-h-11 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
