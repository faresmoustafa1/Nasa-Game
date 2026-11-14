// Mission ARES — sound for the Mars scenes.
// Like the prologue, everything is synthesized with the Web Audio API: no audio
// files to load, license or cite. If audio is blocked or unsupported, every
// method silently does nothing and the scene still plays.
import { getSettings } from "./settings";

export type GameAudio = {
  /** Low engine hum of the ship. */
  hum: (on: boolean) => void;
  /** A knock from inside the locker. */
  thump: () => void;
  /** The locker door swinging open. */
  creak: () => void;
  /** A soft UI blip (tablet taps, calendar ticks). */
  blip: (freq?: number) => void;
  /** The storm siren: three rising whoops. */
  alarm: () => void;
  /** A burst of radio static (a message that did not get through). */
  crackle: () => void;
  /** A happy two-note chime. */
  chime: () => void;
  /** A short trumpet-like fanfare (the crowning). */
  fanfare: () => void;
  /** Atmosphere roar that grows, then fades, over `seconds`. */
  roar: (seconds: number) => void;
  /** The parachute opening: a short "whump". */
  chute: () => void;
  /** Landing thud and dust. */
  thud: () => void;
  /** The hatch hissing open. */
  hiss: () => void;
  /** Fade everything out and release the audio device. */
  stop: () => void;
};

const SILENT: GameAudio = {
  hum: () => {},
  thump: () => {},
  creak: () => {},
  blip: () => {},
  chime: () => {},
  fanfare: () => {},
  alarm: () => {},
  crackle: () => {},
  roar: () => {},
  chute: () => {},
  thud: () => {},
  hiss: () => {},
  stop: () => {},
};

type AudioContextCtor = typeof AudioContext;

export function createGameAudio(): GameAudio {
  if (typeof window === "undefined" || !getSettings().sound) return SILENT;

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return SILENT;

  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return SILENT;
  }

  let stopped = false;
  const resume = () => {
    if (!stopped) void ctx.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  resume();

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const safely = (fn: () => void) => {
    if (stopped) return;
    try {
      fn();
    } catch {
      /* sound is a nice-to-have; never break the scene over it */
    }
  };

  /** One enveloped tone. */
  const tone = (freq: number, start: number, length: number, peak: number, type: OscillatorType = "sine", endFreq?: number) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + length + 0.05);
  };

  /** Filtered noise, looped. Returns the gain so callers can shape it. */
  const noise = (seconds: number, lowFreq: number, highFreq: number) => {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(lowFreq, now);
    filter.frequency.linearRampToValueAtTime(highFreq, now + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    src.connect(filter).connect(gain).connect(master);
    src.start(now);
    src.stop(now + seconds + 1);
    return { gain, now };
  };

  // --- Ship hum: two low, slightly detuned tones. Off until asked. ---
  const humGain = ctx.createGain();
  humGain.gain.value = 0;
  humGain.connect(master);
  [55, 55.7].forEach((f) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 160;
    osc.connect(lp).connect(humGain);
    osc.start();
  });

  return {
    hum: (on) =>
      safely(() => {
        const now = ctx.currentTime;
        humGain.gain.cancelScheduledValues(now);
        humGain.gain.setValueAtTime(humGain.gain.value, now);
        humGain.gain.linearRampToValueAtTime(on ? 0.05 : 0, now + 1.2);
      }),

    thump: () =>
      safely(() => {
        const now = ctx.currentTime;
        tone(110, now, 0.18, 0.2, "triangle", 60);
        tone(110, now + 0.32, 0.18, 0.2, "triangle", 60);
      }),

    creak: () =>
      safely(() => {
        const now = ctx.currentTime;
        tone(300, now, 0.7, 0.05, "sawtooth", 520);
        tone(210, now + 0.1, 0.6, 0.04, "square", 330);
      }),

    alarm: () =>
      safely(() => {
        const now = ctx.currentTime;
        for (let i = 0; i < 3; i++) tone(520, now + i * 0.9, 0.8, 0.12, "square", 880);
      }),

    crackle: () =>
      safely(() => {
        const { gain, now } = noise(0.9, 4000, 1500);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.9);
      }),

    blip: (freq = 760) =>
      safely(() => {
        tone(freq, ctx.currentTime, 0.14, 0.06);
      }),

    chime: () =>
      safely(() => {
        const now = ctx.currentTime;
        tone(523.25, now, 0.7, 0.07);
        tone(783.99, now + 0.16, 0.9, 0.07);
      }),

    fanfare: () =>
      safely(() => {
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((f, i) => tone(f, now + i * 0.16, 0.24, 0.05, "square"));
        [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, now + 0.55, 1.1, 0.04, "square"));
        tone(130.81, now + 0.55, 1.1, 0.08, "triangle");
      }),

    roar: (seconds) =>
      safely(() => {
        const { gain, now } = noise(seconds, 220, 1100);
        gain.gain.exponentialRampToValueAtTime(0.5, now + seconds * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      }),

    chute: () =>
      safely(() => {
        const now = ctx.currentTime;
        tone(140, now, 0.5, 0.18, "triangle", 50);
        const { gain } = noise(0.8, 900, 400);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      }),

    thud: () =>
      safely(() => {
        const now = ctx.currentTime;
        tone(90, now, 0.5, 0.3, "sine", 38);
        const { gain } = noise(1.2, 500, 150);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      }),

    hiss: () =>
      safely(() => {
        const now = ctx.currentTime;
        const { gain } = noise(1.2, 6000, 3000);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      }),

    stop: () => {
      if (stopped) return;
      stopped = true;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      try {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.4);
        window.setTimeout(() => void ctx.close().catch(() => {}), 600);
      } catch {
        /* ignore */
      }
    },
  };
}
