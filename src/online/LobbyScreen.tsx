import { useTheme } from '../theme/useTheme';
import { useSound } from '../sound/useSound';
import { SoundToggle } from '../components/SoundToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import { OnlineLobby } from './OnlineLobby';
import { ChatPanel } from './ChatPanel';
import type { OnlineRoom } from './useOnlineRoom';

/** Tela da sala de espera do modo online. */
export function LobbyScreen({ online }: { online: OnlineRoom }) {
  const { theme, toggleTheme } = useTheme();
  const { soundOn, toggleSound } = useSound();
  if (!online.view) return null;

  return (
    <main className="home">
      <div className="home__topbar">
        <span className="wordmark">DomiMais</span>
        <div className="home__actions">
          <SoundToggle soundOn={soundOn} onToggle={toggleSound} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
      <OnlineLobby
        view={online.view}
        busy={online.busy}
        onAddBot={(level) => void online.addBot(level)}
        onRemoveSeat={(seatId) => void online.removeSeat(seatId)}
        onStart={() => void online.start()}
        onLeave={() => void online.leave()}
      />
      <div className="lobby lobby__chat">
        <ChatPanel view={online.view} online={online} compact />
      </div>
    </main>
  );
}
