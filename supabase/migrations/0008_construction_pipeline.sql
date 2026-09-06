-- Construction-accurate CAD/BIM pipeline (Initiative 4). A separate track
-- from the image-based concept pipeline (models/renders) -- different
-- input format, different data model, human-review gate before anything is
-- treated as construction-accurate. See docs/production-readiness.md and
-- the approved plan for the full rationale.

alter table public.uploads drop constraint if exists uploads_kind_check;
alter table public.uploads add constraint uploads_kind_check check (kind in ('floorplan', 'cad_dxf'));

create table if not exists public.construction_models (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'awaiting_layer_mapping', 'extracted', 'done', 'error')),
  -- Raw layer names discovered in the DXF, before the user has assigned them.
  detected_layers jsonb,
  -- User's layer -> element-type assignment: { "<layer name>": "wall" | "door" | "window" | "ignore" }.
  layer_mapping jsonb,
  -- Extracted walls/doors/windows/floor as typed objects with real
  -- dimensions -- this structured shape (not a single merged mesh) is what
  -- makes IFC export possible. Editable by the reviewing architect.
  elements jsonb,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed', 'approved', 'needs_correction')),
  ifc_storage_path text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_models_project_id_idx on public.construction_models(project_id);

alter table public.construction_models enable row level security;

create policy "construction_models_select_own" on public.construction_models
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = construction_models.project_id and p.user_id = (select auth.uid())
  ));

create policy "construction_models_insert_own" on public.construction_models
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = construction_models.project_id and p.user_id = (select auth.uid())
  ));

create policy "construction_models_update_own" on public.construction_models
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = construction_models.project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = construction_models.project_id and p.user_id = (select auth.uid())
  ));

create policy "construction_models_delete_own" on public.construction_models
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = construction_models.project_id and p.user_id = (select auth.uid())
  ));

-- IFC export storage, same private-bucket + owner-path-prefix pattern as
-- floorplans/models/renders.
insert into storage.buckets (id, name, public)
values ('ifc-models', 'ifc-models', false)
on conflict (id) do nothing;

create policy "ifc_models_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ifc-models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "ifc_models_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ifc-models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "ifc_models_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ifc-models' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'ifc-models' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "ifc_models_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ifc-models' and (select auth.uid())::text = (storage.foldername(name))[1]);
