import { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";

// DOM tartibi (grid-cols-2 grid-rows-2, rounded-full ichida) — har bir katak
// aylana ichida 90 gradusli "pie" bo'lakka aylanadi. Ko'rsatkich tepada (0°)
// turibdi, burchak soat yo'nalishi bo'yicha 0°dan hisoblanadi:
//   row1-col1 (0 so'm)   -> 270°–360° (soat 9–12)
//   row1-col2 (200 so'm) -> 0°–90°    (soat 12–3)
//   row2-col1 (500 so'm) -> 180°–270° (soat 6–9)
//   row2-col2 (1000 so'm)-> 90°–180°  (soat 3–6)
const SEGMENTS = [
  { amount: 0, label: "0", color: "#252A32", midAngle: 315 },
  { amount: 200, label: "200", color: "#4C8EFF", midAngle: 45 },
  { amount: 500, label: "500", color: "#FFB020", midAngle: 225 },
  { amount: 1000, label: "1000", color: "#EB4B4B", midAngle: 135 },
];

// Wheel `mid`gradusga aylantirilganda, ko'rsatkich (0° nuqtada, tepada)
// aynan shu segment ustida to'xtashi uchun kerakli burilish miqdori (mod 360).
function targetRotationMod(midAngle) {
  return (360 - midAngle + 360) % 360;
}

export default function Wheel({ user, onBalanceUpdate }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canSpin = () => {
    if (!user?.last_spin_at) return true;
    return Date.now() - new Date(user.last_spin_at).getTime() >= 24 * 60 * 60 * 1000;
  };

  async function handleSpin() {
    if (spinning || !canSpin()) return;
    setError(null);
    setResult(null);
    setSpinning(true);
    WebApp.HapticFeedback?.impactOccurred("medium");

    try {
      const { outcome, balance } = await api.spin();

      const segment = SEGMENTS.find((s) => s.amount === outcome.amount);
      if (!segment) throw new Error("Noma'lum yutuq qiymati: " + outcome.amount);

      // Har bir segment 90° kenglikda, mid ±45° chekka hisoblanadi —
      // ko'rsatkich chekkaga juda yaqin to'xtamasligi uchun ±20° ichida jitter beramiz.
      const jitter = Math.random() * 40 - 20;
      const desiredMod = (targetRotationMod(segment.midAngle) + jitter + 360) % 360;

      const currentMod = ((rotation % 360) + 360) % 360;
      const deltaToTarget = (desiredMod - currentMod + 360) % 360;
      const extraFullSpins = 4 * 360; // faqat vizual effekt uchun

      const newRotation = rotation + extraFullSpins + deltaToTarget;
      setRotation(newRotation);

      setTimeout(() => {
        setResult(outcome);
        setSpinning(false);
        WebApp.HapticFeedback?.notificationOccurred(
          outcome.amount > 0 ? "success" : "warning"
        );
        onBalanceUpdate(balance, new Date().toISOString());
      }, 4500);
    } catch (err) {
      setError(err.message);
      setSpinning(false);
    }
  }

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col items-center gap-4">
      <h2 className="font-display text-xl font-semibold tracking-wide text-gold">
        KUNLIK BARABAN
      </h2>

      <div className="relative w-56 h-56">
        <div
          className="w-full h-full rounded-full border-4 border-line grid grid-cols-2 grid-rows-2 overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? "transform 4.5s cubic-bezier(0.17,0.67,0.32,1)"
              : "none",
          }}
        >
          {SEGMENTS.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center justify-center font-display text-lg font-bold"
              style={{ background: seg.color }}
            >
              {seg.label}
            </div>
          ))}
        </div>
        {/* Ko'rsatkich */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-gold z-10" />
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning || !canSpin()}
        className="octagon w-full py-3 font-display text-lg font-semibold tracking-wide
                   bg-gold text-ink disabled:bg-surface2 disabled:text-muted transition-colors"
      >
        {spinning
          ? "AYLANMOQDA..."
          : canSpin()
          ? "AYLANTIRISH"
          : "ERTAGA QAYTING"}
      </button>

      {result && (
        <p className="text-sm text-muted">
          Yutuq: <span className="text-gold font-semibold">{result.amount} so'm</span>
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
