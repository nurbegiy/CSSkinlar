import "dotenv/config";
import express from "express";
import cors from "cors";
import { Telegraf, Markup } from "telegraf";
import { supabase } from "./lib/supabase.js";
import { requireTelegramAuth } from "./lib/telegramAuth.js";
import { pickWheelOutcome, canSpinToday, msUntilNextSpin } from "./lib/wheel.js";
import { checkAllChannelsSubscribed, confirmReferralIfEligible } from "./lib/sponsorCheck.js";

const {
  BOT_TOKEN,
  ADMIN_CHAT_ID,
  MINI_APP_URL,
  PORT = 8080,
  FRONTEND_ORIGIN,
  BOT_MODE = "polling",
  WEBHOOK_URL,
} = process.env;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN .env faylida yo'q");
if (!ADMIN_CHAT_ID) throw new Error("ADMIN_CHAT_ID .env faylida yo'q");

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN || "*" }));
app.use(express.json());

// ============================================================
// Yordamchi: userni upsert qilish (mavjud bo'lmasa yaratadi)
// ============================================================
async function upsertUser(tgUser, referrerId = null) {
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", tgUser.id)
    .maybeSingle();

  if (existing) {
    const { data: updated } = await supabase
      .from("users")
      .update({
        username: tgUser.username ?? existing.username,
        first_name: tgUser.first_name ?? existing.first_name,
        last_name: tgUser.last_name ?? existing.last_name,
      })
      .eq("telegram_id", tgUser.id)
      .select()
      .single();
    return updated;
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      telegram_id: tgUser.id,
      username: tgUser.username ?? null,
      first_name: tgUser.first_name ?? null,
      last_name: tgUser.last_name ?? null,
      referrer_id: referrerId && referrerId !== tgUser.id ? referrerId : null,
    })
    .select()
    .single();
  if (error) throw error;
  return created;
}

// ============================================================
// Yordamchi: taklif (referral) ma'lumotini yig'ish
// ============================================================
async function getReferralInfo(telegramId) {
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", telegramId)
    .eq("referral_rewarded", true);

  const me = await bot.telegram.getMe();
  return {
    referralLink: `https://t.me/${me.username}?start=ref_${telegramId}`,
    confirmedReferrals: count ?? 0,
  };
}

async function sendReferralInfo(ctx) {
  const info = await getReferralInfo(ctx.from.id);
  await ctx.reply(
    `👥 SIZNING TAKLIF HAVOLANGIZ:\n${info.referralLink}\n\n` +
      `Bu havola orqali qo'shilgan va barcha shartlarni bajargan do'stlaringiz: ` +
      `${info.confirmedReferrals} ta.\n\n` +
      `Do'stingiz shu havola orqali botga kirib, barcha homiy kanallarga obuna ` +
      `bo'lgach, balansingizga avtomatik bonus qo'shiladi.`
  );
}

// ============================================================
// Yordamchi: majburiy obuna "darvozasi" va xush kelibsiz xabari
// ============================================================
async function sendSubscriptionGate(ctx, missing) {
  const channelButtons = missing.map((c) => [
    { text: `📢 ${c.channel_title}`, url: c.invite_url },
  ]);
  channelButtons.push([{ text: "✅ Tekshirish", callback_data: "check_subscription" }]);

  await ctx.reply(
    `⚠️ Botdan foydalanish uchun avval quyidagi kanal(lar)ga obuna bo'ling:\n\n` +
      `Obuna bo'lgach, "✅ Tekshirish" tugmasini bosing.`,
    { reply_markup: { inline_keyboard: channelButtons } }
  );
}

async function sendWelcome(ctx) {
  await ctx.reply(
    `Assalomu alaykum, ${ctx.from.first_name || "do'stim"}! 👋\n\n` +
      `CS2 Skin & Reward ilovasiga xush kelibsiz.\n` +
      `Kuniga bir marta bepul baraban aylantiring, do'stlaringizni taklif qiling ` +
      `va pul yoki CS2 skin yutib oling!`,
    Markup.inlineKeyboard([
      [Markup.button.webApp("🎮 Ilovani ochish", MINI_APP_URL)],
      [Markup.button.callback("👥 Taklif havolam", "referral_info")],
    ])
  );
}

