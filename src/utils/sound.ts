// Sound synthesis using Web Audio API and Web Speech API (Italian)

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private voiceEnabled: boolean = true;
  private italianVoice: SpeechSynthesisVoice | null = null;
  private lastInstruction: { text: string; rate: number; pitch: number } | null = null;

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
      // Try finding Italian voice
      const itVoice = voices.find(v => v.lang.startsWith('it') || v.lang === 'it-IT') ||
                      voices.find(v => v.lang.includes('it'));
      if (itVoice) {
        this.italianVoice = itVoice;
      }
    };

    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
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

  public speak(text: string, rate: number = 0.9, pitch: number = 1.1) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop prior speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = rate; // Slightly slower for crisp children phonics
      utterance.pitch = pitch; // Cheerful friendly pitch

      if (this.italianVoice) {
        utterance.voice = this.italianVoice;
      } else {
        const voices = window.speechSynthesis.getVoices();
        const it = voices.find(v => v.lang.startsWith('it'));
        if (it) {
          this.italianVoice = it;
          utterance.voice = it;
        }
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore audio synthesis speech errors gracefully
    }
  }

  /** Speaks a game instruction and remembers it so the child can hear it again. */
  public speakInstruction(text: string, rate: number = 0.9, pitch: number = 1.1) {
    this.lastInstruction = { text, rate, pitch };
    this.speak(text, rate, pitch);
  }

  /** Replays the latest game instruction; returns false when there is none. */
  public repeatInstruction(): boolean {
    if (!this.lastInstruction) return false;
    const { text, rate, pitch } = this.lastInstruction;
    this.speak(text, rate, pitch);
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
