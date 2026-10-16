import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { Certificate } from '../state/goals';
import { sound } from '../utils/sound';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface CertificateModalProps {
  certificate: Certificate;
  childName: string;
  avatar: string;
  onClose: () => void;
}

/** Attestato da stampare e appendere in cameretta: uno ogni 5 lettere imparate. */
export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, childName, avatar, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const date = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const message = `Bravissima ${childName}! Hai imparato ${certificate.letters} lettere!`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center p-4 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="certificate-title" className="max-w-xl w-full my-auto">
        <div className="print-sheet bg-white rounded-3xl p-6 sm:p-10 border-4 border-amber-300 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-2 left-3 text-2xl opacity-60" aria-hidden="true">⚜️</div>
          <div className="absolute top-2 right-3 text-2xl opacity-60" aria-hidden="true">⚜️</div>
          <div className="absolute bottom-2 left-3 text-2xl opacity-60" aria-hidden="true">⚜️</div>
          <div className="absolute bottom-2 right-3 text-2xl opacity-60" aria-hidden="true">⚜️</div>

          <div className="text-6xl mb-3" aria-hidden="true">{certificate.emoji}</div>
          <span className="text-xs font-black tracking-widest uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
            Alfabimbi
          </span>
          <h3 id="certificate-title" className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-1 tracking-tight">
            Attestato di bravura
          </h3>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-5">{certificate.title}</p>

          <div className="inline-block px-8 py-3 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 rounded-2xl border-2 border-amber-300 mb-5">
            <span className="text-3xl sm:text-4xl font-black text-amber-950">
              {childName} {avatar}
            </span>
          </div>

          <p className="text-base sm:text-lg text-slate-700 font-semibold max-w-sm mx-auto mb-6">
            ha imparato a riconoscere e a scrivere{' '}
            <strong className="text-amber-600 font-black">{certificate.letters} lettere</strong> dell'alfabeto!
          </p>

          <p className="text-xs font-bold text-slate-400">{date}</p>
        </div>

        <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-3">
          <SpeakButton withLabel text={message} label="Ascolta il messaggio" />
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              window.print();
            }}
            className={`inline-flex items-center justify-center gap-2 px-5 ${TOUCH_TARGET} rounded-2xl bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm shadow-sm cursor-pointer`}
          >
            <Printer className="w-5 h-5" aria-hidden="true" />
            <span>Stampa</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center justify-center gap-2 px-5 ${TOUCH_TARGET} rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm cursor-pointer`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
            <span>Chiudi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
