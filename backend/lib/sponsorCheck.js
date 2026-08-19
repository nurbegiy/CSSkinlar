import { supabase } from "./supabase.js";

const SUBSCRIBED_STATUSES = new Set(["creator", "administrator", "member"]);

/**
 * Foydalanuvchi barcha faol homiy kanallarga obuna bo'lganini
 * Telegram Bot API getChatMember orqali tekshiradi.
 */
export async function checkAllChannelsSubscribed(bot, telegramId) {
  const { data: channels, error } = await supabase
    .from("sponsor_channels")
    .select("*")
    .eq("is_active", true);

  if (error) throw error;
  if (!channels || channels.length === 0) return { allSubscribed: true, missing: [] };

  const missing = [];
  for (const channel of channels) {
    try {
      const member = await bot.telegram.getChatMember(
        channel.channel_username,
        telegramId
      );
      if (!SUBSCRIBED_STATUSES.has(member.status)) {
        missing.push(channel);
      }
    } catch (err) {
      // Bot kanalda admin bo'lmasa yoki kanal noto'g'ri bo'lsa ham
      // foydalanuvchini "obuna emas" deb hisoblaymiz, lekin log qoldiramiz.
      console.error(`getChatMember xato (${channel.channel_username}):`, err.message);
      missing.push(channel);
    }
  }

  return { allSubscribed: missing.length === 0, missing };
}

/**
 * Foydalanuvchi barcha kanallarga obuna bo'lganini tasdiqlaganda chaqiriladi.
 * Agar bu birinchi marta tasdiqlansa va referrer bo'lsa — referrer balansiga
 * bonus qo'shiladi (faqat bir marta, referral_rewarded flag orqali).
 */
export async function confirmReferralIfEligible(bot, telegramUser) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramUser.telegram_id)
    .single();
  if (error || !user) return;

  if (user.referral_confirmed) return; // allaqachon tasdiqlangan

  await supabase
    .from("users")
    .update({ referral_confirmed: true })
    .eq("telegram_id", user.telegram_id);

  if (!user.referrer_id || user.referral_rewarded) return;

  const { data: settingRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "referral_bonus")
    .single();
  const bonus = Number(settingRow?.value ?? 4000);

  const { data: referrer } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", user.referrer_id)
    .single();
  if (!referrer) return;

  await supabase
    .from("users")
    .update({ balance: Number(referrer.balance) + bonus })
    .eq("telegram_id", referrer.telegram_id);

  await supabase
    .from("users")
    .update({ referral_rewarded: true })
    .eq("telegram_id", user.telegram_id);

  try {
    await bot.telegram.sendMessage(
      referrer.telegram_id,
      `🎉 Sizning taklif havolangiz orqali qo'shilgan do'stingiz barcha shartlarni bajardi!\n` +
        `Balansingizga +${bonus.toLocaleString("ru-RU")} so'm qo'shildi.`
    );
  } catch (err) {
    console.error("Referrerga xabar yuborilmadi:", err.message);
  }
}
