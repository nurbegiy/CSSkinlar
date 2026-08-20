import { playTap } from "../lib/sound.js";

const TABS = [
  { id: "home", label: "Bosh sahifa", icon: "🎯" },
  { id: "skins", label: "Skinlar", icon: "🔫" },
  { id: "withdraw", label: "Hisobim", icon: "💼" },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-line/80
                 flex justify-around py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (!isActive) playTap();
              onChange(tab.id);
            }}
            className="relative flex flex-col items-center gap-1 px-5 py-1.5 text-xs font-medium press-scale"
          >
            <span
              className={`text-lg leading-none transition-all duration-200 ${
                isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(228,175,68,0.55)]" : "opacity-70"
              }`}
            >
              {tab.icon}
            </span>
            <span
              className={`transition-colors duration-200 ${
                isActive ? "text-gold" : "text-muted"
              }`}
            >
              {tab.label}
            </span>
            <span
              className={`absolute -top-2 h-0.5 rounded-full bg-gold transition-all duration-300 ${
                isActive ? "w-6 opacity-100" : "w-0 opacity-0"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
