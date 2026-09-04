-- OpenArchai initial schema: projects, uploads, models, renders
-- Ownership model: every row traces back to auth.uid() via projects.user_id.
-- RLS: TO authenticated + ownership predicate in USING and WITH CHECK on every table.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'floorplan' check (kind in ('floorplan')),
  created_at timestamptz not null default now()
);

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  gltf_storage_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.renders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  image_storage_path text,
  prompt_style text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists uploads_project_id_idx on public.uploads(project_id);
create index if not exists models_project_id_idx on public.models(project_id);
create index if not exists renders_project_id_idx on public.renders(project_id);
create index if not exists renders_model_id_idx on public.renders(model_id);

alter table public.projects enable row level security;
alter table public.uploads enable row level security;
alter table public.models enable row level security;
alter table public.renders enable row level security;

-- projects: direct ownership via user_id
create policy "projects_select_own" on public.projects
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "projects_delete_own" on public.projects
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- uploads: ownership via parent project
create policy "uploads_select_own" on public.uploads
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = uploads.project_id and p.user_id = (select auth.uid())
  ));

create policy "uploads_insert_own" on public.uploads
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = uploads.project_id and p.user_id = (select auth.uid())
  ));

create policy "uploads_delete_own" on public.uploads
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = uploads.project_id and p.user_id = (select auth.uid())
  ));

-- models: ownership via parent project
create policy "models_select_own" on public.models
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = models.project_id and p.user_id = (select auth.uid())
  ));

create policy "models_insert_own" on public.models
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = models.project_id and p.user_id = (select auth.uid())
  ));

create policy "models_update_own" on public.models
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = models.project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = models.project_id and p.user_id = (select auth.uid())
  ));

create policy "models_delete_own" on public.models
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = models.project_id and p.user_id = (select auth.uid())
  ));

-- renders: ownership via parent project
create policy "renders_select_own" on public.renders
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = renders.project_id and p.user_id = (select auth.uid())
  ));

create policy "renders_insert_own" on public.renders
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = renders.project_id and p.user_id = (select auth.uid())
  ));

create policy "renders_update_own" on public.renders
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = renders.project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = renders.project_id and p.user_id = (select auth.uid())
  ));

create policy "renders_delete_own" on public.renders
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = renders.project_id and p.user_id = (select auth.uid())
  ));

-- Storage buckets: private, path convention "{user_id}/{project_id}/{filename}"
insert into storage.buckets (id, name, public)
values ('floorplans', 'floorplans', false),
       ('models', 'models', false),
       ('renders', 'renders', false)
on conflict (id) do nothing;

create policy "floorplans_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'floorplans' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "floorplans_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'floorplans' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "floorplans_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'floorplans' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'floorplans' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "floorplans_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'floorplans' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "models_bucket_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "models_bucket_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "models_bucket_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'models' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "models_bucket_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "renders_bucket_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "renders_bucket_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "renders_bucket_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "renders_bucket_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'renders' and (select auth.uid())::text = (storage.foldername(name))[1]);
