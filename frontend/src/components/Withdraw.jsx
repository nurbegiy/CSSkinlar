import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";
import { playSuccess, playError, playTap } from "../lib/sound.js";

const ADMIN_USERNAME = "ozimiz_ad";
const ADMIN_URL = `https://t.me/${ADMIN_USERNAME}`;

function openAdmin() {
  playTap();
  if (WebApp?.openTelegramLink) {
    WebApp.openTelegramLink(ADMIN_URL);
  } else {
    window.open(ADMIN_URL, "_blank");
  }
}

export default function Withdraw({ user, onBalanceUpdate }) {
  const [steamTradeUrl, setSteamTradeUrl] = useState("");
  const [skins, setSkins] = useState([]);
  const [skinId, setSkinId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.skins().then((d) => setSkins(d.skins)).catch(() => {});
    api.myWithdrawals().then((d) => setHistory(d.withdrawals)).catch(() => {});
  }, []);

  const balance = Number(user?.balance ?? 0);
  const selectedSkin = skins.find((s) => s.id === skinId);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await api.withdraw({ type: "skin", steamTradeUrl, skinId });
      setMessage({
        type: "success",
        text: `So'rov #${res.withdrawal.id} yuborildi. Admin tasdiqlab, skinni yuboradi.`,
      });
      onBalanceUpdate(res.newBalance);
      setSteamTradeUrl("");
      setSkinId(null);
      WebApp.HapticFeedback?.notificationOccurred("success");
      playSuccess();
      api.myWithdrawals().then((d) => setHistory(d.withdrawals)).catch(() => {});
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      WebApp.HapticFeedback?.notificationOccurred("error");
      playError();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Balansni to'ldirish — faqat admin bilan bog'lanish, avto to'lov yo'q */}
      <div className="card-surface rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h2 className="font-display text-xl font-semibold tracking-wide text-blue">
            BALANSNI TO'LDIRISH
          </h2>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Balans kunlik baraban va do'stlaringizni taklif qilish (referal) orqali oshadi.
          Qo'shimcha savol yoki balans bo'yicha murojaat uchun to'g'ridan-to'g'ri admin bilan
          bog'laning.
        </p>
        <button
          onClick={openAdmin}
          className="octagon press-scale w-full py-3 font-display font-semibold tracking-wide
                     bg-gradient-to-r from-blue to-[#6E87FF] text-white flex items-center justify-center gap-2"
        >
          <span>✈️</span> ADMIN BILAN BOG'LANISH
        </button>
        <p className="text-xs text-muted text-center font-mono">@{ADMIN_USERNAME}</p>
      </div>

      {/* Skinni yechib olish so'rovi */}
      <div className="card-surface rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔫</span>
          <h2 className="font-display text-xl font-semibold tracking-wide text-gold">
            SKIN SO'RASH
          </h2>
        </div>
        <p className="text-sm text-muted">
          Balansingiz:{" "}
          <span className="font-mono text-text font-semibold">
            {balance.toLocaleString("ru-RU")} so'm
          </span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <select
            value={skinId ?? ""}
            onChange={(e) => setSkinId(Number(e.target.value))}
            required
            className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none
                       focus:border-gold transition-colors"
          >
            <option value="" disabled>
              Skin tanlang
            </option>
            {skins.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {Number(s.price).toLocaleString("ru-RU")} so'm
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Steam Trade URL"
            value={steamTradeUrl}
            onChange={(e) => setSteamTradeUrl(e.target.value)}
            required
            className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none
                       focus:border-gold transition-colors"
          />
          {selectedSkin && (
            <p className="text-xs text-muted">
              Balansingizdan{" "}
              <span className="font-mono text-text">
                {Number(selectedSkin.price).toLocaleString("ru-RU")} so'm
              </span>{" "}
              yechiladi.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="octagon press-scale w-full py-3 font-display font-semibold bg-gold text-ink
                       disabled:opacity-60 shadow-goldGlow disabled:shadow-none"
          >
            {submitting ? "YUBORILMOQDA..." : "SO'ROV YUBORISH"}
          </button>
        </form>

        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>
            {message.text}
          </p>
        )}

        {history.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <h3 className="text-sm font-semibold text-muted">So'rovlar tarixi</h3>
            {history.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between bg-surface2 border border-line
                           rounded-xl px-3 py-2.5 text-xs"
              >
                <span className="font-mono">
                  #{w.id} · {w.skin_name || "Skin"} ·{" "}
                  {Number(w.amount).toLocaleString("ru-RU")} so'm
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    w.status === "completed"
                      ? "bg-success/15 text-success"
                      : w.status === "rejected"
                      ? "bg-danger/15 text-danger"
                      : "bg-gold/15 text-gold"
                  }`}
                >
                  {w.status === "completed"
                    ? "Yuborildi"
                    : w.status === "rejected"
                    ? "Bekor qilindi"
                    : "Kutilmoqda"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
