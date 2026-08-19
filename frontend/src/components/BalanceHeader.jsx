export default function BalanceHeader({ user }) {
  const balance = Number(user?.balance ?? 0);
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-3">
      <div>
        <p className="text-xs text-muted uppercase tracking-wide">Balans</p>
        <p className="font-display text-2xl font-bold text-gold">
          {balance.toLocaleString("ru-RU")} <span className="text-sm text-muted">so'm</span>
        </p>
      </div>
      <div className="octagon w-12 h-12 bg-surface2 border border-line flex items-center justify-center text-xl">
        🎮
      </div>
    </header>
  );
}
