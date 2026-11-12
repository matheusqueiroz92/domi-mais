import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SOUND_STORAGE_KEY, playSound, readStoredSound, resetSoundContext, storeSound } from '../sound';
import { useSound } from '../useSound';

/** Contexto de áudio falso que só conta o que foi criado. */
function installFakeAudio() {
  const created = { contexts: 0, noises: 0, oscillators: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn((next: unknown) => next), start: vi.fn(), stop: vi.fn() });

  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    constructor() {
      created.contexts++;
    }
    resume = vi.fn();
    createBuffer(_channels: number, frames: number) {
      return { getChannelData: () => new Float32Array(frames) };
    }
    createBufferSource() {
      created.noises++;
      return { ...node(), buffer: null };
    }
    createBiquadFilter() {
      return { ...node(), type: '', frequency: param(), Q: param() };
    }
    createGain() {
      return { ...node(), gain: param() };
    }
    createOscillator() {
      created.oscillators++;
      return { ...node(), type: '', frequency: param() };
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);
  return created;
}

describe('sons', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSoundContext();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sem suporte a áudio no navegador, tocar um som não faz nada e não dá erro', () => {
    expect(() => playSound('place')).not.toThrow();
  });

  it('toca cada som com o contexto de áudio do navegador, criado uma única vez', () => {
    const created = installFakeAudio();
    playSound('place');
    playSound('draw');
    expect(created.contexts).toBe(1);
    // "place" tem 2 estalos e "draw" tem 1.
    expect(created.noises).toBe(3);
    expect(created.oscillators).toBe(3);
  });

  it('embaralhar toca vários estalos em sequência', () => {
    const created = installFakeAudio();
    playSound('shuffle');
    expect(created.noises).toBeGreaterThan(8);
  });

  it('uma falha de áudio nunca vira erro para o jogo', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('áudio bloqueado');
        }
      }
    );
    expect(() => playSound('place')).not.toThrow();
  });

  it('a preferência começa ligada e é salva', () => {
    expect(readStoredSound()).toBe(true);
    storeSound(false);
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
    expect(readStoredSound()).toBe(false);
    storeSound(true);
    expect(readStoredSound()).toBe(true);
  });

  it('funciona mesmo quando o armazenamento do navegador falha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(readStoredSound()).toBe(true);
    expect(() => storeSound(false)).not.toThrow();
  });

  it('useSound só toca quando o som está ligado', () => {
    const created = installFakeAudio();
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('draw'));
    expect(created.noises).toBe(1);

    act(() => result.current.toggleSound());
    expect(result.current.soundOn).toBe(false);
    act(() => result.current.play('draw'));
    expect(created.noises).toBe(1);

    act(() => result.current.toggleSound());
    act(() => result.current.play('draw'));
    expect(created.noises).toBe(2);
  });
});
