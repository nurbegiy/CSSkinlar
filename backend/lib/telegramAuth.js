import crypto from "node:crypto";

/**
 * Telegram Mini App yuborgan `initData` qatorini tekshiradi.
 * Bu QADAM SHART — aks holda har kim o'zining brauzer konsolidan
 * xohlagan telegram_id bilan so'rov yuborib, boshqa userning
 * balansini boshqarishi mumkin bo'lib qoladi.
 *
 * Qaytaradi: { ok: true, user: {...} } yoki { ok: false, reason }
 * Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || typeof initData !== "string") {
    return { ok: false, reason: "initData yo'q" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "hash yo'q" };
  params.delete("hash");

  // Qolgan barcha kalitlarni alifbo tartibida "key=value" qilib birlashtiramiz
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    return { ok: false, reason: "hash mos kelmadi (soxta so'rov)" };
  }

  const authDate = Number(params.get("auth_date") || 0);
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds > maxAgeSeconds) {
    return { ok: false, reason: "initData muddati o'tgan" };
  }

  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    return { ok: false, reason: "user JSON noto'g'ri" };
  }
  if (!user || !user.id) return { ok: false, reason: "user topilmadi" };

  return { ok: true, user };
}

/** Har bir himoyalangan endpoint uchun kichik Express middleware */
export function requireTelegramAuth(botToken) {
  return (req, res, next) => {
    const initData = req.body?.initData || req.headers["x-telegram-init-data"];
    const result = verifyInitData(initData, botToken);
    if (!result.ok) {
      return res.status(401).json({ error: "Auth xato: " + result.reason });
    }
    req.telegramUser = result.user;
    next();
  };
}
