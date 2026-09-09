-- pgvector extension for building code document embeddings (NBC India, IBC US).
-- Used by the compliance RAG pipeline in Phase 3.
create extension if not exists vector;

create table if not exists public.building_code_chunks (
    id uuid primary key default gen_random_uuid(),
    region text not null check (region in ('india', 'us')),
    code_name text not null,
    section_number text,
    section_title text,
    content text not null,
    embedding vector(768),
    created_at timestamptz not null default now()
);

-- RLS: building codes are public read, admin-only write
alter table public.building_code_chunks enable row level security;

create policy "building_codes_public_read" on public.building_code_chunks
    for select to authenticated
    using (true);
