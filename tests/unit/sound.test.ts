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
