# CS2 Skin & Reward — Telegram Mini App

## So'nggi o'zgarish: majburiy obuna va "Taklif" botga ko'chirildi

Endi **"Kanallar" va "Taklif" Mini App'da alohida tab emas** — bular botning
o'ziga ko'chirildi, chunki shunday qulayroq:

- **Majburiy obuna:** foydalanuvchi botga `/start` bosganda, agar barcha
  homiy kanallarga obuna bo'lmagan bo'lsa, bot **darhol** kanallar ro'yxati va
  "✅ Tekshirish" tugmasini yuboradi. Faqat obuna tasdiqlangandan keyingina
  "🎮 Ilovani ochish" tugmasi chiqadi. Referal bonusi ham aynan shu yerda
  (obuna tasdiqlangan zahoti) hisoblanadi — avvalgidek.
- **Taklif:** "🎮 Ilovani ochish" tugmasi ostida "👥 Taklif havolam" tugmasi
  bor — bosilsa, bot referral havolasi va tasdiqlangan takliflar sonini
  xabar qilib yuboradi. Shu bilan bir qatorda `/referral` buyrug'i ham
  qo'shildi (bot Menu (☰) tugmasida ko'rinadi).

Mini App'da endi faqat 3 ta tab qoladi: **Bosh sahifa** (baraban),
**Skinlar**, **Yechish**. Bu backend/frontend endpointlariga (masalan
`/api/sponsor-channels`, `/api/referral-info`) ta'sir qilmadi — ular hali
ham mavjud, shunchaki hozircha frontend ulardan foydalanmayapti.

## Arxitektura

```
project/
├── supabase/
│   └── schema.sql          # Supabase (PostgreSQL) jadval sxemasi
├── backend/                # Node.js: Express API + Telegraf bot (BIR jarayonda)
│   ├── index.js
│   ├── lib/
│   │   ├── supabase.js         # service_role klient
│   │   ├── telegramAuth.js     # initData HMAC tekshiruvi (xavfsizlik!)
│   │   ├── wheel.js            # weighted-random baraban logikasi
│   │   └── sponsorCheck.js     # obuna tekshirish + referral bonus berish
│   └── .env.example
└── frontend/                # React (Vite) + Tailwind + Telegram WebApp SDK
    ├── src/
    │   ├── App.jsx
    │   ├── api.js               # backendga so'rov yuboruvchi klient
    │   └── components/
    └── .env.example
```

### Nega frontend Supabase'ga to'g'ridan-to'g'ri ulanmaydi?

Telegram Mini App'da foydalanuvchi Supabase Auth orqali "login" qilmaydi —
u faqat `Telegram.WebApp.initData` degan imzolangan qatorni oladi. Agar shu
initData'ni frontenddan to'g'ridan-to'g'ri Supabase'ga (anon key bilan)
yuborsak, RLS policy yozish murakkab va xatoga moyil bo'ladi, ustiga
balans/referral kabi "pul bilan bog'liq" amallarni klient tomonda
ishonib qoldirish xavfli.

Shu sabab arxitektura shunday qurilgan:

