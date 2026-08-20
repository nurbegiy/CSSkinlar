// Yengil tovush effektlari — tashqi audio fayllarsiz, Web Audio API orqali
// real vaqtda sintez qilinadi (tugma bosish, sahifa almashish, yutuq va h.k.)

let ctx = null;
let unlocked = false;
let enabled = true;

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  return ctx;
}

// Birinchi foydalanuvchi gesture'ida audio kontekstni "unlock" qilamiz
// (brauzerlar autoplay siyosati talabi).
export function unlockAudio() {
  if (unlocked) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
}

export function setSoundEnabled(value) {
  enabled = value;
}
export function isSoundEnabled() {
  return enabled;
}

function tone(c, { freq, start, dur, type = "sine", gain = 0.06, glideTo = null }) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function safePlay(fn) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    fn(c);
  } catch {
    /* audio ishlamasa ham ilova buzilmasin */
  }
}

// Tugma bosish — qisqa, quruq "tik"
export function playTap() {
  safePlay((c) => {
    const t = c.currentTime;
    tone(c, { freq: 720, start: t, dur: 0.05, type: "square", gain: 0.045 });
  });
}

// Tab/sahifa almashish — yumshoq "swoosh"
export function playSwoosh() {
  safePlay((c) => {
    const t = c.currentTime;
    tone(c, { freq: 320, start: t, dur: 0.14, type: "sine", gain: 0.035, glideTo: 640 });
  });
}

// Baraban aylanishi paytidagi "tik-tik" (segment o'tishi)
export function playTick() {
  safePlay((c) => {
    const t = c.currentTime;
    tone(c, { freq: 900, start: t, dur: 0.03, type: "square", gain: 0.03 });
  });
}

// Yutuq — quvnoq ko'tarilувchi arpeggio
export function playSuccess() {
  safePlay((c) => {
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      tone(c, { freq, start: t + i * 0.075, dur: 0.16, type: "triangle", gain: 0.05 });
    });
  });
}

// Katta yutuq (1000 so'm) — kengroq, boyroq akkord
export function playJackpot() {
  safePlay((c) => {
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      tone(c, { freq, start: t + i * 0.06, dur: 0.3, type: "triangle", gain: 0.055 });
    });
  });
}

// Xato / rad etish — past, xira "buzz"
export function playError() {
  safePlay((c) => {
    const t = c.currentTime;
    tone(c, { freq: 220, start: t, dur: 0.16, type: "sawtooth", gain: 0.05, glideTo: 140 });
  });
}

// Modal ochilishi — yengil "pop"
export function playOpen() {
  safePlay((c) => {
    const t = c.currentTime;
    tone(c, { freq: 480, start: t, dur: 0.09, type: "sine", gain: 0.045, glideTo: 760 });
  });
}

// Modal yopilishi
export function playClose() {
  safePlay((c) => {
    const t = c.currentTime;
    tone(c, { freq: 620, start: t, dur: 0.08, type: "sine", gain: 0.04, glideTo: 380 });
  });
}
