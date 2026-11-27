import { useI18n } from '../i18n/useI18n';
import type { Messages } from '../i18n/messages';
import { useState } from 'react';
import type { BotLevel } from '../game/state/game-types';
import { BOT_LEVEL_LABELS } from '../game/ai/bot';
import { MAX_ROOM_PLAYERS, MIN_ROOM_PLAYERS } from './protocol';
import type { RoomView, SeatView } from './protocol';
import { inviteLink } from './useOnlineRoom';
import { CpuIcon } from '../components/icons';
import './OnlineLobby.css';

interface OnlineLobbyProps {
  view: RoomView;
  busy?: boolean;
  onAddBot: (level: BotLevel) => void;
  onRemoveSeat: (seatId: string) => void;
  onStart: () => void;
  onLeave: () => void;
}

/** Selo de cada lugar: dono, você, computador, sem conexão. */
function seatTags(seat: SeatView, m: Messages): string[] {
  const tags: string[] = [];
  if (seat.isYou) tags.push(m.lobby.you);
  if (seat.isHost) tags.push(m.lobby.host);
  if (seat.kind === 'bot' && seat.botLevel) tags.push(m.lobby.computer(m.bots.levels[seat.botLevel]));
  if (seat.kind === 'human' && !seat.connected) tags.push(m.lobby.offline);
  return tags;
}

/** Sala de espera: código para convidar, lugares e o botão de começar. */
export function OnlineLobby({ view, busy = false, onAddBot, onRemoveSeat, onStart, onLeave }: OnlineLobbyProps) {
  const { m } = useI18n();
  const [level, setLevel] = useState<BotLevel>('medium');
  const [copied, setCopied] = useState(false);
  const you = view.seats[view.youIndex];
  const host = view.seats.find((seat) => seat.isHost);
  const isHost = you?.isHost ?? false;
  const free = MAX_ROOM_PLAYERS - view.seats.length;
  const canStart = view.seats.length >= MIN_ROOM_PLAYERS;
  const link = inviteLink(view.code);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão para copiar: o código continua na tela.
    }
  };

  const share = () => {
    void navigator
      .share({ title: 'DomiMais', text: m.lobby.shareText(view.code), url: link })
      .catch(() => undefined);
  };

  return (
    <section className="lobby" aria-label={m.lobby.label}>
      <div className="lobby__code-box">
        <span className="lobby__label">{m.lobby.code}</span>
        <span className="lobby__code" aria-label={m.lobby.codeLabel(view.code.split('').join(' '))}>
          {view.code}
        </span>
        <p className="lobby__hint">{m.lobby.hint}</p>
        <div className="lobby__share">
          <button type="button" className="btn" onClick={copyLink}>
            {copied ? m.lobby.copied : m.lobby.copy}
          </button>
          {canShare && (
            <button type="button" className="btn" onClick={share}>
              {m.lobby.share}
            </button>
          )}
        </div>
      </div>

      <div className="lobby__seats">
        <h2 className="lobby__title">
          {m.lobby.players(view.seats.length, MAX_ROOM_PLAYERS)}
        </h2>
        <ol className="lobby__list">
          {view.seats.map((seat) => (
            <li key={seat.id} className="lobby__seat" data-testid="lobby-seat">
              <span className="lobby__seat-name">
                {seat.kind === 'bot' && <CpuIcon size={16} />}
                {seat.name}
              </span>
              <span className="lobby__tags">
                {seatTags(seat, m).map((tag) => (
                  <span key={tag} className="lobby__tag">
                    {tag}
                  </span>
                ))}
              </span>
              {isHost && !seat.isYou && (
                <button
                  type="button"
                  className="lobby__remove"
                  onClick={() => onRemoveSeat(seat.id)}
                  aria-label={m.lobby.removeLabel(seat.name)}
                  disabled={busy}
                >
                  {m.lobby.remove}
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: free }, (_, index) => (
            <li key={`free-${index}`} className="lobby__seat lobby__seat--free">
              {m.lobby.free}
            </li>
          ))}
        </ol>

        {isHost && free > 0 && (
          <div className="lobby__bot">
            <fieldset className="player-count">
              <legend className="player-form__label">{m.lobby.fillWithBot}</legend>
              <div className="player-count__options">
                {(Object.keys(BOT_LEVEL_LABELS) as BotLevel[]).map((option) => (
                  <label
                    key={option}
                    className={`player-count__option ${level === option ? 'player-count__option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="lobby-bot-level"
                      value={option}
                      checked={level === option}
                      onChange={() => setLevel(option)}
                    />
                    {m.bots.levels[option]}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn--block" onClick={() => onAddBot(level)} disabled={busy}>
              {m.lobby.addBot}
            </button>
          </div>
        )}
      </div>

      <p className="lobby__status" role="status">
        {isHost
          ? canStart
            ? m.lobby.allReady
            : m.lobby.needPlayers
          : m.lobby.waiting(host?.name)}
      </p>

      <div className="lobby__actions">
        <button type="button" className="btn" onClick={onLeave}>
          {m.common.leaveRoom}
        </button>
        {isHost && (
          <button type="button" className="btn btn--primary" onClick={onStart} disabled={!canStart || busy}>
            {m.lobby.start}
          </button>
        )}
      </div>
    </section>
  );
}
