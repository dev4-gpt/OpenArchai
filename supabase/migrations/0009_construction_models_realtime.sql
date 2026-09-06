-- Same reasoning as 0003_realtime.sql/0004_realtime_replica_identity.sql:
-- the layer-detection/extraction Modal jobs run async, so the UI needs
-- live status transitions rather than a manual refresh.
alter publication supabase_realtime add table public.construction_models;
alter table public.construction_models replica identity full;
