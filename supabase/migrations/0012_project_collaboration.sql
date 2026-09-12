-- Multi-user project collaboration: staff besides the project owner need to
-- view/edit the same project. Adds project_members and rewrites every
-- ownership-based RLS policy (across projects/uploads/models/renders/
-- construction_models and their storage buckets) to check membership
-- instead of projects.user_id = auth.uid() directly.
--
-- Untouched by this migration: the share_token public read-only mechanism
-- (0005_share_token.sql) -- unrelated to authenticated collaboration.
-- building_code_chunks (0010) -- already `using (true)` for all authenticated
-- users, not project-scoped.

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

create policy "project_members_select_member" on public.project_members
  for select to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id and pm.user_id = (select auth.uid())
  ));

create policy "project_members_manage_owner" on public.project_members
  for all to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id and pm.user_id = (select auth.uid()) and pm.role = 'owner'
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id and pm.user_id = (select auth.uid()) and pm.role = 'owner'
  ));

-- Auto-add the creator as owner, atomically with project creation -- no
-- reliance on application code remembering to insert this row.
create function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.user_id, 'owner');
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- Backfill: every existing project's current owner becomes an 'owner'
-- member, so pre-migration projects don't lose access under the new policies.
insert into public.project_members (project_id, user_id, role)
select id, user_id, 'owner' from public.projects
on conflict do nothing;

-- Looks up a user id by email so an owner can add a colleague as a member.
-- auth.users isn't exposed via PostgREST and supabase-js's admin API has no
-- clean single-email lookup, so a security-definer RPC is the standard
-- Supabase pattern here. Callable by any authenticated user (the actual
-- owner-only authorization check happens in addProjectMember() before this
-- is called and again via project_members' own RLS on the resulting insert),
-- so this only ever reveals "does this email have an account", not any
-- other account details.
create function public.get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where email = lookup_email limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to authenticated;

-- Lists a project's members with their emails (project_members only stores
-- user_id; auth.users isn't otherwise queryable from the client) -- without
-- this the members UI could only show raw UUIDs. Checks the caller is
-- themself a member of the project before returning anything.
create function public.list_project_members(target_project_id uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select pm.user_id, u.email, pm.role, pm.created_at
  from public.project_members pm
  join auth.users u on u.id = pm.user_id
  where pm.project_id = target_project_id
    and exists (
      select 1 from public.project_members caller
      where caller.project_id = target_project_id and caller.user_id = auth.uid()
    )
  order by pm.created_at asc;
$$;

revoke all on function public.list_project_members(uuid) from public;
grant execute on function public.list_project_members(uuid) to authenticated;

-- === projects ===
-- Owner and editor get identical read/write; only an owner can delete the
-- project itself or manage membership (see project_members policy above).

drop policy "projects_select_own" on public.projects;
create policy "projects_select_member" on public.projects
  for select to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id and pm.user_id = (select auth.uid())
  ));

-- insert is unchanged: still the creator's own user_id on the row being
-- created. The trigger above makes them owner immediately after.
drop policy "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy "projects_update_own" on public.projects;
create policy "projects_update_member" on public.projects
  for update to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id and pm.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id and pm.user_id = (select auth.uid())
  ));

drop policy "projects_delete_own" on public.projects;
create policy "projects_delete_owner" on public.projects
  for delete to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id and pm.user_id = (select auth.uid()) and pm.role = 'owner'
  ));

-- === uploads ===
drop policy "uploads_select_own" on public.uploads;
create policy "uploads_select_member" on public.uploads
  for select to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = uploads.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "uploads_insert_own" on public.uploads;
create policy "uploads_insert_member" on public.uploads
  for insert to authenticated
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = uploads.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "uploads_update_own" on public.uploads;
create policy "uploads_update_member" on public.uploads
  for update to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = uploads.project_id and pm.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = uploads.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "uploads_delete_own" on public.uploads;
create policy "uploads_delete_member" on public.uploads
  for delete to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = uploads.project_id and pm.user_id = (select auth.uid())
  ));

