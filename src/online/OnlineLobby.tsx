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
function seatTags(seat: SeatView): string[] {
  const tags: string[] = [];
  if (seat.isYou) tags.push('Você');
  if (seat.isHost) tags.push('Dono da sala');
  if (seat.kind === 'bot' && seat.botLevel) tags.push(`Computador · ${BOT_LEVEL_LABELS[seat.botLevel]}`);
  if (seat.kind === 'human' && !seat.connected) tags.push('Sem conexão');
  return tags;
}

/** Sala de espera: código para convidar, lugares e o botão de começar. */
export function OnlineLobby({ view, busy = false, onAddBot, onRemoveSeat, onStart, onLeave }: OnlineLobbyProps) {
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
      .share({ title: 'DomiMais', text: `Vem jogar DomiMais comigo! Sala ${view.code}`, url: link })
      .catch(() => undefined);
  };

  return (
    <section className="lobby" aria-label="Sala de espera">
      <div className="lobby__code-box">
        <span className="lobby__label">Código da sala</span>
        <span className="lobby__code" aria-label={`Código da sala: ${view.code.split('').join(' ')}`}>
          {view.code}
        </span>
        <p className="lobby__hint">Envie o código ou o link para os amigos entrarem.</p>
        <div className="lobby__share">
          <button type="button" className="btn" onClick={copyLink}>
            {copied ? 'Link copiado!' : 'Copiar link'}
          </button>
          {canShare && (
            <button type="button" className="btn" onClick={share}>
              Compartilhar
            </button>
          )}
        </div>
      </div>

      <div className="lobby__seats">
        <h2 className="lobby__title">
          Jogadores ({view.seats.length} de {MAX_ROOM_PLAYERS})
        </h2>
        <ol className="lobby__list">
          {view.seats.map((seat) => (
            <li key={seat.id} className="lobby__seat" data-testid="lobby-seat">
              <span className="lobby__seat-name">
                {seat.kind === 'bot' && <CpuIcon size={16} />}
                {seat.name}
              </span>
              <span className="lobby__tags">
                {seatTags(seat).map((tag) => (
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
                  aria-label={`Tirar ${seat.name} da sala`}
                  disabled={busy}
                >
                  Tirar
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: free }, (_, index) => (
            <li key={`free-${index}`} className="lobby__seat lobby__seat--free">
              Vaga livre
            </li>
          ))}
        </ol>

        {isHost && free > 0 && (
          <div className="lobby__bot">
            <fieldset className="player-count">
              <legend className="player-form__label">Completar uma vaga com o computador</legend>
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
                    {BOT_LEVEL_LABELS[option]}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn--block" onClick={() => onAddBot(level)} disabled={busy}>
              Adicionar computador
            </button>
          </div>
        )}
      </div>

      <p className="lobby__status" role="status">
        {isHost
          ? canStart
            ? 'Todos prontos? Comece quando quiser.'
            : 'Chame pelo menos mais um jogador ou adicione o computador.'
          : `Aguardando ${host?.name ?? 'o dono da sala'} começar a partida…`}
      </p>

      <div className="lobby__actions">
        <button type="button" className="btn" onClick={onLeave}>
          Sair da sala
        </button>
        {isHost && (
          <button type="button" className="btn btn--primary" onClick={onStart} disabled={!canStart || busy}>
            Começar partida
          </button>
        )}
      </div>
    </section>
  );
}
