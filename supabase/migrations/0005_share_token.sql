-- Client share links: a project can be given a random token that lets
-- anyone with the link view its done models/renders read-only, no account
-- needed. Lookup happens server-side via the service-role client (see
-- apps/web/src/lib/supabase/admin.ts) against this column directly, so no
-- anon RLS policy is needed here -- the token itself is the authorization.
alter table public.projects add column if not exists share_token uuid;
create unique index if not exists projects_share_token_key on public.projects(share_token) where share_token is not null;
