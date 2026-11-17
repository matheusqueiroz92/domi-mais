import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { usePwa } from '../usePwa';
import type { RegisterServiceWorker } from '../usePwa';
import { OFFLINE_NOTICE_MS, PwaNotice } from '../../components/PwaNotice';

/** Registro falso: guarda os avisos para o teste disparar quando quiser. */
function fakeRegister() {
  const apply = vi.fn(() => Promise.resolve());
  let callbacks: Parameters<RegisterServiceWorker>[0] | null = null;
  const register: RegisterServiceWorker = (options) => {
    callbacks = options;
    return Promise.resolve(apply);
  };
  return { register, apply, callbacks: () => callbacks! };
}

function Notice({ register }: { register: RegisterServiceWorker }) {
  return <PwaNotice pwa={usePwa(register)} />;
}

describe('PWA', () => {
  it('sem novidade, não mostra aviso nenhum', async () => {
    const { register } = fakeRegister();
    render(<Notice register={register} />);
    await act(() => Promise.resolve());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa quando o jogo fica pronto para uso sem internet', async () => {
    const { register, callbacks } = fakeRegister();
    render(<Notice register={register} />);
    await act(() => Promise.resolve());
    act(() => callbacks().onOfflineReady());
    expect(screen.getByRole('status')).toHaveTextContent('funciona neste aparelho sem internet');
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('o aviso de pronto some sozinho depois de alguns segundos', async () => {
    vi.useFakeTimers();
    try {
      const { register, callbacks } = fakeRegister();
      render(<Notice register={register} />);
      await act(() => Promise.resolve());
      act(() => callbacks().onOfflineReady());
      expect(screen.getByRole('status')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(OFFLINE_NOTICE_MS + 10);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('versão nova só é aplicada quando a pessoa toca em "Atualizar"', async () => {
    const { register, callbacks, apply } = fakeRegister();
    render(<Notice register={register} />);
    await act(() => Promise.resolve());
    act(() => callbacks().onNeedRefresh());
    expect(screen.getByRole('status')).toHaveTextContent('versão nova');
    expect(apply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(apply).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('"Depois" fecha o aviso sem atualizar', async () => {
    const { register, callbacks, apply } = fakeRegister();
    render(<Notice register={register} />);
    await act(() => Promise.resolve());
    act(() => callbacks().onNeedRefresh());
    fireEvent.click(screen.getByRole('button', { name: 'Depois' }));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('falha ao registrar não quebra o jogo', async () => {
    const register: RegisterServiceWorker = () => Promise.reject(new Error('sem suporte'));
    const { result } = renderHook(() => usePwa(register));
    await act(() => Promise.resolve());
    expect(result.current.needRefresh).toBe(false);
    expect(() => result.current.update()).not.toThrow();
  });

  it('oferece a instalação quando o navegador permite, uma única vez', async () => {
    const { register } = fakeRegister();
    const { result } = renderHook(() => usePwa(register));
    expect(result.current.canInstall).toBe(false);

    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(() => Promise.resolve()),
    });
    act(() => {
      window.dispatchEvent(event);
    });
    // O aviso padrão do navegador é segurado para o botão do jogo.
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(true);

    act(() => result.current.install());
    expect(event.prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.canInstall).toBe(false));
  });

  it('depois de instalado, o botão de instalar some', () => {
    const { register } = fakeRegister();
    const { result } = renderHook(() => usePwa(register));
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), { prompt: () => Promise.resolve() })
      );
    });
    expect(result.current.canInstall).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.canInstall).toBe(false);
  });
});