// ============================================================
// TELEGRAM BOT — /start ref_XXXXX (majburiy obuna darvozasi bilan)
// ============================================================
bot.start(async (ctx) => {
  const payload = ctx.startPayload; // masalan "ref_12345"
  let referrerId = null;
  if (payload?.startsWith("ref_")) {
    const parsed = Number(payload.replace("ref_", ""));
    if (Number.isFinite(parsed)) referrerId = parsed;
  }

  await upsertUser(ctx.from, referrerId);

  const { allSubscribed, missing } = await checkAllChannelsSubscribed(bot, ctx.from.id);
  if (!allSubscribed) {
    return sendSubscriptionGate(ctx, missing);
  }

  await confirmReferralIfEligible(bot, { telegram_id: ctx.from.id });
  await sendWelcome(ctx);
});

// ---------- /referral buyrug'i ----------
bot.command("referral", sendReferralInfo);

// ============================================================
// CALLBACK TUGMALAR — obunani tekshirish / taklif / admin tasdiqlash
// ============================================================
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  // ---------- "✅ Tekshirish" (majburiy obuna darvozasi) ----------
  if (data === "check_subscription") {
    try {
      const { allSubscribed, missing } = await checkAllChannelsSubscribed(bot, ctx.from.id);
      if (allSubscribed) {
        await confirmReferralIfEligible(bot, { telegram_id: ctx.from.id });
        await ctx.answerCbQuery("Rahmat, obuna tasdiqlandi ✅");
        try {
          await ctx.deleteMessage();
        } catch {
          /* eski xabarni o'chirib bo'lmasa ham davom etamiz */
        }
        await sendWelcome(ctx);
      } else {
        await ctx.answerCbQuery(
          "Hali obuna bo'lmagansiz: " + missing.map((m) => m.channel_title).join(", "),
          { show_alert: true }
        );
      }
    } catch (err) {
      console.error(err);
      await ctx.answerCbQuery("Xatolik yuz berdi, birozdan keyin qayta urinib ko'ring.", {
        show_alert: true,
      });
    }
    return;
  }

  // ---------- "👥 Taklif havolam" ----------
  if (data === "referral_info") {
    await ctx.answerCbQuery();
    await sendReferralInfo(ctx);
    return;
  }

  // ---------- ADMIN — withdrawal inline tasdiqlash/rad etish ----------
  const [action, idStr] = data.split("_");
  const withdrawalId = Number(idStr);
  if (!["approve", "reject"].includes(action) || !withdrawalId) return;

  // Faqat admin bosishi mumkin
  if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
    return ctx.answerCbQuery("Sizda ruxsat yo'q.", { show_alert: true });
  }

  const { data: withdrawal, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .single();

  if (error || !withdrawal) {
    return ctx.answerCbQuery("So'rov topilmadi.", { show_alert: true });
  }
  if (withdrawal.status !== "pending") {
    return ctx.answerCbQuery("Bu so'rov allaqachon ko'rib chiqilgan.", { show_alert: true });
  }

  if (action === "approve") {
    await supabase
      .from("withdrawals")
      .update({ status: "completed" })
      .eq("id", withdrawalId);

    await ctx.editMessageText(
      ctx.callbackQuery.message.text + "\n\n✅ TO'LANDI",
    );
    await ctx.answerCbQuery("Tasdiqlandi ✅");

    try {
      await bot.telegram.sendMessage(
        withdrawal.user_id,
        `✅ So'rovingiz (#${withdrawal.id}) tasdiqlandi!\n` +
          `${withdrawal.amount.toLocaleString("ru-RU")} so'm miqdorida to'lov/skin yuborildi. Rahmat!`
      );
    } catch (e) {
      console.error("Userga xabar yuborilmadi:", e.message);
    }
  }

  if (action === "reject") {
    // Balansni foydalanuvchiga qaytaramiz
    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("telegram_id", withdrawal.user_id)
      .single();

    await supabase
      .from("users")
      .update({ balance: Number(user.balance) + Number(withdrawal.amount) })
      .eq("telegram_id", withdrawal.user_id);

    await supabase
      .from("withdrawals")
      .update({ status: "rejected" })
      .eq("id", withdrawalId);

    await ctx.editMessageText(
      ctx.callbackQuery.message.text + "\n\n❌ BEKOR QILINDI (balans qaytarildi)",
    );
    await ctx.answerCbQuery("Rad etildi ❌");

    try {
      await bot.telegram.sendMessage(
        withdrawal.user_id,
        `❌ So'rovingiz (#${withdrawal.id}) bekor qilindi.\n` +
          `${withdrawal.amount.toLocaleString("ru-RU")} so'm balansingizga qaytarildi.\n` +
          `Ma'lumotlarni tekshirib qayta urinib ko'ring yoki admin bilan bog'laning.`
      );
    } catch (e) {
      console.error("Userga xabar yuborilmadi:", e.message);
    }
  }
});

