# Production readiness — must-haves and status

Context: OpenArchai is being built primarily for [Pamela Dev & Co / PDCO Architects](https://kreatecube.com/profile/pdco-architects) (Gurgaon), not as a public SaaS competing with products like Arqio. That means the user base is small and closed (family + colleagues at the firm), not an anonymous public signup pool — so most abuse-prevention engineering (rate limiting against strangers, secret rotation/replay protection, three-tier staging environments, cost dashboards, formal ToS) is lower priority than it would be for a public product. What stays must-have regardless of user count is protection of real client data and a workflow non-technical users can actually rely on. See the full audit appended below for the complete list this was drawn from.

## Must-haves — status

### 1. Upload validation before compute — done
- [apps/web/src/lib/image-validation.ts](../apps/web/src/lib/image-validation.ts): shared magic-byte sniffing (PNG/JPEG/WebP), 15MB size cap, 8000px dimension cap (decompression-bomb guard).
- [upload-form.tsx](../apps/web/src/app/dashboard/[projectId]/upload-form.tsx): validates client-side before upload (fast feedback).
- [actions.ts `recordUpload`](../apps/web/src/app/dashboard/[projectId]/actions.ts): re-downloads and re-validates the stored object server-side — the actual enforcement boundary, since the client check can be bypassed by calling the action directly. Deletes the object and rejects if invalid.
- [services/ml/reconstruct.py `_validate_image_bytes`](../services/ml/reconstruct.py): same checks again inside the Modal job (defense-in-depth — the job can be invoked directly, retried, or hit a stale pre-validation object), using Pillow's own format/dimension checks.

### 2. Data isolation between projects — done, verified live
- RLS policies in [0001_init.sql](../supabase/migrations/0001_init.sql) already scoped every table through `project_id → projects.user_id = auth.uid()`, including storage bucket policies.
  - **Update (2026-09-09):** [0012_project_collaboration.sql](../supabase/migrations/0012_project_collaboration.sql) replaced the single-owner model above with a `project_members` table (owner/editor roles) — PDCO staff can now share a project. Every policy this section describes was rewritten to check membership instead of direct `user_id` ownership; storage paths are unchanged, only the policy predicate moved from checking the first path segment (uploader id) to the second (project id).
- [apps/web/scripts/verify-rls.mjs](../apps/web/scripts/verify-rls.mjs): creates two throwaway auth users, has user A own a project/upload/model/render, then asserts user B cannot SELECT, INSERT, UPDATE, or download any of it. Run with `npm run verify:rls` from `apps/web/`.
- Run on 2026-09-05 against the live dev project: **7/7 checks passed**.

### 3. Retry/error UX — done
- [actions.ts](../apps/web/src/app/dashboard/[projectId]/actions.ts): `retryReconstruction(modelId)` and `retryRender(renderId)` — only permitted when the row is currently in `error` status; resets status to `pending`, clears `error_message`, and re-fires the Modal call with the original stored parameters.
- [realtime-status.tsx](../apps/web/src/app/dashboard/[projectId]/realtime-status.tsx): a `Retry` button appears next to any `error` model or render.
- Duplicate-submission guard: `triggerReconstruction`/`triggerRender` now check for an existing `pending`/`processing` row for the same upload/model before inserting a new one, so a double-click can't queue two GPU jobs. (This is the lightweight version — a DB-level unique-index/advisory-lock guard was categorized as an abuse-prevention item and deferred per the closed-user-base framing above.)

### 4. Finish the style-picker / render workflow — done
- [style-picker-form.tsx](../apps/web/src/app/dashboard/[projectId]/style-picker-form.tsx): five style presets (Scandinavian, Industrial, Contemporary, Warm minimalist, Japandi) plus a custom-prompt fallback, disabled while a render is already in flight for that model.
- [model-actions.ts `getRenderSignedUrl`](../apps/web/src/app/dashboard/[projectId]/model-actions.ts) + `DoneRenderImage` in realtime-status.tsx: completed renders now display the actual styled image, not just a status label.
- Verified end-to-end in the browser against the seeded demo project — model viewer, render image, and style-picker form all render correctly (typecheck, lint, and production build all clean).

### 5. Basic dev/prod separation — partially done, one step needs your action
- Code already reads all Supabase/Modal config from environment variables — nothing is hardcoded, so pointing at a second Supabase project is a config change, not a code change.
- **Manual step required** (needs your Supabase account, not something I can do headlessly): create a second Supabase project for production, apply all four migrations to it (`node --env-file=.env.local scripts/run-migration.mjs <file>` per migration, pointed at the new project's connection string), and give the Vercel deployment its own `.env` pointing at the new project's keys. Keep the current project as dev/demo only.
- Until that split exists, treat the current Supabase project as containing both dev and demo data — don't put a real client's floorplan in it yet.

## Observability tooling — planned, not yet integrated (2026-09-06)

Two different tools cover two different gaps. Neither is urgent at current scale (closed beta, 1-2 users) — both are noted here so the reasoning survives until it's time to add them, rather than re-litigating from scratch.

- **[Opik](https://github.com/comet-ml/opik)** (Comet, Apache 2.0) — scoped to LLM/GenAI-specific tracing and evaluation: prompt/completion tracing, latency, LLM-as-a-judge scoring, prompt versioning. **Why it's relevant here**: the render step (`services/ml/render.py`) is a prompt→image generation call — Opik would let us trace each render's prompt, style preset, latency, and (via its evaluation tooling) compare output quality across prompt variants. This maps directly to the "research iterations on styles/prompts" goal from the production-readiness audit. It does **not** cover general app errors, job state, or infra — it's not a Sentry/Datadog substitute.
- **Sentry** (or equivalent APM/error-tracking tool) — general error tracking across both halves of the stack: unhandled exceptions in Next.js server actions, and failures inside Modal jobs that currently only surface as a `error_message` string on the row (no stack trace, no alerting). **Why it's needed**: this is the actual gap called out in the audit's "Observability and alerts" section — right now, a failure is discovered by a human noticing a stuck or errored row, not by the system telling anyone. Sentry has free-tier support for both Next.js and Python, making it the lower-effort option here versus building structured logging + alerting from scratch.

**When to actually add these**: Opik when style/prompt research becomes a real, repeated activity (not yet); Sentry when there's more than one active user, so failures can't just be watched for manually.

## Deferred (re-raise if PDCO opens this beyond internal use)
Rate limiting/quotas against abuse, Modal secret rotation + replay protection, three-tier staging environments, full CI test pyramid, RUNBOOK.md/ADRs, cost dashboards, formal ToS/privacy policy, research/benchmark harness, job-state-machine redesign (attempt counts, heartbeats, stale-job sweeper). All reasonable engineering, none of it defends against a threat that doesn't exist yet with a closed, known user base.

---

## Reference: full audit (Perplexity, 2026-09-04)

> You have a credible **working vertical slice**, not a production-ready product yet. The repository structure confirms the intended three-system split—Next.js web app, Supabase migrations, and Modal ML service—and the critical end-to-end paths are present: direct upload, asynchronous reconstruction/render job triggering, Supabase state updates, and Realtime-driven UI refreshes. The biggest remaining work is not the core pipeline; it is production hardening, job control, observability, and completing the user-facing render workflow.

### What the repository confirms

Your written architecture is substantially accurate:

| Layer | What is present | Assessment |
|---|---|---|
| `apps/web` | Next.js application with `dashboard`, auth/login routes, a proxy, Supabase client utilities, project actions, upload form, Realtime status component, and 3D viewer surface | Solid MVP foundation |
| `supabase/migrations` | Initial schema plus migration work for render errors and Realtime / replica identity | Correct direction; security and operational maturity need verification/testing |
| `services/ml` | Modal entrypoint, shared configuration, Supabase service client helpers, reconstruction and render task modules, vendored floorplan model directory | Core GPU workload separation is sensible |
| Delivery structure | Web, database, and ML are physically and operationally separable | Good architecture for Vercel + Supabase + Modal |

The current repository has a real app structure rather than a prototype dumped into one service. In particular, the project-detail route includes `actions.ts`, signed-model URL handling, upload UI, and a dedicated `realtime-status.tsx`; the ML service is separated into `modal_common.py`, `common.py`, `reconstruct.py`, `render.py`, and a deploy entrypoint. That separation will make it easier to add tests, metrics, and per-service deployment controls.

One correction to the earlier audit: a `README.md` **does** now exist under `apps/web`, along with lint configuration and a package lockfile. That is better than "no docs whatsoever," although production readiness still needs a root-level architecture/runbook, ML deployment documentation, and environment templates.

### Production blockers

These are the items I would call **must-fix before external users**, ordered by risk rather than visual polish.

#### 1. GPU-spend protection and job admission control

This is the highest priority because every duplicate request or malicious caller can turn into paid GPU execution.

Implement defense in depth:

- **Rate limit at the Next.js boundary** by authenticated user ID and IP address. Treat reconstruction and rendering separately because they have very different cost profiles.
- Add **per-user quotas**: e.g., render credits/day, concurrent jobs per user, maximum active projects, maximum uploads per project.
- Add a database-enforced job guard. Before inserting a new `models` or `renders` job, atomically reject it if an equivalent job for that project/model is already `pending` or `processing`.
- Configure Modal execution limits: cap concurrency, bound retries, set task timeouts, and decide explicitly what happens when the queue is full.
- Store a cost-relevant job record: runtime, GPU type, attempts, endpoint, input size, model version, and terminal status. Without this, you cannot explain or manage inference spend.
- Never rely only on disabling the browser button. UI controls prevent accidents; the database/service boundary prevents abuse and race conditions.

A reliable database rule is: only one active reconstruction per `project_id`; only one active render per `(model_id, normalized_prompt_style)` unless you deliberately support variants. Enforce it with a partial unique index or a transaction/advisory-lock approach rather than a client-side pre-check.

#### 2. Upload validation before compute

`accept="image/*"` is only a browser hint. Your backend must enforce what it accepts.

Build an upload-gate flow:

1. Browser requests a signed upload URL only after server-side authorization.
2. Server validates expected metadata: MIME allowlist, extension, image dimensions, and hard byte limit.
3. Store in a **quarantine/private upload prefix** first.
4. A worker validates actual file magic bytes and decodes the image safely.
5. Only then insert or mark the `uploads` record as eligible for reconstruction.

Minimum policy:

- Restrict to JPEG, PNG, and WebP initially.
- Hard-cap original bytes and decoded pixel dimensions—decompression-bomb protection matters, not just file size.
- Strip or ignore EXIF metadata unless you deliberately need it.
- Reject animated formats and SVG unless you have a dedicated sanitization pipeline.
- Enforce the same checks in the Modal reconstruction task, because direct storage writes or older uploads may bypass web validation.

The ML task must fail cleanly with a useful `error_message` if the stored object is missing, invalid, oversized, or incompatible with your preprocessing.

#### 3. Authenticated service-to-service invocation

A long-lived static shared secret is acceptable for a local spike but weak as a production control.

Upgrade the Modal invocation path to include:

- A rotating secret with documented rotation steps.
- Short-lived signed request tokens minted server-side.
- Issuer, audience, expiry, request ID, job ID, and user/project scope in the signed claims.
- Replay protection using a nonce or idempotency key.
- Strict server-side verification that the requested `project_id`, `upload_id`, and `model_id` belong to the intended job.

Also ensure Modal endpoints are not unintentionally useful as public anonymous APIs. Even if the endpoint validates a secret, absent rate limiting and rotation, a leaked secret creates a direct GPU-spend path.

#### 4. Correct job state machine

Your current `pending → processing → done | error` state model is a good MVP, but production jobs need more semantics.

I would move to:

```
queued → running → succeeded | failed | cancelled | expired
```

Add these fields to both model/render jobs:

- `attempt_count`
- `max_attempts`
- `started_at`
- `finished_at`
- `heartbeat_at`
- `created_at`
- `updated_at`
- `idempotency_key`
- `worker_job_id` or Modal call ID
- `pipeline_version`
- `input_asset_version`
- `failure_code` plus human-readable `error_message`

Then add a reaper/sweeper job: any job stuck in `queued`/`running` beyond a defined TTL should become `failed` or be safely retried. A serverless workload can die after being spawned; without a sweep, jobs can remain "processing" forever.

### Product gaps

The product should be usable as a coherent workflow, not just technically complete.

#### Render creation is still incomplete

The repository's project-detail folder includes upload, actions, Realtime status, and signed model access, but no dedicated style-picker or render-gallery component appears in that route. That matches your assessment: the rendering backend exists, but the essential UI to request and browse renders is not yet a first-class product path.

Build the following next:

- A **Render panel** attached to each completed model.
- A curated style preset grid: "Scandinavian," "Industrial," "Contemporary," "Warm minimal," "Japandi," etc.
- An optional advanced prompt field with a visible character limit and prompt guidance.
- A clear primary CTA: "Generate render."
- A render queue with status, elapsed time, retry button, error explanation, and cancel where feasible.
- A responsive gallery with a large selected render, thumbnails, metadata, download action, and "generate variation."
- Per-render provenance: model version, selected style, input model timestamp, pipeline version, and creation time.

Do not start with unconstrained prompt engineering as the main UI. For architecture users, presets plus optional modifiers will produce more predictable output, easier evaluation, and a cleaner research dataset.

#### Make failure recovery a feature

The current product should never force "make a new project" after a transient error.

Add:

- "Retry reconstruction" and "Retry render" buttons.
- Server-side attempt limits and exponential backoff.
- A "duplicate as new variant" action when a render succeeds but the user wants another sample.
- User-friendly failure taxonomy:
  - Unsupported or unreadable floorplan
  - Insufficient plan detail
  - Inference timeout
  - GPU service temporarily unavailable
  - Generation rejected by safety policy
  - Internal processing error

Avoid exposing raw stack traces or infrastructure secrets in `error_message`. Save detailed internal diagnostics in logs; display a sanitized, actionable message to users.

#### Design the project screen around stages

The cleanest UX is a step-based workspace rather than nested lists:

1. **Source plan** — Upload, preview, replace, validation result, file dimensions.
2. **3D reconstruction** — Status card, processing explanation, finished 3D viewport, retry/rebuild action.
3. **Style and render** — Presets, optional text direction, settings, generate action.
4. **Render gallery** — Image grid, selected image view, export/share/download, metadata.

For the 3D viewer, focus first on user confidence rather than advanced controls:

- A fixed camera reset button.
- "Fit model" on every load.
- A loading skeleton while the GLB downloads/parses.
- A visible orbit/zoom hint only on first interaction.
- A clear fallback when GLB loading fails.
- Neutral studio lighting, soft shadow plane, and consistent background.
- A "Model generated from floorplan; dimensions are illustrative" disclaimer until scale calibration exists.

That last disclosure matters. Fixed heights and scale-free reconstruction should be positioned as conceptual visualization, not a construction-grade model.

### Reliability and security baseline

Before public beta, add a disciplined verification layer.

#### Test pyramid

| Test level | What to cover | Priority |
|---|---|---|
| Unit | Input validation, job-state transitions, prompt normalization, signed-token verification, geometry conversion helpers | Immediate |
| Database/RLS | User A cannot read/write User B's projects, uploads, models, renders, or storage objects | Immediate |
| Integration | Direct upload → job insertion → Modal request contract → status/result persistence | Immediate |
| End-to-end | Sign up, create project, upload sample, reconstruct, observe status, generate render, retry failure | Immediate |
| Regression fixtures | Representative clean floorplans, noisy scans, rotated plans, invalid images, large images, multi-room layouts | High |
| Visual/3D | Screenshot and GLB validity tests for viewer loading/framing | Later but useful |

Your RLS policies are the core boundary, so test them as a product feature. Build tests that authenticate as at least two users and attempt cross-tenant reads/writes in all four tables plus every storage bucket path. Do not settle for visually inspecting migration SQL.

#### CI and deployment gates

At minimum, every pull request should run:

- Web install with lockfile integrity.
- Lint.
- Typecheck.
- Production build.
- Unit and integration tests.
- Migration lint/check.
- Secret scanning.
- Dependency vulnerability review.
- A smoke test against a preview environment where practical.

For the ML side, validate that the Modal image builds, imports cleanly, and can execute lightweight fixtures without needing to run a full diffusion job on every PR. Full GPU canaries can be scheduled or run on merges to main.

#### Observability

You need to know a job failed before a user tells you.

Add:

- Structured JSON logs with `request_id`, `job_id`, `project_id`, `user_id` or hashed user reference, pipeline version, elapsed time, and outcome.
- Error tracking for browser, Next.js server actions, and Python/Modal jobs.
- Metrics: queue delay, reconstruction duration, render duration, success rate, retry rate, cost per successful render, upload rejection rate, Realtime reconnect rate, and stuck-job count.
- Alerts for error-rate spikes, job queue age, budget threshold, secret validation failures, and storage growth.
- A correlation ID propagated from UI action → server action → Modal endpoint → job record → Supabase update.

This is especially valuable for your research goals. With proper instrumentation, OpenArchai becomes a system you can study: quality-versus-latency, quality-versus-cost, failure distributions by input type, and the effect of different pipeline versions.

### Data, privacy, and operations

#### Separate environments now

Create separate Supabase projects and secrets for:

- Local development
- Staging
- Production

Use separate storage buckets or projects, distinct Modal environments, separate budgets, and isolated demo data. Never let seeded demonstration assets, exploratory migrations, or developer credentials coexist with real user data.

Also create:

- `.env.example` files for web and ML, with variable names only.
- Root `README.md` explaining architecture, local setup, migrations, deployment, and the async flow.
- `RUNBOOK.md` for common operational incidents: stuck job, Modal outage, Realtime outage, leaked secret, excessive GPU spend, failed migration, and user deletion request.
- An architecture decision record folder for choices such as software rasterization, the segmentation model, and the Supabase-as-state-bus pattern.

#### Lifecycle management

Project deletion must delete or schedule deletion of:

- Floorplan source image
- Generated GLB
- Rendered images
- Derived metadata and job records
- Any temporary/preprocessed assets

Use a durable deletion workflow, not merely a database cascade. Storage deletion can fail independently; track deletion jobs, retry them, and keep an audit trail. Consider retention settings—for example, automatically purge inactive projects after a user-configurable period, subject to your privacy policy.

#### Privacy and policy

Before inviting users:

- Publish a privacy policy and terms.
- Explain what uploaded plans are used for, where files are stored, how long they are retained, and whether they are used for model improvement.
- Provide account/project deletion and export paths.
- State that generated models/renders are conceptual unless you add calibrated geometry, validation, and professional-grade accuracy guarantees.
- Include an acceptable-use policy for generated imagery and text prompts.

Floorplans can reveal home layouts, addresses, and security-sensitive information. Treat this as sensitive user content even if it is not regulated health or financial data.

### Research-ready upgrades

Since you want this to support publication rather than only SaaS delivery, build the product and data pipeline so it can answer research questions.

#### Version everything

For every reconstruction and render, persist: source image hash, preprocessing configuration, segmentation model/version/checkpoint hash, geometry algorithm version, render model/ControlNet/VAE/scheduler/seed/steps/CFG/resolution, prompt template/version, runtime/hardware/GPU type/memory failure status, output asset hash.

That lets you conduct reproducible ablations instead of producing anecdotal demos.

#### Create an evaluation harness

Build a small, permissioned benchmark set with clean digital floorplans, phone-captured or scanned plans, different line weights and resolutions, multi-room/irregular/cluttered examples, and ground-truth annotations where available.

Evaluate at three levels:

| Layer | Suggested metric |
|---|---|
| Segmentation | IoU/Dice for wall/room regions |
| Geometry | Room topology correctness, wall alignment error, opening/door recovery, mesh validity |
| Rendering | Human preference, prompt adherence, architectural plausibility, consistency with source geometry |
| System | Time-to-first-result, end-to-end success rate, GPU seconds per successful output, recovery success rate |

For a publishable angle, a strong systems research question is not simply "can diffusion render floorplans?" It is something like:

> How can a fault-tolerant, user-facing asynchronous pipeline produce controllable floorplan-to-3D-to-render results while optimizing geometry fidelity, perceived render quality, latency, and GPU cost?

That gives you measurable trade-offs and a defensible systems contribution.

#### Improve geometry before claims

Your reconstruction should be described carefully until it handles: scale estimation or user-provided calibration, doors/windows and semantic openings, wall thickness, room labeling, multi-level plans, non-Manhattan geometry, mesh cleanup/validity validation.

A practical next feature is a lightweight **human-in-the-loop calibration step**: let the user identify one known measurement—e.g., a 3 m wall—and then rescale the generated mesh. That immediately improves usefulness without requiring a major model redesign.

### Suggested release plan

**Phase 0 — Private alpha hardening**: upload validation and quotas, server-side idempotency/concurrency guards, retry and stale-job cleanup, staging versus production separation, basic error tracking and structured logs, RLS/storage policy tests, CI for lint/types/build/migrations/tests.

**Phase 1 — Closed beta usability**: style-picker and gallery, render retries and variants, polished workflow layout, model-viewer loading/error/reset states, budget dashboard and admin job inspection, terms/privacy policy/deletion flow, feedback capture on outputs.

**Phase 2 — Research-grade system**: versioned experiment records and reproducible configurations, benchmark dataset and evaluation harness, quality/cost/latency analytics, human correction/calibration tools, controlled A/B experiments.

### My exact priority order

1. Add authenticated rate limits, per-user quotas, Modal concurrency caps, and database-level idempotency.
2. Add strict upload validation plus safe image decoding in the worker.
3. Finish the style-picker, render trigger, render queue, gallery, and retry UX.
4. Add a durable job state machine with attempts, timestamps, stale-job cleanup, and idempotent requests.
5. Separate dev/staging/prod and document the full environment contract.
6. Add CI and the first RLS, server-action, and end-to-end smoke tests.
7. Add monitoring, cost metrics, error tracking, and an operational runbook.
8. Add storage lifecycle deletion and privacy/legal fundamentals.
9. Upgrade 3D scale/calibration and geometry quality.
10. Build the benchmark/evaluation harness for publication-quality research.

The key framing: **do not spend the next sprint primarily on visual polish.** The UI needs completion, yes, but the hard production risk is currently unbounded, asynchronous GPU work with limited admission control and no operational safety net. Once that boundary is secure, your UI and research work become much more valuable because users can actually rely on the system.
