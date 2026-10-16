import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const loadSound = async () => (await import('../../src/utils/sound')).sound;

describe('sound manager', () => {
  it('is a silent no-op in environments without Web Audio / Speech APIs', async () => {
    const sound = await loadSound();
    expect(() => {
      sound.playPop();
      sound.playStarDing();
      sound.playSuccessChime();
      sound.playFanfare();
      sound.playClick();
      sound.playSparkle();
      sound.playErrorSoft();
      sound.speak('ciao');
      sound.speakLetter('A', 'Ape');
      sound.speakEncouragement();
    }).not.toThrow();
  });

  it('speaks Italian with the configured pitch and rate', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    class Utterance {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [{ lang: 'it-IT', name: 'Italiano' }], onvoiceschanged: null });
    const sound = await loadSound();
    sound.speak('Ciao', 0.8, 1.3);
    expect(cancel).toHaveBeenCalled();
    const u = speak.mock.calls[0][0] as Utterance;
    expect(u).toMatchObject({ text: 'Ciao', lang: 'it-IT', rate: 0.8, pitch: 1.3 });
    expect(u.voice).toMatchObject({ lang: 'it-IT' });
  });

  it('builds the "X come Y" phrase for letters', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [] });
    const sound = await loadSound();
    sound.speakLetter('a', 'Ape');
    expect((speak.mock.calls[0][0] as { text: string }).text).toBe('A come Ape!');
    sound.speakLetter('b');
    expect((speak.mock.calls[1][0] as { text: string }).text).toBe('Lettera B!');
  });

  it('stays quiet when the voice is disabled and cancels pending speech', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [] });
    const sound = await loadSound();
    sound.setVoiceEnabled(false);
    expect(cancel).toHaveBeenCalled();
    sound.speak('zitto');
    sound.speakEncouragement();
    expect(speak).not.toHaveBeenCalled();
  });

  it('does not create oscillators when sound effects are disabled', async () => {
    const createOscillator = vi.fn();
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        currentTime = 0;
        destination = {};
        createOscillator = createOscillator;
        createGain = vi.fn();
      }
    );
    const sound = await loadSound();
    sound.setSoundEnabled(false);
    sound.playPop();
    sound.playFanfare();
    expect(createOscillator).not.toHaveBeenCalled();
  });

  it('plays effects through Web Audio when enabled', async () => {
    const osc = { type: '', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        currentTime = 0;
        destination = {};
        createOscillator = () => osc;
        createGain = () => gain;
      }
    );
    const sound = await loadSound();
    sound.playPop();
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
  });

  it('swallows speech synthesis errors', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    vi.stubGlobal('speechSynthesis', { speak: () => { throw new Error('boom'); }, cancel: vi.fn(), getVoices: () => [] });
    const sound = await loadSound();
    expect(() => sound.speak('x')).not.toThrow();
  });
});

describe('instruction repeat', () => {
  it('replays the last spoken instruction and reports when there is none', async () => {
    const speak = vi.fn();
    class Utterance {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [], onvoiceschanged: null });
    const sound = await loadSound();
    expect(sound.repeatInstruction()).toBe(false);
    sound.speakInstruction('Trova la A', 0.8, 1.2);
    sound.speak('Bravissima!');
    expect(sound.repeatInstruction()).toBe(true);
    expect(speak).toHaveBeenCalledTimes(3);
    expect(speak.mock.calls[2][0].text).toBe('Trova la A');
    expect(speak.mock.calls[2][0].rate).toBe(0.8);
    sound.clearInstruction();
    expect(sound.repeatInstruction()).toBe(false);
  });
});

describe('English voice', () => {
  class Utterance {
    lang = '';
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    constructor(public text: string) {}
  }
  const voices = [
    { lang: 'it-IT', name: 'Italiano' },
    { lang: 'en-US', name: 'American' },
    { lang: 'en-GB', name: 'British' },
  ];

  it('speaks English with a British voice, a little slower than Italian', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => voices, onvoiceschanged: null });
    const sound = await loadSound();
    sound.speakEnglish('dog');
    const u = speak.mock.calls[0][0] as Utterance;
    expect(u).toMatchObject({ text: 'dog', lang: 'en-GB', rate: 0.75 });
    expect(u.voice).toMatchObject({ name: 'British' });
  });

  it('falls back to any English voice, and to the default one when there is none', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [voices[0], voices[1]], onvoiceschanged: null });
    let sound = await loadSound();
    sound.speakEnglish('cat');
    expect((speak.mock.calls[0][0] as Utterance).voice).toMatchObject({ name: 'American' });

    vi.resetModules();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [voices[0]], onvoiceschanged: null });
    sound = await loadSound();
    sound.speakEnglish('cat');
    const u = speak.mock.calls[1][0] as Utterance;
    expect(u.lang).toBe('en-GB');
    expect(u.voice).toBeNull();
  });

  it('keeps Italian and English voices apart', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => voices, onvoiceschanged: null });
    const sound = await loadSound();
    sound.speak('Ciao');
    sound.speakEnglish('hello');
    expect((speak.mock.calls[0][0] as Utterance).voice).toMatchObject({ name: 'Italiano' });
    expect((speak.mock.calls[1][0] as Utterance).voice).toMatchObject({ name: 'British' });
  });

  it('queues several pieces after cancelling earlier speech once', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => voices, onvoiceschanged: null });
    const sound = await loadSound();
    sound.speakParts([{ text: 'Ascolta!' }, { text: 'dog', lang: 'en-GB', rate: 0.6 }]);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'Ascolta!', lang: 'it-IT', rate: 0.9, pitch: 1.1 });
    expect(speak.mock.calls[1][0]).toMatchObject({ text: 'dog', lang: 'en-GB', rate: 0.6, pitch: 1.1 });
  });

  it('repeats a multi-part instruction, language by language', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => voices, onvoiceschanged: null });
    const sound = await loadSound();
    sound.speakInstructionParts([{ text: 'Tocca!' }, { text: 'frog', lang: 'en-GB' }]);
    expect(speak).toHaveBeenCalledTimes(2);
    expect(sound.repeatInstruction()).toBe(true);
    expect(speak).toHaveBeenCalledTimes(4);
    expect(speak.mock.calls[3][0]).toMatchObject({ text: 'frog', lang: 'en-GB' });
  });

  it('repeats a single English instruction in English', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => voices, onvoiceschanged: null });
    const sound = await loadSound();
    sound.speakInstruction('Say hello', 0.8, 1.2, 'en-GB');
    expect(sound.repeatInstruction()).toBe(true);
    expect(speak.mock.calls[1][0]).toMatchObject({ text: 'Say hello', lang: 'en-GB', rate: 0.8, pitch: 1.2 });
  });

  it('is silent when the voice is disabled', async () => {
    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => voices, onvoiceschanged: null });
    const sound = await loadSound();
    sound.setVoiceEnabled(false);
    sound.speakEnglish('dog');
    sound.speakParts([{ text: 'a' }, { text: 'b', lang: 'en-GB' }]);
    expect(speak).not.toHaveBeenCalled();
  });
});