// ============================================================
// REST API — Mini App frontend shu endpointlar bilan ishlaydi
// ============================================================
const auth = requireTelegramAuth(BOT_TOKEN);

// --- Auth / user ma'lumotini olish ---
app.post("/api/auth", auth, async (req, res) => {
  try {
    const user = await upsertUser(req.telegramUser);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- Kunlik baraban ---
app.post("/api/spin", auth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", req.telegramUser.id)
      .single();
    if (error || !user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    if (!canSpinToday(user.last_spin_at)) {
      return res.status(400).json({
        error: "Bugungi bepul aylantirish ishlatilgan",
        msUntilNext: msUntilNextSpin(user.last_spin_at),
      });
    }

    const { data: settingRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "wheel_outcomes")
      .single();
    const outcomes = settingRow.value;
    const outcome = pickWheelOutcome(outcomes);

    const { data: updated, error: updateErr } = await supabase
      .from("users")
      .update({
        balance: Number(user.balance) + outcome.amount,
        last_spin_at: new Date().toISOString(),
      })
      .eq("telegram_id", user.telegram_id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    await supabase.from("spin_log").insert({
      user_id: user.telegram_id,
      amount: outcome.amount,
    });

    res.json({ outcome, balance: updated.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- Homiy kanallar ro'yxati ---
app.get("/api/sponsor-channels", async (_req, res) => {
  const { data, error } = await supabase
    .from("sponsor_channels")
    .select("id, channel_title, invite_url")
    .eq("is_active", true);
  if (error) return res.status(500).json({ error: "Server xatosi" });
  res.json({ channels: data });
});

// --- Obunani tekshirish (anti-fraud referral shu yerda tasdiqlanadi) ---
app.post("/api/sponsor-status", auth, async (req, res) => {
  try {
    const { allSubscribed, missing } = await checkAllChannelsSubscribed(
      bot,
      req.telegramUser.id
    );

    if (allSubscribed) {
      await confirmReferralIfEligible(bot, {
        telegram_id: req.telegramUser.id,
      });
    }

    res.json({
      allSubscribed,
      missingChannels: missing.map((c) => ({
        title: c.channel_title,
        invite_url: c.invite_url,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- Referral holati (link, tasdiqlanganmi) ---
app.post("/api/referral-info", auth, async (req, res) => {
  const { data: user } = await supabase
    .from("users")
    .select("telegram_id, referral_confirmed")
    .eq("telegram_id", req.telegramUser.id)
    .single();

  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", req.telegramUser.id)
    .eq("referral_rewarded", true);

  res.json({
    referralLink: `https://t.me/${(await bot.telegram.getMe()).username}?start=ref_${req.telegramUser.id}`,
    confirmedReferrals: count ?? 0,
  });
});

// --- Skinlar ro'yxati (cashout uchun) ---
app.get("/api/skins", async (_req, res) => {
  const { data, error } = await supabase
    .from("skins")
    .select("id, name, price, image_url")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) return res.status(500).json({ error: "Server xatosi" });
  res.json({ skins: data });
});

// --- Pul/skin yechib olish so'rovi ---
app.post("/api/withdraw", auth, async (req, res) => {
  try {
    const { type, cardNumber, cardHolder, steamTradeUrl, skinId } = req.body;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", req.telegramUser.id)
      .single();
    if (error || !user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

    const { data: minRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "min_withdrawal")
      .single();
    const minWithdrawal = Number(minRow?.value ?? 28000);

    let amount = 0;
    let skinName = null;

    if (type === "card") {
      if (!cardNumber || !cardHolder) {
        return res.status(400).json({ error: "Karta raqami va egasining ismi kerak" });
      }
      amount = Number(user.balance); // to'liq balansni yechish; agar boshqacha bo'lsa frontend/body'dan amount qabul qilinadi
      if (req.body.amount) amount = Number(req.body.amount);
    }

    if (type === "skin") {
      if (!steamTradeUrl || !skinId) {
        return res.status(400).json({ error: "Steam Trade URL va skin tanlanishi kerak" });
      }
      const { data: skin } = await supabase
        .from("skins")
        .select("*")
        .eq("id", skinId)
        .single();
      if (!skin) return res.status(404).json({ error: "Skin topilmadi" });
      amount = Number(skin.price);
      skinName = skin.name;
    }

    if (amount < minWithdrawal) {
      return res.status(400).json({
        error: `Minimal yechib olish summasi ${minWithdrawal.toLocaleString("ru-RU")} so'm`,
      });
    }
    if (amount > Number(user.balance)) {
      return res.status(400).json({ error: "Balansingiz yetarli emas" });
    }

    // Balansdan yechamiz va so'rovni "pending" holatda saqlaymiz
    await supabase
      .from("users")
      .update({ balance: Number(user.balance) - amount })
      .eq("telegram_id", user.telegram_id);

    const { data: withdrawal, error: insertErr } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.telegram_id,
        type,
        amount,
        card_number: type === "card" ? cardNumber : null,
        card_holder: type === "card" ? cardHolder : null,
        steam_trade_url: type === "skin" ? steamTradeUrl : null,
        skin_id: type === "skin" ? skinId : null,
        skin_name: skinName,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Adminga inline tugmali xabar
    const details =
      type === "card"
        ? `Karta: ${cardNumber}\nEgasi: ${cardHolder}`
        : `Skin: ${skinName}\nSteam Trade URL: ${steamTradeUrl}`;

    const messageText =
      `🆕 YANGI YECHISH SO'ROVI #${withdrawal.id}\n` +
      `Foydalanuvchi: @${user.username || "no_username"} (ID: ${user.telegram_id})\n` +
      `Turi: ${type === "card" ? "Karta" : "Skin"}\n` +
      `Summa: ${amount.toLocaleString("ru-RU")} so'm\n` +
      `${details}`;

    const sent = await bot.telegram.sendMessage(ADMIN_CHAT_ID, messageText, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `approve_${withdrawal.id}` },
            { text: "❌ Rad etish", callback_data: `reject_${withdrawal.id}` },
          ],
        ],
      },
    });

    await supabase
      .from("withdrawals")
      .update({ admin_message_id: sent.message_id })
      .eq("id", withdrawal.id);

    res.json({ withdrawal, newBalance: Number(user.balance) - amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- Foydalanuvchining so'rovlar tarixi ---
app.post("/api/my-withdrawals", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("user_id", req.telegramUser.id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Server xatosi" });
  res.json({ withdrawals: data });
});

// ============================================================
// ISHGA TUSHIRISH
// ============================================================
// Bot "Menu" (☰) tugmasida shu buyruqlar chiqadi
bot.telegram
  .setMyCommands([
    { command: "start", description: "Botni ishga tushirish" },
    { command: "referral", description: "Taklif havolam" },
  ])
  .catch((err) => console.error("setMyCommands xato:", err.message));

app.listen(PORT, () => console.log(`API server ${PORT}-portda ishlamoqda`));

if (BOT_MODE === "webhook" && WEBHOOK_URL) {
  bot.telegram.setWebhook(`${WEBHOOK_URL}/telegram-webhook`);
  app.use(bot.webhookCallback("/telegram-webhook"));
  console.log("Bot webhook rejimida ishga tushdi:", WEBHOOK_URL);
} else {
  bot.launch();
  console.log("Bot polling rejimida ishga tushdi");
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
