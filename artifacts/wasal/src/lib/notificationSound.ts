/**
 * Notification sound utility using Web Audio API.
 * Works in all modern browsers. No audio files needed.
 */

let audioCtx: AudioContext | null = null;
let userInteracted = false;

// Track first user interaction to pre-warm AudioContext
if (typeof window !== "undefined") {
  const warmup = () => {
    userInteracted = true;
    if (!audioCtx) {
      try {
        audioCtx = new AudioContext();
      } catch {}
    }
    window.removeEventListener("click", warmup);
    window.removeEventListener("touchstart", warmup);
    window.removeEventListener("keydown", warmup);
  };
  window.addEventListener("click", warmup, { once: true });
  window.addEventListener("touchstart", warmup, { once: true });
  window.addEventListener("keydown", warmup, { once: true });
}

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function beep(
  frequencies: number[],
  stepDuration: number,
  volume = 0.35,
  type: OscillatorType = "sine"
) {
  const ctx = getCtx();
  if (!ctx) return;

  try {
    const totalDuration = frequencies.length * stepDuration;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + totalDuration);

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * stepDuration);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * stepDuration);
      osc.stop(ctx.currentTime + i * stepDuration + stepDuration);
    });
  } catch {}
}

/** New delivery order — urgent ascending triple beep */
export function playNewOrderSound() {
  beep([660, 880, 1100, 880, 1100], 0.12, 0.45, "square");
}

/** General notification — single soft chime */
export function playNotificationSound() {
  beep([784, 1047], 0.18, 0.3, "sine");
}

/** Order confirmed / success */
export function playSuccessSound() {
  beep([523, 659, 784, 1047], 0.1, 0.3, "sine");
}

/** Chat message */
export function playChatSound() {
  beep([880, 1100], 0.1, 0.25, "sine");
}
