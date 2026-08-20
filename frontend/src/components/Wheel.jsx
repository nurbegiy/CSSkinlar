import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";
import { playSwoosh, playSuccess, playJackpot, playError } from "../lib/sound.js";

// Burchaklar soat yo'nalishi bo'yicha, 0° = tepada (ko'rsatkich turgan joy).
// Ranglar CS2'ning haqiqiy rarity (noyoblik) tizimidan olingan:
// kulrang(consumer) -> ko'k(mil-spec) -> siyohrang(restricted) -> qizil(covert)
const SEGMENTS = [
  { amount: 0, label: "0", color: "#5B6472", glow: "rgba(91,100,114,0.35)", start: 270, end: 360, midAngle: 315 },
  { amount: 200, label: "200", color: "#4B69FF", glow: "rgba(75,105,255,0.45)", start: 0, end: 90, midAngle: 45 },
  { amount: 1000, label: "1000", color: "#EB4B4B", glow: "rgba(235,75,75,0.5)", start: 90, end: 180, midAngle: 135 },
  { amount: 500, label: "500", color: "#8847FF", glow: "rgba(136,71,255,0.45)", start: 180, end: 270, midAngle: 225 },
];

const WHEEL_SIZE = 256;
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS = 84;

function labelPos(midAngle) {
  const rad = (midAngle * Math.PI) / 180;
  const x = RADIUS + LABEL_RADIUS * Math.sin(rad);
  const y = RADIUS - LABEL_RADIUS * Math.cos(rad);
  return { left: x, top: y };
}

function targetRotationMod(midAngle) {
  return (360 - midAngle + 360) % 360;
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function Wheel({ user, onBalanceUpdate }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextSpinAt = user?.last_spin_at
    ? new Date(user.last_spin_at).getTime() + 24 * 60 * 60 * 1000
    : null;
  const msRemaining = nextSpinAt ? nextSpinAt - now : 0;
  const canSpin = !nextSpinAt || msRemaining <= 0;

  async function handleSpin() {
    if (spinning || !canSpin) return;
    setError(null);
    setResult(null);
    setSpinning(true);
    playSwoosh();
    WebApp.HapticFeedback?.impactOccurred("medium");

    try {
      const { outcome, balance } = await api.spin();

      const segment = SEGMENTS.find((s) => s.amount === outcome.amount);
      if (!segment) throw new Error("Noma'lum yutuq qiymati: " + outcome.amount);

      const jitter = Math.random() * 40 - 20;
      const desiredMod = (targetRotationMod(segment.midAngle) + jitter + 360) % 360;

      const currentMod = ((rotation % 360) + 360) % 360;
      const deltaToTarget = (desiredMod - currentMod + 360) % 360;
      const extraFullSpins = 6 * 360;

      const newRotation = rotation + extraFullSpins + deltaToTarget;
      setRotation(newRotation);

      setTimeout(() => {
        setResult(outcome);
        setSpinning(false);
        if (outcome.amount >= 1000) {
          playJackpot();
          WebApp.HapticFeedback?.notificationOccurred("success");
        } else if (outcome.amount > 0) {
          playSuccess();
          WebApp.HapticFeedback?.notificationOccurred("success");
        } else {
          playError();
          WebApp.HapticFeedback?.notificationOccurred("warning");
        }
        onBalanceUpdate(balance, new Date().toISOString());
      }, 4500);
    } catch (err) {
      setError(err.message);
      setSpinning(false);
      playError();
    }
  }

  return (
    <div className="card-surface rounded-2xl p-6 flex flex-col items-center gap-5">
      <div className="text-center">
        <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-medium">
          Har 24 soatda bir marta
        </p>
        <h2 className="font-display text-2xl font-bold tracking-wide text-gold">
          KUNLIK BARABAN
        </h2>
      </div>

      <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        {/* Fon nurlanish (glow) */}
        <div
          className={`absolute -inset-4 rounded-full blur-2xl ${!spinning && canSpin ? "pulse-glow" : ""}`}
          style={{ background: "radial-gradient(circle, rgba(228,175,68,0.28), transparent 70%)" }}
        />

        {/* Aylanuvchi disk */}
        <div
          className="absolute inset-0 rounded-full shadow-[0_0_0_1px_rgba(52,60,74,0.8)]"
          style={{
            background: `conic-gradient(from 0deg, ${SEGMENTS.slice()
              .sort((a, b) => a.start - b.start)
              .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
              .join(", ")})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.5s cubic-bezier(0.17,0.67,0.32,1)" : "none",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.45), 0 20px 40px -18px rgba(0,0,0,0.7)",
          }}
        >
          {SEGMENTS.map((seg) => {
            const pos = labelPos(seg.midAngle);
            return (
              <span
                key={seg.label}
                className="absolute font-display text-xl font-bold text-white"
                style={{
                  left: pos.left,
                  top: pos.top,
                  transform: "translate(-50%, -50%)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.55)",
                }}
              >
                {seg.label}
              </span>
            );
          })}

          {/* Shisha (glass) dome effekti */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 32% 22%, rgba(255,255,255,0.22), transparent 42%)",
            }}
          />
        </div>

        {/* Markaziy hub */}
        <div
          className="octagon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14
                     bg-gradient-to-br from-surface3 to-ink border border-lineBright
                     flex items-center justify-center z-10 shadow-goldGlow"
        >
          <span className="text-lg">🔒</span>
        </div>

        {/* Ko'rsatkich */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div
            className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[15px] border-t-gold"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
          />
        </div>
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning || !canSpin}
        className="octagon press-scale w-full py-3.5 font-display text-lg font-semibold tracking-wide
                   bg-gradient-to-r from-gold to-[#F0C468] text-ink
                   disabled:from-surface2 disabled:to-surface2 disabled:text-muted
                   transition-colors shadow-goldGlow disabled:shadow-none"
      >
        {spinning ? "AYLANMOQDA..." : canSpin ? "AYLANTIRISH" : "ERTAGA QAYTING"}
      </button>

      {!canSpin && !spinning && (
        <p className="font-mono text-sm text-muted tabular-nums">
          Keyingi aylantirish: <span className="text-text">{formatCountdown(msRemaining)}</span>
        </p>
      )}

      {result && (
        <p className="text-sm text-muted">
          Yutuq:{" "}
          <span className={`font-semibold ${result.amount > 0 ? "text-gold" : "text-muted"}`}>
            {result.amount} so'm
          </span>
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
