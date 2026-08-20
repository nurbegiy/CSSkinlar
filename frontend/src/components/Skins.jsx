import { useEffect, useState } from "react";
import { api } from "../api.js";
import { playOpen, playClose, playTap } from "../lib/sound.js";

// Narx darajasiga qarab CS2 rarity (noyoblik) rangi va nomi
function rarityFor(price) {
  const p = Number(price);
  if (p >= 1000000) return { name: "Covert", color: "#EB4B4B" };
  if (p >= 400000) return { name: "Classified", color: "#D32CE6" };
  if (p >= 150000) return { name: "Restricted", color: "#8847FF" };
  if (p >= 50000) return { name: "Mil-Spec", color: "#4B69FF" };
  return { name: "Consumer", color: "#9DA8B5" };
}

export default function Skins() {
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api
      .skins()
      .then((d) => setSkins(d.skins))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    function onKey(e) {
      if (e.key === "Escape") closeLightbox();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  function openLightbox(skin) {
    playOpen();
    setActive(skin);
  }
  function closeLightbox() {
    playClose();
    setActive(null);
  }

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-wide text-gold">
          CS2 SKINLAR
        </h2>
        <p className="text-sm text-muted mt-1">
          Balansingizni shu skinlardan biriga almashtirishingiz mumkin. Rasmga bosib kattalashtiring.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface2 shimmer" />
          ))}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && skins.length === 0 && (
        <p className="text-sm text-muted">Hozircha skinlar qo'shilmagan.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {skins.map((skin) => {
          const rarity = rarityFor(skin.price);
          return (
            <button
              key={skin.id}
              onClick={() => openLightbox(skin)}
              className="press-scale text-left bg-surface2 border border-line rounded-xl overflow-hidden flex flex-col group"
              style={{ boxShadow: `0 0 0 1px ${rarity.color}22` }}
            >
              <div
                className="aspect-square bg-ink flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${rarity.color}1f, #0A0C10 70%)`,
                }}
              >
                {skin.image_url ? (
                  <img
                    src={skin.image_url}
                    alt={skin.name}
                    className="w-full h-full object-contain p-3 transition-transform duration-300 group-active:scale-95"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-3xl">🔫</span>
                )}
              </div>
              <div
                className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${rarity.color}, transparent)` }}
              />
              <div className="p-3 flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: rarity.color }}>
                  {rarity.name}
                </p>
                <p className="text-xs font-medium leading-tight line-clamp-2">{skin.name}</p>
                <p className="text-sm font-mono font-bold text-gold">
                  {Number(skin.price).toLocaleString("ru-RU")} so'm
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 overlay-in"
          style={{ background: "rgba(6,7,9,0.82)", backdropFilter: "blur(6px)" }}
          onClick={closeLightbox}
        >
          <div
            className="modal-in card-surface rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 relative"
            style={{ boxShadow: `0 0 0 1px ${rarityFor(active.price).color}44, 0 30px 60px -20px rgba(0,0,0,0.8)` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface2 border border-line
                         flex items-center justify-center text-muted press-scale z-10"
              aria-label="Yopish"
            >
              ✕
            </button>

            <div
              className="aspect-square rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${rarityFor(active.price).color}33, #0A0C10 72%)`,
              }}
            >
              {active.image_url ? (
                <img
                  src={active.image_url}
                  alt={active.name}
                  className="w-full h-full object-contain p-6"
                />
              ) : (
                <span className="text-6xl">🔫</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <p
                className="text-xs uppercase tracking-wide font-semibold"
                style={{ color: rarityFor(active.price).color }}
              >
                {rarityFor(active.price).name}
              </p>
              <h3 className="font-display text-lg font-bold text-text leading-tight">{active.name}</h3>
              <p className="font-mono text-xl font-bold text-gold">
                {Number(active.price).toLocaleString("ru-RU")} so'm
              </p>
            </div>

            <button
              onClick={() => {
                playTap();
                closeLightbox();
              }}
              className="octagon press-scale w-full py-3 font-display font-semibold bg-gold text-ink"
            >
              YOPISH
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
