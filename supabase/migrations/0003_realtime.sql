-- Enable Realtime change tracking on models/renders so the dashboard can
-- reflect the Modal pipeline's async status transitions live.
alter publication supabase_realtime add table public.models;
alter publication supabase_realtime add table public.renders;
