import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Skins() {
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .skins()
      .then((d) => setSkins(d.skins))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold tracking-wide text-gold">
        CS2 SKINLAR
      </h2>
      <p className="text-sm text-muted">
        Balansingizni shu skinlardan biriga almashtirishingiz mumkin.
        Tanlash uchun "Yechish" bo'limiga o'ting.
      </p>

      {loading && <p className="text-sm text-muted">Yuklanmoqda...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && skins.length === 0 && (
        <p className="text-sm text-muted">Hozircha skinlar qo'shilmagan.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {skins.map((skin) => (
          <div
            key={skin.id}
            className="bg-surface2 border border-line rounded-xl overflow-hidden flex flex-col"
          >
            <div className="aspect-square bg-ink flex items-center justify-center">
              {skin.image_url ? (
                <img
                  src={skin.image_url}
                  alt={skin.name}
                  className="w-full h-full object-contain p-2"
                  loading="lazy"
                />
              ) : (
                <span className="text-3xl">🔫</span>
              )}
            </div>
            <div className="p-3 flex flex-col gap-1">
              <p className="text-xs font-medium leading-tight line-clamp-2">
                {skin.name}
              </p>
              <p className="text-sm font-display font-bold text-gold">
                {Number(skin.price).toLocaleString("ru-RU")} so'm
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
