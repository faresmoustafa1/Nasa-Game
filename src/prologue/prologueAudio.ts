// Mission ARES — prologue sound.
// Everything is synthesized with the Web Audio API, so there are no audio
// files to load, license or cite. If audio is blocked or unsupported, every
// method silently does nothing and the scene still plays.
import { getSettings } from "../game/settings";

export type PrologueAudio = {
  /** One soft countdown beep. */
  tick: () => void;
  /** "Ding-dong" loudspeaker chime before the announcement. */
  announce: () => void;
  /** Heavy metal door slamming shut. */
  clang: () => void;
  /** Fade the crickets out (the field goes quiet when the fog rolls in). */
  hushCrickets: () => void;
  /** Engine rumble that grows over `seconds`. */
  rumble: (seconds: number) => void;
  /** Fade everything out and release the audio device. */
  stop: () => void;
};

const SILENT: PrologueAudio = {
  tick: () => {},
  announce: () => {},
  clang: () => {},
  hushCrickets: () => {},
  rumble: () => {},
  stop: () => {},
};

type AudioContextCtor = typeof AudioContext;

export function createPrologueAudio(): PrologueAudio {
  if (typeof window === "undefined" || !getSettings().sound) return SILENT;

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext;
  if (!Ctor) return SILENT;

  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return SILENT;
  }

  let stopped = false;

  // Browsers keep audio paused until the player touches the page.
  // Mount the prologue from a "Play" button and this resolves immediately.
  const resume = () => {
    if (!stopped) void ctx.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  resume();

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  // --- Crickets: a high tone, chopped into a fast trill, in slow bursts. ---
  const crickets = ctx.createGain();
  crickets.gain.value = 0.03;
  crickets.connect(master);

  const chirp = ctx.createOscillator();
  chirp.type = "sine";
  chirp.frequency.value = 4300;

  const trill = ctx.createGain();
  trill.gain.value = 0.5;
  const trillLfo = ctx.createOscillator();
  trillLfo.frequency.value = 31;
  const trillDepth = ctx.createGain();
  trillDepth.gain.value = 0.5;
  trillLfo.connect(trillDepth).connect(trill.gain);

  const burst = ctx.createGain();
  burst.gain.value = 0.5;
  const burstLfo = ctx.createOscillator();
  burstLfo.frequency.value = 1.25;
  const burstDepth = ctx.createGain();
  burstDepth.gain.value = 0.5;
  burstLfo.connect(burstDepth).connect(burst.gain);

  chirp.connect(trill).connect(burst).connect(crickets);
  chirp.start();
  trillLfo.start();
  burstLfo.start();

  const safely = (fn: () => void) => {
    if (stopped) return;
    try {
      fn();
    } catch {
      /* sound is a nice-to-have; never break the scene over it */
    }
  };

  return {
    tick: () =>
      safely(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 880;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.connect(gain).connect(master);
        osc.start(now);
        osc.stop(now + 0.15);
      }),

    announce: () =>
      safely(() => {
        const now = ctx.currentTime;
        [659.25, 523.25].forEach((freq, i) => {
          const start = now + i * 0.45;
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
          osc.connect(gain).connect(master);
          osc.start(start);
          osc.stop(start + 1);
        });
      }),

    clang: () =>
      safely(() => {
        const now = ctx.currentTime;
        [196, 207, 415].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = freq;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
          osc.connect(gain).connect(master);
          osc.start(now);
          osc.stop(now + 0.75);
        });
      }),

    hushCrickets: () =>
      safely(() => {
        const now = ctx.currentTime;
        crickets.gain.cancelScheduledValues(now);
        crickets.gain.setValueAtTime(crickets.gain.value, now);
        crickets.gain.linearRampToValueAtTime(0, now + 2.5);
      }),

    rumble: (seconds: number) =>
      safely(() => {
        const now = ctx.currentTime;

        // Two seconds of white noise, looped and filtered down to a rumble.
        const length = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.setValueAtTime(140, now);
        lowpass.frequency.linearRampToValueAtTime(520, now + seconds);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.7, now + seconds);

        noise.connect(lowpass).connect(gain).connect(master);
        noise.start(now);
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
      } catch {
        /* ignore */
      }
      window.setTimeout(() => void ctx.close().catch(() => {}), 500);
    },
  };
}
