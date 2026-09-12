# services/ml — OpenArchai Modal service

Modal-hosted GPU/CPU jobs for the floorplan → 3D → render pipeline and the
construction-accurate CAD → IFC pipeline. Deployed independently of `apps/web`.

## Files

- `modal_common.py` — shared Modal `app`, container images, and secret handle.
  Never imported by the other files below (see its own docstring for why).
- `common.py` — Supabase client helper + shared status-update logic.
- `reconstruct.py` — floorplan image → 3D GLB reconstruction.
- `render.py` / `render_v2.py` — styled render generation from a GLB.
- `reconstruct_cad.py` — DXF layer detection + element extraction (construction-accurate CAD).
- `build_ifc.py` — approved CAD elements → IFC4 file export.
- `app.py` — deploy entrypoint; imports every function/class module above so
  `modal deploy app.py` registers all of them in one pass.

## Local setup

```bash
cd services/ml
python3 -m venv .venv
.venv/bin/pip install modal
.venv/bin/modal setup   # one-time auth, writes ~/.modal.toml
```

## Secrets

Every container image pulls one shared Modal secret named `openarchai-ml`, containing:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHARED_SECRET` — must match `MODAL_SHARED_SECRET` in `apps/web/.env.local` /
  Vercel's env config; every endpoint checks this via `common.verify_shared_secret`.

Create or update it with:

```bash
.venv/bin/modal secret create openarchai-ml \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  SHARED_SECRET=...
```

## Deploy

```bash
./scripts/deploy.sh
```

This runs `modal deploy app.py`, which registers every `@app.function`/`@app.cls`
endpoint across all five pipeline modules. After deploying, copy each printed
`*.modal.run` URL into the matching `apps/web/.env.local` variable:

| Modal function | Web env var |
|---|---|
| `reconstruct_endpoint` | `MODAL_RECONSTRUCT_ENDPOINT_URL` |
| `render_endpoint` | `MODAL_RENDER_ENDPOINT_URL` |
| `detect_layers_endpoint` | `MODAL_DETECT_LAYERS_ENDPOINT_URL` |
| `extract_elements_endpoint` | `MODAL_EXTRACT_ELEMENTS_ENDPOINT_URL` |
| `build_ifc_endpoint` | `MODAL_BUILD_IFC_ENDPOINT_URL` |

As of this writing, only the first two are deployed and configured — the
CAD/IFC pipeline's three endpoints still need `./scripts/deploy.sh` run and
their URLs added, or the CAD upload flow will fail. See `docs/production-readiness.md`.
