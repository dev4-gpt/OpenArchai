-- Real-world scale calibration (Initiative 3). Calibration is a property of
-- the source image, not the generated model, so it lives on uploads.
-- scale_pixels_per_meter is measured in the ORIGINAL uploaded image's pixel
-- space -- the ML pipeline letterboxes/resizes to a fixed 512x512 canvas
-- internally and must convert through that same ratio before use (see
-- services/ml/reconstruct.py), never compare this value directly against
-- canvas-space pixel counts.
alter table public.uploads add column if not exists scale_pixels_per_meter numeric;
alter table public.uploads add column if not exists wall_height_m numeric;

-- India/US market alignment: canonical storage stays metric everywhere:
-- only the input/display layer (apps/web/src/lib/units.ts) speaks imperial.
alter table public.projects add column if not exists unit_system text not null default 'metric'
  check (unit_system in ('metric', 'imperial'));
