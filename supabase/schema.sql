-- ============================================================
-- RexNotes — Skema database Supabase (Chat 4)
-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- ============================================================

-- gen_random_uuid() butuh extension pgcrypto (biasanya sudah aktif
-- di project Supabase baru, tapi kita pastikan di sini).
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabel: projects
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects (user_id);

-- ------------------------------------------------------------
-- Tabel: diagram_versions
-- ------------------------------------------------------------
create table if not exists public.diagram_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scene_data jsonb not null,
  prompt_used text,
  version_number int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_diagram_versions_project_id
  on public.diagram_versions (project_id);

-- ------------------------------------------------------------
-- Trigger: auto-increment version_number per project.
-- Supaya API route tidak perlu hitung versi terakhir sendiri —
-- menghindari race condition kalau dua Save terjadi hampir bersamaan.
-- ------------------------------------------------------------
create or replace function public.set_diagram_version_number()
returns trigger
language plpgsql
as $$
begin
  select coalesce(max(version_number), 0) + 1
  into new.version_number
  from public.diagram_versions
  where project_id = new.project_id;

  return new;
end;
$$;

drop trigger if exists trg_set_diagram_version_number on public.diagram_versions;
create trigger trg_set_diagram_version_number
  before insert on public.diagram_versions
  for each row
  execute function public.set_diagram_version_number();

-- ------------------------------------------------------------
-- Trigger: sentuh projects.updated_at tiap kali ada versi baru.
-- Supaya halaman History bisa diurutkan "terakhir diedit".
-- ------------------------------------------------------------
create or replace function public.touch_project_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.projects
  set updated_at = now()
  where id = new.project_id;

  return new;
end;
$$;

drop trigger if exists trg_touch_project_updated_at on public.diagram_versions;
create trigger trg_touch_project_updated_at
  after insert on public.diagram_versions
  for each row
  execute function public.touch_project_updated_at();

-- ------------------------------------------------------------
-- Row Level Security — inti dari "user cuma bisa akses project
-- miliknya sendiri". Anon key itu publik (ada di frontend), jadi
-- tanpa RLS siapa pun bisa query semua baris lewat DevTools.
-- ------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.diagram_versions enable row level security;

-- projects: kepemilikan langsung lewat kolom user_id
create policy "select_own_projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "insert_own_projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "update_own_projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "delete_own_projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- diagram_versions: tidak punya kolom user_id sendiri, jadi
-- kepemilikan dicek lewat project induknya.
create policy "select_own_diagram_versions"
  on public.diagram_versions for select
  using (
    exists (
      select 1 from public.projects
      where public.projects.id = public.diagram_versions.project_id
        and public.projects.user_id = auth.uid()
    )
  );

create policy "insert_own_diagram_versions"
  on public.diagram_versions for insert
  with check (
    exists (
      select 1 from public.projects
      where public.projects.id = public.diagram_versions.project_id
        and public.projects.user_id = auth.uid()
    )
  );

-- Catatan: sengaja tidak ada policy delete untuk diagram_versions —
-- MVP belum punya fitur "hapus versi", jadi tidak perlu dibuka dulu.