import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX_LENGTH, QUICK_MESSAGES } from './protocol';
import type { QuickMessageId, RoomView } from './protocol';
import type { OnlineRoom } from './useOnlineRoom';
import './ChatPanel.css';

interface ChatPanelProps {
  view: RoomView;
  online: Pick<OnlineRoom, 'sendChat' | 'setChatEnabled' | 'muted' | 'toggleMute'>;
  /** Altura da lista de mensagens (a sala de espera usa uma menor). */
  compact?: boolean;
  /** Dentro de uma janela que já tem título: esconde o título "Chat". */
  hideTitle?: boolean;
}

/**
 * Chat da sala: mensagens, botões de mensagem rápida, campo de texto,
 * silenciar jogadores (só nesta tela) e, para o dono, ligar e desligar.
 * O filtro de palavras fica no servidor (server/src/chat/filter.ts).
 */
export function ChatPanel({ view, online, compact = false, hideTitle = false }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const you = view.seats[view.youIndex];
  const isHost = you?.isHost ?? false;
  const { enabled, messages } = view.chat;
  const visible = messages.filter((message) => !online.muted.has(message.seatId));
  const others = view.seats.filter((seat) => seat.kind === 'human' && !seat.isYou);
  const lastId = visible.length ? visible[visible.length - 1].id : 0;

  // Mensagem nova: a lista desce até ela.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lastId]);

  const send = async (message: { text: string } | { quick: QuickMessageId }) => {
    setSending(true);
    const ok = await online.sendChat(message);
    setSending(false);
    // Mensagem recusada (palavra proibida, rápido demais) continua no campo.
    if (ok && 'text' in message) setText('');
  };

  return (
    <section className="chat" aria-label="Chat da sala">
      <div className="chat__top">
        {!hideTitle && <h2 className="chat__title">Chat</h2>}
        {isHost && (
          <label className="chat__switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => void online.setChatEnabled(event.target.checked)}
            />
            Chat ligado para todos
          </label>
        )}
      </div>

      <ol ref={listRef} className={`chat__list ${compact ? 'chat__list--compact' : ''}`} aria-live="polite">
        {visible.length === 0 && <li className="chat__empty">Nenhuma mensagem ainda.</li>}
        {visible.map((message) => {
          const mine = message.seatId === you?.id;
          return (
            <li key={message.id} className={`chat__message ${mine ? 'chat__message--mine' : ''}`}>
              {!mine && <span className="chat__author">{message.name}</span>}
              <span className={`chat__text ${message.quick ? 'chat__text--quick' : ''}`}>{message.text}</span>
            </li>
          );
        })}
      </ol>

      {enabled ? (
        <>
          <div className="chat__quick" role="group" aria-label="Mensagens rápidas">
            {(Object.keys(QUICK_MESSAGES) as QuickMessageId[]).map((id) => (
              <button
                key={id}
                type="button"
                className="chat__chip"
                disabled={sending}
                onClick={() => void send({ quick: id })}
              >
                {QUICK_MESSAGES[id]}
              </button>
            ))}
          </div>
          <form
            className="chat__form"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) void send({ text });
            }}
          >
            <input
              type="text"
              className="player-form__input chat__input"
              placeholder="Escreva uma mensagem"
              aria-label="Mensagem"
              value={text}
              maxLength={CHAT_MAX_LENGTH}
              onChange={(event) => setText(event.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={!text.trim() || sending}>
              Enviar
            </button>
          </form>
        </>
      ) : (
        <p className="chat__off">O chat está desligado pelo dono da sala.</p>
      )}

      {others.length > 0 && (
        <div className="chat__mute" role="group" aria-label="Silenciar jogadores">
          {others.map((seat) => {
            const isMuted = online.muted.has(seat.id);
            return (
              <button
                key={seat.id}
                type="button"
                className={`chat__mute-btn ${isMuted ? 'chat__mute-btn--on' : ''}`}
                aria-pressed={isMuted}
                onClick={() => online.toggleMute(seat.id)}
              >
                {isMuted ? `Ouvir ${seat.name}` : `Silenciar ${seat.name}`}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
