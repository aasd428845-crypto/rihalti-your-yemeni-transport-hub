/**
 * Notification sound utility using Web Audio API.
 * Keeps AudioContext alive across tab switches and mobile suspensions.
 */

let audioCtx: AudioContext | null = null;

function getOrCreateCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Resume suspended context — called on every user gesture
function tryResume() {
  const ctx = getOrCreateCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// Keep AudioContext alive by resuming on every interaction
if (typeof window !== "undefined") {
  ["click", "touchstart", "touchend", "keydown", "pointerdown"].forEach((evt) => {
    window.addEventListener(evt, tryResume, { passive: true, capture: true });
  });
}

function getCtx(): AudioContext | null {
  const ctx = getOrCreateCtx();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function beep(
  frequencies: number[],
  stepDuration: number,
  volume = 0.35,
  type: OscillatorType = "sine"
) {
  const ctx = getCtx();
  if (!ctx || ctx.state === "suspended") return;

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
