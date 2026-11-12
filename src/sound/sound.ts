/**
 * Sons do jogo, gerados pelo navegador (Web Audio): não há arquivos de áudio.
 * Tudo aqui é tolerante a falhas: sem suporte a áudio, as funções não fazem nada.
 */

export type SoundName = 'place' | 'draw' | 'shuffle';

export const SOUND_STORAGE_KEY = 'domimais:sound';

/** Lê a preferência de som. O padrão é ligado. */
export function readStoredSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function storeSound(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Sem armazenamento, a preferência vale só para esta visita.
  }
}

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  const AudioCtx: AudioContextClass | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!AudioCtx) return null;

  context ??= new AudioCtx();
  // Navegadores só liberam o áudio depois de uma interação do usuário.
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Só para testes: descarta o contexto de áudio criado. */
export function resetSoundContext(): void {
  context = null;
}

interface Clack {
  /** Atraso em segundos a partir de agora. */
  delay?: number;
  /** Volume de 0 a 1. */
  volume: number;
  /** Frequência central do "estalo", em Hz (mais alta = peça mais leve). */
  tone: number;
  /** Duração em segundos. */
  length: number;
}

/** Um estalo de peça: ruído curto filtrado mais uma batida grave. */
function clack(ctx: AudioContext, { delay = 0, volume, tone, length }: Clack): void {
  const start = ctx.currentTime + delay;

  const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Ruído que decai rápido: o "tec" da peça.
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 3);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = tone;
  filter.Q.value = 1.2;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = volume;
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(start);

  // Batida grave: o peso da peça na mesa.
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(tone / 8, start);
  thump.frequency.exponentialRampToValueAtTime(Math.max(40, tone / 20), start + length);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(volume * 0.6, start);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(start);
  thump.stop(start + length);
}

const RECIPES: Record<SoundName, Clack[]> = {
  // Peça colocada na mesa: estalo firme, com um leve repique.
  place: [
    { volume: 0.5, tone: 1800, length: 0.09 },
    { delay: 0.045, volume: 0.18, tone: 2400, length: 0.05 },
  ],
  // Peça comprada do monte: toque mais leve.
  draw: [{ volume: 0.22, tone: 2600, length: 0.05 }],
  // Embaralhar: vários estalos leves em sequência.
  shuffle: Array.from({ length: 14 }, (_, i) => ({
    delay: i * 0.085 + (i % 3) * 0.02,
    volume: 0.14 + (i % 4) * 0.03,
    tone: 1500 + ((i * 370) % 1300),
    length: 0.05,
  })),
};

/** Toca um som do jogo. Nunca lança erro. */
export function playSound(name: SoundName): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    for (const part of RECIPES[name]) clack(ctx, part);
  } catch {
    // Som é enfeite: uma falha de áudio nunca pode atrapalhar a partida.
  }
}
