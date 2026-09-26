# AtelierOS E2E & Unit Testing Infrastructure

## 1. Overview & Architectural Philosophy

AtelierOS uses a **zero-dependency, native Node.js test harness** designed for near-instant execution (~40ms), deterministic reproducibility, and seamless execution across local developer workstations and CI/CD pipelines.

The harness couples Node v26's native `node:test` execution runtime and `node:assert/strict` with `jiti` for on-the-fly TypeScript compilation without separate transpilation passes or external daemons like Jest or Vitest.

```
┌────────────────────────────────────────────────────────┐
│                      `npm test`                        │
│                           │                            │
│                           ▼                            │
│         `node scripts/run-unit-tests.mjs`              │
├────────────────────────────────────────────────────────┤
│  Harness Environment:                                  │
│   • Node.js native `node:test` BDD lifecycle           │
│   • Jest/Vitest-compatible `expect()` matchers engine │
│   • Runtime `jiti` TypeScript loader                   │
├────────────────────────────────────────────────────────┤
│  Discovered Test Suites:                               │
│   • `src/lib/calculators/nbc-egress.test.ts` (30 tests)│
│   • `src/lib/calculators/e2e-enterprise-features.      │
│      test.ts` (50 tests)                               │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Key Files

| File Path | Description |
|---|---|
| `apps/web/scripts/run-unit-tests.mjs` | Primary zero-dependency test runner script exposing BDD globals and running discovered suites. |
| `apps/web/package.json` | Registers `"test": "node scripts/run-unit-tests.mjs"`. |
| `apps/web/src/lib/calculators/nbc-egress.test.ts` | Unit test suite for NBC 2016 Part 4 statutory egress calculators (30 tests). |
| `apps/web/src/lib/calculators/e2e-enterprise-features.test.ts` | Comprehensive opaque-box E2E test suite covering Tiers 1-4 for the 4 Tier-1 architectural enterprise features (50 tests). |
| `TEST_READY.md` | Verification report certifying test suite readiness and pass criteria. |

---

## 3. Supported Expect API & Matchers

The test harness exposes standard BDD lifecycle primitives (`describe`, `it`, `test`, `before`, `after`, `beforeEach`, `afterEach`) on `globalThis`, accompanied by a fully-featured `expect()` assertion engine:

- **Equality & Identity**: `.toBe(expected)`, `.toEqual(expected)`, `.not.toBe()`, `.not.toEqual()`
- **Existence & Truthiness**: `.toBeDefined()`, `.toBeUndefined()`, `.toBeNull()`, `.toBeTruthy()`, `.toBeFalsy()`
- **Numeric Comparisons**: `.toBeGreaterThan()`, `.toBeGreaterThanOrEqual()`, `.toBeLessThan()`, `.toBeLessThanOrEqual()`, `.toBeCloseTo(expected, numDigits)`
- **Collections & Strings**: `.toContain(expected)`, `.toHaveLength(len)`, `.toHaveProperty(prop, value?)`, `.toMatch(regex)`
- **Exceptions**: `.toThrow(ErrorClassOrMessage?)`
- **Inversion**: `.not` modifier chaining on all above matchers (e.g. `expect(x).not.toContain(y)`)

---

## 4. Test Suite Inventory

### Suite 1: `nbc-egress.test.ts` (30 Tests)
- `calcOccupantLoad` (NBC 2016 Part 4 Table 1: 9.3 m²/person ceiling arithmetic)
- `calcRequiredEgressWidthMm` (3.81 mm/occupant with mandatory 900 mm absolute floor)
- `verifyEgressClearWidth` (0.9 m private residential spine, 1.2 m common corridor)
- `verifyTravelDistance` (30 m unsprinklered max, 45 m sprinklered max)
- `verifyDeadEnd` (6.0 m maximum dead end circulation pocket)
- `generateEgressProof` (Full statutory compliance audit trace generation)

### Suite 2: `e2e-enterprise-features.test.ts` (50 Tests)
- **Tier 1: Feature Coverage**
  - R1: Live 2D Egress Vector Path Overlay (retreat point (11.2, 7.8) to primary exit (1.2, 0.0), 18.4m travel distance, statutory readout pill).
  - R1: 300×300mm Wet Service Core Shaft (NE ensuite position at (11.6, 0.1), IS 1893 Zone IV / NBC Part 4 label).
  - R2: Real-Time BOQ Schedule of Rates Delta Chips (Italian Marble → Kajaria/Kota swap saving ₹8,55,000 / -30% and -14 weeks lead time).
  - R3: NBC 2016 Canvas Geometry Linter (doorway pinch detection <0.9m, common corridor pinch <1.2m, dead end >6.0m).
  - R4: Environmental & Acoustic Material Metadata Badges (IS 287, BWP 710, STC 56, IS 15477 C2TE S1, GreenGuard Gold Zero-VOC, Rajasthan Sourced).
- **Tier 2: Boundary & Corner Cases**
  - Limits at 0.899m / 0.900m / 0.901m (doors).
  - Limits at 1.199m / 1.200m / 1.201m (corridors).
  - Limits at 5.99m / 6.00m / 6.01m (dead ends).
  - Limits at 29.99m / 30.00m / 30.01m (unsprinklered) and 44.99m / 45.00m / 45.01m (sprinklered).
  - Zero area (RangeError), negative area (RangeError), 0.1 m² area, and ceiling threshold at 9.31 m² (2 persons).
  - 900mm floor enforcement from 1 to 236 occupants, transition at 237 occupants (903mm), and extreme institutional occupancy scaling (1,000 occupants → 3,810mm).
- **Tier 3: Cross-Feature Interactions**
  - Value Engineering substitution linking to master material catalog specifications (`fl_vitrified_kajaria`, `wl_asian_paints_royale`).
  - Commercial state mutation & live BOQ recalculation (budget cut from ₹28.5L to ₹19.95L, unit rate cut from ₹2,375/sqft to ₹1,663/sqft).
  - Combined Egress & NTG optimization tradeoff (84% NTG squeeze with statutory minimum egress width preservation).
- **Tier 4: Real-World Institutional Scenarios**
  - MiroFish institutional stress benchmark verification: 1,200 sqft apartment, Italian Marble → Kajaria PGVT / Kota stone swap saving exactly ₹8,55,000 / -30%, -14 weeks lead time, 18.4m egress vector, 300x300mm wet shaft, and full statutory audit proof text.

---

## 5. Execution Instructions

Run all unit and E2E calculator test suites:
```bash
cd apps/web && npm test
```

Run static type checking across all workspace files:
```bash
cd apps/web && npx tsc --noEmit
```
