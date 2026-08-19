-- ============================================================
-- CS2 Skin & Reward Telegram Mini App — Supabase schema
-- ============================================================
-- Muhim: bu loyihada frontend Supabase'ga TO'G'RIDAN-TO'G'RI
-- ulanmaydi. Telegram Mini App'da Supabase Auth session yo'q,
-- shuning uchun anon key orqali RLS bilan xavfsiz ishlash qiyin.
-- Shu sabab BARCHA o'qish/yozish backend (Node.js) orqali,
-- service_role key bilan amalga oshiriladi. RLS shunchaki
-- "default deny" himoya sifatida yoqilgan — hech qanday policy
-- yozilmagan, ya'ni anon/authenticated rolga hech narsa ochiq emas.

create extension if not exists "pgcrypto";

-- ---------- USERS ----------
create table if not exists users (
  telegram_id     bigint primary key,
  username        text,
  first_name      text,
  last_name       text,
  balance         numeric(12,2) not null default 0,
  referrer_id     bigint references users(telegram_id),
  referral_confirmed boolean not null default false,   -- sponsor kanallarga obuna tasdiqlandimi
  referral_rewarded  boolean not null default false,   -- referrer'ga bonus berilganmi (ikki marta berilmasligi uchun)
  last_spin_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_users_referrer_id on users(referrer_id);

-- ---------- SETTINGS ----------
-- key/value ko'rinishida — admin panel shu jadvalni tahrirlaydi
create table if not exists settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into settings (key, value) values
  ('min_withdrawal', '28000'),
  ('referral_bonus', '4000'),
  ('wheel_outcomes', '[
      {"amount": 0,    "weight": 55},
      {"amount": 200,  "weight": 25},
      {"amount": 500,  "weight": 15},
      {"amount": 1000, "weight": 5}
   ]')
on conflict (key) do nothing;

-- ---------- SPONSOR CHANNELS ----------
create table if not exists sponsor_channels (
  id              serial primary key,
  channel_username text not null,   -- masalan "@my_channel" (getChatMember uchun kerak)
  channel_title   text,
  invite_url      text,             -- masalan "https://t.me/my_channel"
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------- SKINS ----------
create table if not exists skins (
  id          serial primary key,
  name        text not null,
  price       numeric(12,2) not null,
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- WITHDRAWALS ----------
create table if not exists withdrawals (
  id              serial primary key,
  user_id         bigint not null references users(telegram_id),
  type            text not null check (type in ('card', 'skin')),
  amount          numeric(12,2) not null,
  card_number     text,
  card_holder     text,
  steam_trade_url text,
  skin_id         integer references skins(id),
  skin_name       text,
  status          text not null default 'pending' check (status in ('pending','completed','rejected')),
  admin_message_id bigint,   -- adminga yuborilgan xabar id (inline tugmani yangilash uchun)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_withdrawals_user_id on withdrawals(user_id);
create index if not exists idx_withdrawals_status on withdrawals(status);

-- ---------- SPIN LOG (ixtiyoriy, statistikadan uchun) ----------
create table if not exists spin_log (
  id          bigserial primary key,
  user_id     bigint not null references users(telegram_id),
  amount      numeric(12,2) not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RLS — default deny. Faqat backend service_role kalit orqali
-- kirish mumkin (service_role RLS'ni chetlab o'tadi).
-- ============================================================
alter table users            enable row level security;
alter table settings         enable row level security;
alter table sponsor_channels enable row level security;
alter table skins            enable row level security;
alter table withdrawals      enable row level security;
alter table spin_log         enable row level security;

-- updated_at avtomatik yangilanishi uchun trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_withdrawals_updated_at on withdrawals;
create trigger trg_withdrawals_updated_at
  before update on withdrawals
  for each row execute function set_updated_at();
