import { useEffect, useState } from "react";
import { api } from "./api.js";
import BalanceHeader from "./components/BalanceHeader.jsx";
import Wheel from "./components/Wheel.jsx";
import Skins from "./components/Skins.jsx";
import Withdraw from "./components/Withdraw.jsx";
import TabBar from "./components/TabBar.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .auth()
      .then((res) => setUser(res.user))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleBalanceUpdate(newBalance, lastSpinAt) {
    setUser((prev) => ({
      ...prev,
      balance: newBalance,
      ...(lastSpinAt ? { last_spin_at: lastSpinAt } : {}),
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Yuklanmoqda...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-danger font-medium">Xatolik yuz berdi</p>
        <p className="text-sm text-muted">{error}</p>
        <p className="text-xs text-muted mt-2">
          Iltimos, ilovani Telegram ichidan oching (brauzerda to'g'ridan-to'g'ri ishlamaydi).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <BalanceHeader user={user} />

      <main className="px-5 flex flex-col gap-4">
        {tab === "home" && <Wheel user={user} onBalanceUpdate={handleBalanceUpdate} />}
        {tab === "skins" && <Skins />}
        {tab === "withdraw" && <Withdraw user={user} onBalanceUpdate={handleBalanceUpdate} />}
      </main>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
