import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api.js";

const MIN_WITHDRAWAL = 28000; // UI'da ko'rsatish uchun — haqiqiy tekshiruv backendda bo'ladi

export default function Withdraw({ user, onBalanceUpdate }) {
  const [mode, setMode] = useState("card"); // "card" | "skin"
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [amount, setAmount] = useState("");
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
      const payload =
        mode === "card"
          ? { type: "card", cardNumber, cardHolder, amount: Number(amount) }
          : { type: "skin", steamTradeUrl, skinId };

      const res = await api.withdraw(payload);
      setMessage({ type: "success", text: `So'rov #${res.withdrawal.id} yuborildi. Admin tasdiqlashini kuting.` });
      onBalanceUpdate(res.newBalance);
      setCardNumber("");
      setCardHolder("");
      setAmount("");
      setSteamTradeUrl("");
      setSkinId(null);
      WebApp.HapticFeedback?.notificationOccurred("success");
      api.myWithdrawals().then((d) => setHistory(d.withdrawals)).catch(() => {});
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      WebApp.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold tracking-wide text-blue">
        PULNI YECHIB OLISH
      </h2>
      <p className="text-sm text-muted">
        Balansingiz: <span className="text-text font-semibold">{balance.toLocaleString("ru-RU")} so'm</span>
        {" · "}Minimal: {MIN_WITHDRAWAL.toLocaleString("ru-RU")} so'm
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("card")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
            mode === "card" ? "bg-gold text-ink border-gold" : "border-line text-muted"
          }`}
        >
          💳 Karta
        </button>
        <button
          type="button"
          onClick={() => setMode("skin")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
            mode === "skin" ? "bg-gold text-ink border-gold" : "border-line text-muted"
          }`}
        >
          🔫 CS2 Skin
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "card" && (
          <>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Karta raqami (8600 XXXX XXXX XXXX)"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              required
              className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <input
              type="text"
              placeholder="Karta egasining F.I.SH."
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              required
              className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <input
              type="number"
              placeholder={`Summa (so'm) — min. ${MIN_WITHDRAWAL.toLocaleString("ru-RU")}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MIN_WITHDRAWAL}
              max={balance}
              required
              className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold"
            />
          </>
        )}

        {mode === "skin" && (
          <>
            <select
              value={skinId ?? ""}
              onChange={(e) => setSkinId(Number(e.target.value))}
              required
              className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold"
            >
              <option value="" disabled>Skin tanlang</option>
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
              className="bg-surface2 border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-gold"
            />
            {selectedSkin && (
              <p className="text-xs text-muted">
                Balansingizdan {Number(selectedSkin.price).toLocaleString("ru-RU")} so'm yechiladi.
              </p>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="octagon w-full py-3 font-display font-semibold bg-gold text-ink disabled:opacity-60"
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
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-sm font-semibold text-muted">So'rovlar tarixi</h3>
          {history.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between bg-surface2 border border-line rounded-xl px-3 py-2 text-xs"
            >
              <span>
                #{w.id} · {w.type === "card" ? "Karta" : "Skin"} · {Number(w.amount).toLocaleString("ru-RU")} so'm
              </span>
              <span
                className={
                  w.status === "completed"
                    ? "text-success"
                    : w.status === "rejected"
                    ? "text-danger"
                    : "text-gold"
                }
              >
                {w.status === "completed" ? "To'landi" : w.status === "rejected" ? "Bekor qilindi" : "Kutilmoqda"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
