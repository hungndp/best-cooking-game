// Tiny synthesised sound effects, made with the Web Audio API and no audio
// files at all: a sizzle, a ding, a coin clink, a thud and a fanfare. The
// kitchen stays silent until the player first interacts (browsers demand a
// gesture before audio), and M toggles it off.

export function createAudio() {
  let context = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
      const length = Math.floor(context.sampleRate * 0.4);
      noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, when) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain || 0.12, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, gain, filterFreq, when) {
    const ctx = ensure();
    if (ctx === null || muted || noiseBuffer === null) return;
    const t0 = ctx.currentTime + (when || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 5200;
    filter.Q.value = 0.8;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain || 0.08, t0 + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    /** Call from the first click or key press: browsers need a gesture. */
    unlock() {
      const ctx = ensure();
      if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone(660, 0.06, 'triangle', 0.07);
    },
    add() {
      tone(520, 0.07, 'triangle', 0.09);
      tone(780, 0.08, 'triangle', 0.07, 0.05);
    },
    sizzle() {
      noise(0.45, 0.1, 5200);
      tone(180, 0.2, 'sawtooth', 0.03);
    },
    ready() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1174, 0.18, 'sine', 0.12, 0.1);
    },
    coin() {
      tone(987, 0.09, 'sine', 0.12);
      tone(1318, 0.22, 'sine', 0.12, 0.07);
    },
    error() {
      tone(160, 0.16, 'square', 0.07);
      tone(120, 0.2, 'square', 0.07, 0.09);
    },
    burnt() {
      noise(0.5, 0.09, 900);
      tone(110, 0.3, 'sawtooth', 0.06);
    },
    fanfare() {
      tone(523, 0.14, 'triangle', 0.12);
      tone(659, 0.14, 'triangle', 0.12, 0.12);
      tone(784, 0.14, 'triangle', 0.12, 0.24);
      tone(1046, 0.3, 'triangle', 0.14, 0.36);
    },
    rush() {
      tone(440, 0.1, 'square', 0.06);
      tone(554, 0.1, 'square', 0.06, 0.1);
      tone(659, 0.16, 'square', 0.06, 0.2);
    },
  };
}
