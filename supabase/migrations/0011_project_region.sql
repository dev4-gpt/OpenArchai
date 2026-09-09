-- Project-level region setting for compliance and style defaults.
-- Default 'india' for PDCO Architects (Gurgaon).
alter table public.projects
    add column if not exists region text not null default 'india'
    check (region in ('india', 'us'));
