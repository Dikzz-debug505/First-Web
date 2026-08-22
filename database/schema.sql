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
  is_super boolean not null default false,  -- true = super admin (panel utama)
  max_devices int null,                 -- null = unlimited
  expiry_date date null,                -- null = unlimited
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_username_unique unique (username)
);

-- Migrasi: kolom is_super jika tabel sudah ada tanpa kolom ini
alter table public.app_users
  add column if not exists is_super boolean not null default false;

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

-- 3) RLS: kunci akses langsung dari browser (hanya service_role lewat Vercel API)
alter table public.app_users enable row level security;
alter table public.user_devices enable row level security;

-- 4) Seed user (akun super admin 'adi')
insert into public.app_users (username, password_hash, is_admin, is_super, max_devices, expiry_date, is_active)
values
  (
    'adi',
    'e33608fbb683329abf5d0fd116f9d4d2f7866bfbaf33ec42f89e1199511a822e',
    true,
    true,
    1,
    null,
    true
  )
on conflict (username) do update set
  password_hash = excluded.password_hash,
  is_admin = excluded.is_admin,
  is_super = excluded.is_super,
  max_devices = excluded.max_devices,
  expiry_date = excluded.expiry_date,
  is_active = excluded.is_active,
  updated_at = now();

-- Pastikan semua is_admin lama yang belum punya is_super tetap super (satu kali)
update public.app_users
set is_super = true
where is_admin = true and is_super = false
  and username = 'adi';

-- 5) Settings (maintenance / update website mode)
create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value, updated_at)
values ('maintenance_mode', 'false', now())
on conflict (key) do nothing;

-- 6) IP address per device (untuk admin melihat IP HP user)
alter table public.user_devices
  add column if not exists last_ip text null;
