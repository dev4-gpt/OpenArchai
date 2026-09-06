-- uploads never had an UPDATE policy (only select/insert/delete from
-- 0001_init.sql) -- setUploadScale()'s writes were silently filtered to
-- zero rows by RLS with no error surfaced, since a missing policy just
-- means "no rows match", not a SQL error. Same ownership-via-project_id
-- pattern as every other table's update policy.
create policy "uploads_update_own" on public.uploads
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = uploads.project_id and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = uploads.project_id and p.user_id = (select auth.uid())
  ));
