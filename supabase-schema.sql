-- ============================================================
-- MLBB Unity Tools — Supabase schema (LOGIN ONLY)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1) Tabel user
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,          -- SHA-256 hex (sama format credentials.js)
  is_admin boolean not null default false,
  max_devices int null,                 -- null = unlimited
  expiry_date date null,                -- null = unlimited
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_username_unique unique (username)
);

-- username case-insensitive lookup
create index if not exists app_users_username_lower_idx
  on public.app_users (lower(username));

-- 2) Device registry (batas device per user)
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  device_id text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  constraint user_devices_username_device_unique unique (username, device_id)
);

create index if not exists user_devices_username_idx
  on public.user_devices (username);

-- FK opsional (username bisa berubah; kita pakai text match)
-- Kalau mau cascade delete ketat, uncomment:
-- alter table public.user_devices
--   add constraint user_devices_username_fkey
--   foreign key (username) references public.app_users(username) on delete cascade;

-- 3) RLS: kunci akses langsung dari browser (hanya service_role lewat Vercel API)
alter table public.app_users enable row level security;
alter table public.user_devices enable row level security;

-- Tidak ada policy untuk anon/authenticated → client tidak bisa baca/tulis langsung.
-- Vercel API memakai SUPABASE_SERVICE_ROLE_KEY (bypass RLS).

-- 4) Seed dari credentials.js yang ada (ganti / tambah sesuai kebutuhan)
-- password_hash = SHA-256 hex dari password plaintext
insert into public.app_users (username, password_hash, is_admin, max_devices, expiry_date, is_active)
values
  (
    'adi',
    'e33608fbb683329abf5d0fd116f9d4d2f7866bfbaf33ec42f89e1199511a822e',
    true,
    1,
    null,
    true
  ),
  (
    'admin',
    '25f43b1486ad95a1398e3eeb3d83bc4010015fcc9bedb35b432e00298d5021f7',
    false,
    1,
    null,
    true
  )
on conflict (username) do update set
  password_hash = excluded.password_hash,
  is_admin = excluded.is_admin,
  max_devices = excluded.max_devices,
  expiry_date = excluded.expiry_date,
  is_active = excluded.is_active,
  updated_at = now();

-- Catatan:
-- Ada 2 username "admin" di credentials.js lama dengan hash berbeda.
-- Di DB username harus UNIQUE → pilih salah satu, atau rename jadi admin2.
-- Contoh admin kedua (opsional):
-- insert into public.app_users (username, password_hash, is_admin, max_devices)
-- values (
--   'admin2',
--   '1c142b2d01aa34e9a36bde480645a57fd69e14155dacfab5a3f9257b77fdc8d8',
--   false,
--   3
-- ) on conflict (username) do nothing;
