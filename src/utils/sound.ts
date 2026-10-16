// Sound synthesis using Web Audio API and Web Speech API (Italian, plus English for the English section)

/** Languages the voice can speak: Italian everywhere, British English in the English section. */
export type SpeechLang = 'it-IT' | 'en-GB';

/** One piece of a spoken sequence (e.g. an Italian instruction followed by an English word). */
export interface SpeechPart {
  text: string;
  lang?: SpeechLang;
  rate?: number;
  pitch?: number;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private voiceEnabled: boolean = true;
  private voices: Partial<Record<SpeechLang, SpeechSynthesisVoice>> = {};
  private lastInstruction: SpeechPart[] | null = null;

  constructor() {
    this.initVoice();
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const it = this.pickVoice(voices, 'it-IT');
      if (it) this.voices['it-IT'] = it;
      const en = this.pickVoice(voices, 'en-GB');
      if (en) this.voices['en-GB'] = en;
    };

    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  /** The best installed voice for a language: the exact locale first, then any voice of that language. */
  private pickVoice(voices: SpeechSynthesisVoice[], lang: SpeechLang): SpeechSynthesisVoice | undefined {
    const base = lang.slice(0, 2);
    const exact = voices.find((v) => v.lang === lang || v.lang.replace('_', '-') === lang);
    if (exact) return exact;
    const sameLanguage = voices.find((v) => v.lang.startsWith(base));
    if (sameLanguage) return sameLanguage;
    return lang === 'it-IT' ? voices.find((v) => v.lang.includes('it')) : undefined;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isVoiceEnabled() {
    return this.voiceEnabled;
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  // --- Web Audio SFX ---

  public playPop() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency pitch drop for a cheerful bubble pop
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playStarDing() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playSuccessChime() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Ascending triad arpeggio: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.31);
    });
  }

  public playFanfare() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Celebration fanfare: G4, C5, E5, G5 -> sustained high chord
    const sequence = [
      { freq: 392.0, time: 0, dur: 0.15 },
      { freq: 523.25, time: 0.14, dur: 0.15 },
      { freq: 659.25, time: 0.28, dur: 0.15 },
      { freq: 783.99, time: 0.42, dur: 0.45 },
      { freq: 1046.5, time: 0.52, dur: 0.55 },
    ];

    const now = this.ctx.currentTime;

    sequence.forEach(({ freq, time, dur }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + time;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    });
  }

  public playClick() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playSparkle() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 400, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playErrorSoft() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  // --- Web Speech API (Italian Voice) ---

  private utter(part: SpeechPart, defaults: { rate: number; pitch: number }) {
    const lang: SpeechLang = part.lang ?? 'it-IT';
    const utterance = new SpeechSynthesisUtterance(part.text);
    utterance.lang = lang;
    utterance.rate = part.rate ?? defaults.rate; // Slightly slower for crisp children phonics
    utterance.pitch = part.pitch ?? defaults.pitch; // Cheerful friendly pitch

    let voice = this.voices[lang];
    if (!voice) {
      voice = this.pickVoice(window.speechSynthesis.getVoices(), lang);
      if (voice) this.voices[lang] = voice;
    }
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }

  public speak(text: string, rate: number = 0.9, pitch: number = 1.1, lang: SpeechLang = 'it-IT') {
    this.speakParts([{ text, lang, rate, pitch }]);
  }

  /** Speaks several pieces one after the other (the browser queues them), stopping any earlier speech. */
  public speakParts(parts: SpeechPart[]) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop prior speech
      for (const part of parts) this.utter(part, { rate: 0.9, pitch: 1.1 });
    } catch {
      // Ignore audio synthesis speech errors gracefully
    }
  }

  /** Speaks an English word or phrase, a little slower than Italian so it is easy to repeat. */
  public speakEnglish(text: string, rate: number = 0.75, pitch: number = 1.05) {
    this.speak(text, rate, pitch, 'en-GB');
  }

  /** Speaks a game instruction and remembers it so the child can hear it again. */
  public speakInstruction(text: string, rate: number = 0.9, pitch: number = 1.1, lang: SpeechLang = 'it-IT') {
    this.lastInstruction = [{ text, lang, rate, pitch }];
    this.speak(text, rate, pitch, lang);
  }

  /** Like `speakInstruction`, for an instruction made of several pieces (e.g. Italian words, then an English one). */
  public speakInstructionParts(parts: SpeechPart[]) {
    this.lastInstruction = parts;
    this.speakParts(parts);
  }

  /** Replays the latest game instruction; returns false when there is none. */
  public repeatInstruction(): boolean {
    if (!this.lastInstruction) return false;
    const [only] = this.lastInstruction;
    if (this.lastInstruction.length === 1) this.speak(only.text, only.rate, only.pitch, only.lang);
    else this.speakParts(this.lastInstruction);
    return true;
  }

  public clearInstruction() {
    this.lastInstruction = null;
  }

  public speakLetter(letter: string, word?: string) {
    if (!this.voiceEnabled) return;
    const phrase = word ? `${letter.toUpperCase()} come ${word}!` : `Lettera ${letter.toUpperCase()}!`;
    this.speak(phrase, 0.85, 1.15);
  }

  public speakEncouragement() {
    const praises = [
      'Bravissima!',
      'Magnifico!',
      'Continua così!',
      'Sei super bravissima!',
      'Fantastico lavoro!',
      'Evviva!',
      'Perfetto!',
      'Hai fatto benissimo!',
    ];
    const phrase = praises[Math.floor(Math.random() * praises.length)];
    this.speak(phrase, 0.95, 1.2);
  }
}

export const sound = new SoundManager();
