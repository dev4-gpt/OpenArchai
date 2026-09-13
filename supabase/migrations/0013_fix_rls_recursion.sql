-- Fix infinite recursion in project_members RLS policies
-- When project_members had a policy querying project_members itself, PostgreSQL
-- threw 'infinite recursion detected in policy for relation project_members'.
-- Solved by creating SECURITY DEFINER helper functions that execute without RLS recursion.

create or replace function public.is_project_member(p_id uuid, u_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_id and user_id = u_id
  ) or exists (
    select 1 from public.projects
    where id = p_id and user_id = u_id
  );
$$;

create or replace function public.is_project_owner(p_id uuid, u_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_id and user_id = u_id and role = 'owner'
  ) or exists (
    select 1 from public.projects
    where id = p_id and user_id = u_id
  );
$$;

-- Fix project_members policies
drop policy if exists "project_members_select_member" on public.project_members;
create policy "project_members_select_member" on public.project_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_project_member(project_id, (select auth.uid()))
  );

drop policy if exists "project_members_manage_owner" on public.project_members;
create policy "project_members_manage_owner" on public.project_members
  for all to authenticated
  using (
    is_project_owner(project_id, (select auth.uid()))
  )
  with check (
    is_project_owner(project_id, (select auth.uid()))
  );

-- Fix projects policies
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member" on public.projects
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or is_project_member(id, (select auth.uid()))
  );

drop policy if exists "projects_update_member" on public.projects;
create policy "projects_update_member" on public.projects
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or is_project_member(id, (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    or is_project_member(id, (select auth.uid()))
  );

drop policy if exists "projects_delete_owner" on public.projects;
create policy "projects_delete_owner" on public.projects
  for delete to authenticated
  using (
    is_project_owner(id, (select auth.uid()))
  );
