-- renders was missing error_message (models already has it) — needed to
-- surface failures from the Modal render pipeline back to the row.
alter table public.renders add column if not exists error_message text;