-- === models ===
drop policy "models_select_own" on public.models;
create policy "models_select_member" on public.models
  for select to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = models.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "models_insert_own" on public.models;
create policy "models_insert_member" on public.models
  for insert to authenticated
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = models.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "models_update_own" on public.models;
create policy "models_update_member" on public.models
  for update to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = models.project_id and pm.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = models.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "models_delete_own" on public.models;
create policy "models_delete_member" on public.models
  for delete to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = models.project_id and pm.user_id = (select auth.uid())
  ));

-- === renders ===
drop policy "renders_select_own" on public.renders;
create policy "renders_select_member" on public.renders
  for select to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = renders.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "renders_insert_own" on public.renders;
create policy "renders_insert_member" on public.renders
  for insert to authenticated
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = renders.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "renders_update_own" on public.renders;
create policy "renders_update_member" on public.renders
  for update to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = renders.project_id and pm.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = renders.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "renders_delete_own" on public.renders;
create policy "renders_delete_member" on public.renders
  for delete to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = renders.project_id and pm.user_id = (select auth.uid())
  ));

-- === construction_models ===
drop policy "construction_models_select_own" on public.construction_models;
create policy "construction_models_select_member" on public.construction_models
  for select to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = construction_models.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "construction_models_insert_own" on public.construction_models;
create policy "construction_models_insert_member" on public.construction_models
  for insert to authenticated
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = construction_models.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "construction_models_update_own" on public.construction_models;
create policy "construction_models_update_member" on public.construction_models
  for update to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = construction_models.project_id and pm.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = construction_models.project_id and pm.user_id = (select auth.uid())
  ));

drop policy "construction_models_delete_own" on public.construction_models;
create policy "construction_models_delete_member" on public.construction_models
  for delete to authenticated
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = construction_models.project_id and pm.user_id = (select auth.uid())
  ));

-- === storage.objects ===
-- Keep the existing "{uploader_id}/{project_id}/{filename}" path layout as-is
-- (zero data movement, zero client-code change) -- just check the *second*
-- path segment (project_id) against project_members instead of checking the
-- first segment (original uploader's id) against auth.uid(). The first
-- segment becomes inert historical metadata rather than an auth key.

-- floorplans
drop policy "floorplans_owner_select" on storage.objects;
create policy "floorplans_member_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'floorplans' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "floorplans_owner_insert" on storage.objects;
create policy "floorplans_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'floorplans' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "floorplans_owner_update" on storage.objects;
create policy "floorplans_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'floorplans' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ))
  with check (bucket_id = 'floorplans' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "floorplans_owner_delete" on storage.objects;
create policy "floorplans_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'floorplans' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

-- models bucket
drop policy "models_bucket_owner_select" on storage.objects;
create policy "models_bucket_member_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "models_bucket_owner_insert" on storage.objects;
create policy "models_bucket_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "models_bucket_owner_update" on storage.objects;
create policy "models_bucket_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ))
  with check (bucket_id = 'models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "models_bucket_owner_delete" on storage.objects;
create policy "models_bucket_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

-- renders bucket
drop policy "renders_bucket_owner_select" on storage.objects;
create policy "renders_bucket_member_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'renders' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "renders_bucket_owner_insert" on storage.objects;
create policy "renders_bucket_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'renders' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "renders_bucket_owner_update" on storage.objects;
create policy "renders_bucket_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'renders' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ))
  with check (bucket_id = 'renders' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "renders_bucket_owner_delete" on storage.objects;
create policy "renders_bucket_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'renders' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

-- ifc-models bucket
drop policy "ifc_models_owner_select" on storage.objects;
create policy "ifc_models_member_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ifc-models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "ifc_models_owner_insert" on storage.objects;
create policy "ifc_models_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ifc-models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "ifc_models_owner_update" on storage.objects;
create policy "ifc_models_member_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ifc-models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ))
  with check (bucket_id = 'ifc-models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));

drop policy "ifc_models_owner_delete" on storage.objects;
create policy "ifc_models_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ifc-models' and exists (
    select 1 from public.project_members pm
    where pm.user_id = (select auth.uid()) and pm.project_id::text = (storage.foldername(name))[2]
  ));
