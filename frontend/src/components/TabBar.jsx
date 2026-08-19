const TABS = [
  { id: "home", label: "Bosh sahifa", icon: "🎯" },
  { id: "skins", label: "Skinlar", icon: "🔫" },
  { id: "withdraw", label: "Yechish", icon: "💰" },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line flex justify-around py-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex flex-col items-center gap-1 px-4 py-1 text-xs font-medium transition-colors ${
            active === tab.id ? "text-gold" : "text-muted"
          }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