1. Frontend har bir so'rovga `initData`ni qo'shib backendga yuboradi.
2. Backend `telegramAuth.js` yordamida HMAC-SHA256 orqali bu ma'lumot
   haqiqatan Telegram tomonidan imzolanganini tekshiradi (soxta so'rovlarni bloklaydi).
3. Faqat shundan keyin backend **service_role** key bilan Supabase'ga
   yozadi — bu key hech qachon brauzerga chiqmaydi.

Supabase RLS barcha jadvallarda yoqilgan (default deny) — bu ikkinchi
himoya qatlami sifatida xizmat qiladi.

---

## 1-qadam — Supabase'ni sozlash

1. [supabase.com](https://supabase.com) da yangi loyiha yarating.
2. SQL Editor'ga kirib `supabase/schema.sql` faylini to'liq ishga tushiring.
3. Project Settings → API bo'limidan quyidagilarni oling:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (⚠️ **maxfiy**, faqat backend uchun) → `SUPABASE_SERVICE_ROLE_KEY`
4. `sponsor_channels`, `skins` va `settings` jadvallariga admin panel orqali
   (yoki hozircha to'g'ridan-to'g'ri Table Editor'dan) boshlang'ich
   ma'lumotlarni kiriting. Masalan `sponsor_channels`:

   | channel_username | channel_title | invite_url | is_active |
   |---|---|---|---|
   | @your_channel | Rasmiy kanal | https://t.me/your_channel | true |

   **Muhim:** bot shu kanalda **admin** bo'lishi shart — aks holda
   `getChatMember` ishlamaydi.

---

## 2-qadam — Telegram bot yaratish

1. [@BotFather](https://t.me/BotFather) orqali yangi bot yarating, tokenni oling.
2. `/setmenubutton` yoki `/newapp` orqali Mini App URL'ni botga bog'lang
   (frontend deploy qilingandan keyin).
3. Botni barcha homiy kanallarga **admin** qilib qo'shing.

---

## 3-qadam — Backend'ni ishga tushirish

```bash
cd backend
cp .env.example .env
# .env faylini to'ldiring: BOT_TOKEN, ADMIN_CHAT_ID, SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY, MINI_APP_URL, FRONTEND_ORIGIN

npm install
npm run dev
```

`ADMIN_CHAT_ID` — yechish so'rovlari va bildirishnomalar boradigan
admin(lar)ning shaxsiy Telegram ID'si (guruh/kanal ID ham bo'lishi mumkin).
O'z ID'ingizni bilish uchun [@userinfobot](https://t.me/userinfobot) dan foydalaning.

Production'da `BOT_MODE=webhook` va `WEBHOOK_URL`ni serveringizning
tashqi (https) manziliga o'rnating — polling rejimi faqat bitta server
nusxasida ishlaydi va dev uchun qulay.

---

## 4-qadam — Frontend'ni ishga tushirish

```bash
cd frontend
cp .env.example .env
# VITE_API_URL ni backend manzilingizga o'zgartiring

npm install
npm run dev
```

Frontend'ni ishlab chiqishda Telegram ichida sinash uchun `ngrok` yoki
shunga o'xshash tunnel orqali lokal serverni public HTTPS manzilga
chiqarish kerak (Telegram Mini App faqat HTTPS'ni qo'llab-quvvatlaydi).

Production'ga deploy qilishda (Vercel/Netlify/Cloudflare Pages) `npm run build`
buyrug'i `dist/` papkasini yaratadi — shu papkani statik hosting'ga yuklang.

---

## 5-qadam — Admin panel

PRD'da so'ralgan admin panel (referal summasi, min. chiqarish, skinlar,
narxlar, homiy kanallarni boshqarish) hozircha **Supabase Table Editor**
orqali boshqariladi — bu MVP bosqichi uchun yetarli va xavfsiz (chunki
Supabase dashboard'ga faqat loyiha egasi kiradi).

Agar alohida admin-panel UI kerak bo'lsa, keyingi bosqichda shu
jadvallar (`settings`, `sponsor_channels`, `skins`) ustida oddiy
CRUD React sahifasi qo'shish mumkin — so'rasangiz shuni ham qurib beraman.

---

## Ishlash oqimi (qisqacha)

1. Foydalanuvchi botni `/start ref_12345` orqali ochadi → `referrer_id` yoziladi.
2. Mini App ochilganda frontend `initData`ni backendga yuboradi → user upsert bo'ladi.
3. Foydalanuvchi kuniga bir marta "Baraban"ni aylantiradi → balans yangilanadi.
4. "Kanallar" bo'limida barcha homiy kanallarga obuna bo'lgach "Tekshirish"
   bosiladi → agar hammasi tasdiqlansa, referrer'ga bonus **avtomatik** yoziladi.
5. Balans ≥ min. summa bo'lsa, "Yechish" bo'limidan karta yoki skin so'rovi yuboriladi
   → balansdan darhol yechiladi, `withdrawals` jadvaliga `pending` deb yoziladi.
6. Admin Telegram'da inline tugmali xabar oladi → ✅/❌ bosadi →
   status va (kerak bo'lsa) balans avtomatik yangilanadi, foydalanuvchiga xabar boradi.

## Vercel'ga joylash

**Frontend (`frontend/`) — Vercel'ga to'g'ridan-to'g'ri mos.**
`vercel.json` qo'shib qo'ydim (Vite'ni Vercel avtomatik taniydi, lekin
`outputDirectory`ni aniq ko'rsatish xato ehtimolini kamaytiradi). Vercel
dashboard'da:
1. Repo'ni import qiling, Root Directory'ni `frontend` deb belgilang.
2. Environment Variables'ga `VITE_API_URL` (backend manzilingiz, pastga qarang) qo'shing.
3. Deploy.

**Backend (`backend/`) — Render yoki Railway'ga joylanadi (Vercel emas).**
Sabab: `bot.launch()` — polling rejimi, ya'ni bot doimiy ishlab turadigan
bitta jarayonni talab qiladi. Vercel serverless bo'lgani uchun bunga mos emas;
Render/Railway esa "doimiy server" beradi — `npm start` hech narsa
o'zgartirmasdan bitta uzluksiz jarayon sifatida ishlaydi.

### Render'ga joylash (tavsiya etiladi)

1. Kodni GitHub'ga push qiling (butun repo, yoki alohida `backend` papkasini).
2. [render.com](https://render.com) → **New → Web Service** → GitHub repo'ni tanlang.
3. Sozlamalar:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - (Repo ildizida `backend/render.yaml` bor — "Blueprint" orqali ham avtomatik
     import qilish mumkin: New → Blueprint → shu repo.)
4. **Environment** bo'limiga `.env.example`dagi barcha o'zgaruvchilarni qo'shing:
   `BOT_TOKEN`, `ADMIN_CHAT_ID`, `MINI_APP_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN` (Vercel frontend URL'ingiz).
5. **`BOT_MODE=webhook`** qiling — Render doimiy public HTTPS URL berganidan
   keyin webhook polling'dan ko'ra ancha barqaror va resurs tejamkor ishlaydi.
   `WEBHOOK_URL`ni birinchi deploy tugagach Render bergan manzilga
   (masalan `https://cs2-tma-backend.onrender.com`) o'rnatib, qayta deploy qiling.
6. Deploy tugagach backend manzilini (`https://cs2-tma-backend.onrender.com`)
   Vercel'dagi frontend'ning `VITE_API_URL` o'zgaruvchisiga qo'ying va frontend'ni
   qayta deploy qiling.

> Eslatma: Render'ning bepul tarifi uzoq vaqt so'rovsiz qolsa "uxlab qoladi"
> va keyingi so'rovga sekinroq javob beradi. Bot doimiy tez ishlashi kerak
> bo'lsa, pullik "Starter" tarifga o'ting (`render.yaml`da shu tanlangan).

### Railway'ga joylash (muqobil)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
2. **Root Directory**'ni `backend` qilib belgilang (Settings → Service).
3. Xuddi yuqoridagi kabi Environment Variables'ni qo'shing, `BOT_MODE=webhook`
   va `WEBHOOK_URL`ni Railway bergan public domenga o'rnating.
4. Railway avtomatik `npm install && npm start`ni ishga tushiradi — qo'shimcha
   config fayli shart emas.

### Agar hammasi Vercel'da bo'lishi kerak bo'lsa

Backendni Vercel Serverless Functions (`api/*.js`, har bir endpoint alohida
funksiya) ko'rinishiga o'tkazish mumkin — lekin bu alohida qayta qurish ishi
(Telegraf'ni ham har funksiyada qayta ishga tushirishga moslash kerak).
Hozircha Render/Railway yechimi sodda va barqaror bo'lgani uchun shuni tavsiya
qilaman.

## Skin rasmlarini qo'shish (hozirgi, admin-panelsiz usul)

`skins` jadvalidagi `image_url` ustuniga to'g'ridan-to'g'ri istalgan public rasm
linkini yozsangiz bo'ladi. Eng qulay yo'l — Supabase'ning o'zidagi bepul fayl
saqlash xizmati:

1. Supabase Dashboard → **Storage** → **New bucket** → nomi masalan `skins`,
   **Public bucket**ni yoqing (aks holda rasm ochilmaydi).
2. Bucket ichiga skin rasmini yuklang (drag-and-drop yetarli).
3. Yuklangan faylni bosing → **Copy URL** (public URL nusxalanadi).
4. **Table Editor** → `skins` jadvali → kerakli qatorning `image_url`
   katakchasiga shu URL'ni joylashtiring.
5. Ilovada "Skinlar" bo'limini yangilasangiz (pull-to-refresh yoki qayta oching),
   rasm chiqadi.

Agar bu jarayonni ilova ichidan (parol bilan himoyalangan alohida admin
sahifadan) qilish qulayroq bo'lsa — ayting, shuni ham qurib beraman
(rasm yuklash, skin/kanal/narx qo'shish-o'chirish — hammasi bitta ekranda).

## Diqqat qilinadigan narsalar (production'ga chiqarishdan oldin)

- Bu loyiha foydalanuvchilarga pul/qiymat to'lash bilan bog'liq — O'zbekiston
  qonunchiligida moliyaviy operatsiyalar, yutuq/lotereya turidagi mexanikalar
  va pul o'tkazmalari alohida talablarga bo'ysunishi mumkin. Ishga tushirishdan
  oldin yuridik maslahat olishni tavsiya qilaman.
- `ADMIN_CHAT_ID` bitta admin uchun yozilgan — bir nechta admin kerak bo'lsa,
  ro'yxat sifatida saqlab, callback ichida ID ro'yxatiga qarab tekshirish kerak.
- Hozirgi holatda withdrawal miqdori "card" turi uchun foydalanuvchi tomonidan
  kiritiladi (`amount`) — agar har doim to'liq balansni yechish talab qilinsa,
  buni backendda majburlash kerak.
