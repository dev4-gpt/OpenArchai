-- Realtime UPDATE events on models/renders weren't reliably reaching
-- subscribed clients (observed: INSERT delivered, subsequent UPDATE to the
-- same row never arrived). Default replica identity only includes primary
-- key columns for the "old" row image in the WAL; full identity includes
-- every column, which Realtime needs to evaluate column filters (e.g.
-- project_id=eq.X) consistently across UPDATE events.
alter table public.models replica identity full;
alter table public.renders replica identity full;
