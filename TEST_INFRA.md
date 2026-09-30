# AtelierOS Enterprise Test Infrastructure & Quality Assurance Architecture (`TEST_INFRA.md`)

## 1. Test Architecture & Quality Philosophy

AtelierOS is an institutional architectural CAD and project intelligence platform where computational accuracy, statutory compliance, structural life-safety, and financial fiduciary standards are paramount. Errors in structural deflection limits, egress travel distances, reverberation times, or pro-forma underwriting carry severe statutory and financial consequences.

### Core Testing Principles
1. **Requirement-Driven & Authoritative Ground Truth**:
   Every test case is derived strictly from codified statutory standards and institutional specifications:
   - **National Building Code of India (NBC 2016)**: Part 3 (Development Control & General Building Requirements), Part 4 (Fire & Life Safety), Part 8 Section 1 (Daylighting & Lighting).
   - **Bureau of Indian Standards (BIS)**: IS 456:2000 (Plain & Reinforced Concrete), IS 1893:2016 (Earthquake Resistant Design Zone IV), IS 13920 (Ductile Detailing), IS 287 (Equilibrium Moisture Content for Timber), IS 15477 (Adhesives for Tile & Stone).
   - **CPWD Delhi Schedule of Rates (DSR 2024)**: Item-rate specifications and sub-head schedules.
   - **Acoustic & BIM Standards**: ASTM E413 / ASTM E90 (Sound Transmission Class STC), Sabine Reverberation Time formula, buildingSMART ISO-10303-21 (IFC4 LOD 300) and COBie standard.
   - **Haryana DTCP (Gurugram/Faridabad)**: Base FAR 1.75, Purchasable FAR up to 2.64, 60% Maximum Ground Coverage.

2. **Opaque-Box (Black-Box) Verification**:
   Tests treat the calculation engines, geometry linters, and scheduling pipelines as opaque functional black-boxes. Tests assert observable public API behavior, return shapes, numerical tolerances, and invariant properties without coupling to internal private implementation details.

3. **Zero Facade Tests**:
   Every test executes real mathematical formulations, geometric checks, and topological pathfinding. No mock bypasses, hardcoded boolean returns, or vacuous assertions (`expect(true).toBe(true)`) are permitted.

4. **Progressive Testability & Deterministic Isolation**:
   Every test suite is fully self-contained, idempotent, and isolated. Tests instantiate independent test fixtures, verify determinism across runs, and leave zero lingering state mutations.

---

## 2. The 4-Tier Quality Methodology

AtelierOS implements a rigorous 4-Tier test architecture to guarantee full-spectrum coverage:

```
+-----------------------------------------------------------------------+
|  Tier 4: Real-World Institutional Scenarios                           |
|  (Complete end-to-end luxury penthouses, commercial tenant fitouts)   |
+-----------------------------------------------------------------------+
                                  ▲
+-----------------------------------------------------------------------+
|  Tier 3: Cross-Feature Multi-Pillar Interactions                      |
|  (VE substitutions ➔ Underwriting ➔ 4D CPM Schedule ➔ BIM LOD 300)   |
+-----------------------------------------------------------------------+
                                  ▲
+-----------------------------------------------------------------------+
|  Tier 2: Boundary & Corner Cases (>= 5 per Pillar)                    |
|  (Threshold limits, division-by-zero, extreme inputs, edge geometry)  |
+-----------------------------------------------------------------------+
                                  ▲
+-----------------------------------------------------------------------+
|  Tier 1: Feature Coverage (>= 5 per Pillar)                           |
|  (Primary contract & happy path behavior across all 5 Pillars)        |
+-----------------------------------------------------------------------+
```

### Tier 1: Feature Coverage (Primary Capabilities)
- Minimum threshold: **$\ge 5$ distinct test cases per pillar**.
- Focus: Functional verification of every calculator method, parameter option, mathematical return contract, and reporting format.

### Tier 2: Boundary & Corner Cases (Defensive Robustness)
- Minimum threshold: **$\ge 5$ boundary/corner test cases per pillar**.
- Focus: Mathematical boundary limits ($L/d = 26.0$, $R = 150\text{mm}$, $T = 300\text{mm}$, $2R+T \in [550, 650]\text{mm}$, $d_{travel} = 30.0\text{m}$, $DF = 1.0\%$, FAR = 2.64, 0 area / 0 budget protection, extreme occupancy scaling).

### Tier 3: Cross-Feature Interactions (Systemic Synthesis)
- Minimum threshold: **$\ge 6$ cross-cutting integration test cases**.
- Focus: Interaction loops where outputs of one pillar feed another:
  - Pillar 1 (PE BOQ VE Marble-to-Kota swap) ➔ Pillar 5 (4D CPM Schedule lead time compression by -14 weeks).
  - Pillar 2 (Structural 450mm ceiling plenum void & slab drop) ➔ Pillar 4 (Habitable room height $\ge 2.75\text{m}$ & Sabine room acoustic volume $V$).
  - Pillar 2 (300×300mm continuous MEP wet riser shaft) ➔ Pillar 1 (Deductible service shaft FAR zoning classification).
  - Pillar 3 (2-hour fire stair tower & FD 120 doors) ➔ Pillar 5 (IFC4 LOD 300 COBie property set tagging).
  - Pillar 4 (Daylight Factor orientation & window head height) ➔ Pillar 4 (Vastu Ishanya/NE quadrant solar opening alignment).

### Tier 4: Real-World Institutional Scenarios (Stress Benchmarks)
- Minimum threshold: **$\ge 5$ end-to-end institutional project benchmarks**.
- Focus: Complete realistic asset profiles:
  - DLF Phase 5 Ultra-Luxury Sanctuary Penthouse (12,000 sq ft, 3.4m F2F, Italian marble to Kota VE, STC 56 acoustic privacy).
  - Gurugram Grade-A Commercial IT Suite (60,000 sq ft, 6.0m×7.2m grid, multiple exit cores, 50 Pa pressurized stairs).
  - Monsoon-Window Turnkey Handover (July 1 - Sept 15 execution, IS 287 EMC 8-12% joinery protection, 90-day critical path).
  - High-Density Transit Residence (1,200 sq ft benchmark, 84% NTG squeeze, 18.4m egress vector, 300x300mm wet core).
  - Heritage Sanctuary with Paramasayika 9-Zone Vastu Alignment & Sabine Museum Acoustic Comfort.

---

## 3. Feature Inventory & Pillar Mapping

| Pillar | Subsystem / Engine | Primary Requirements & Statutory Codes | Test Suite Location | Target Tests |
|:---|:---|:---|:---|:---:|
| **Pillar 1** | **PE Financial Underwriting & Statutory FAR Monetization** | - Yield-on-Cost (YoC $\ge 8.5\%$), NOI, 10-Yr IRR, Payback Period<br>- Haryana DTCP Base FAR 1.75, Purchasable 2.64, Max Ground Coverage 60%<br>- Net-to-Gross (NTG $\ge 84\%$) carpet-to-saleable efficiency<br>- Official CPWD DSR 2024 tender schedule CSV export (11.36.1, 13.48, 9.21.2, 19.3.1, 31.8.2)<br>- FAR Zone classification (Carpet green, Circulation amber, Shaft blue) | `src/lib/calculators/five-pillars.test.ts`<br>`src/lib/calculators/pe-underwriting.ts` | $\ge 15$ |
| **Pillar 2** | **Structural Bay Grid & 3D MEP BIM Coordination** | - Modular Bay Grids: $6.0\text{m} \times 6.0\text{m}$, $6.0\text{m} \times 7.2\text{m}$, $7.2\text{m} \times 7.2\text{m}$<br>- RC Column sizing: $400\times 400\text{mm}$ interior, $450\times 600\text{mm}$ corner/shear<br>- IS 456:2000 Cl. 23.2 $L/d \le 26.0$ continuous, $L/d \le 7.0$ cantilever<br>- Long span deflection warnings for spans $> 7.50\text{m}$ and cantilevers $> 2.0\text{m}$<br>- Ceiling plenum void check: $450\text{mm}$ false ceiling void with $\ge 2.75\text{m}$ clear room height (NBC Part 3 Cl. 12.2) | `src/lib/calculators/five-pillars.test.ts`<br>`src/lib/calculators/structural-grid-engine.ts` | $\ge 15$ |
| **Pillar 3** | **Multi-Floor Egress & Fire Engineering Automation** | - NBC 2016 Part 4 Table 8: Riser $R \le 150\text{mm}$, Tread $T \ge 300\text{mm}$<br>- Blondel ergonomic formula: $550\text{mm} \le 2R + T \le 650\text{mm}$<br>- Clear stairway width: $\ge 1.50\text{m}$ (residential $>15\text{m}$), $\ge 1.00\text{m}$ ($\le 15\text{m}$), $\ge 2.00\text{m}$ (commercial)<br>- Multi-exit Euclidean nearest-door routing vectors $\le 30.0\text{m}$ (unsprinklered) / $\le 45.0\text{m}$ (sprinklered)<br>- Municipal fire department evacuation submittal dossier export (50 Pa pressurization, FD 120 fire doors, hose reels) | `src/lib/calculators/five-pillars.test.ts`<br>`src/lib/calculators/staircase-egress-calculator.ts` | $\ge 15$ |
| **Pillar 4** | **Museum Acoustics, Daylighting & Vastu Mandala** | - Sabine Reverberation Time: $RT_{60} = \frac{0.161 \cdot V}{A}$ across octave bands<br>- Luxury sanctuary target: $0.40\text{s} \le RT_{60} \le 0.55\text{s}$; living/dining $0.45\text{s} \le RT_{60} \le 0.70\text{s}$<br>- STC 56 tested acoustic decoupling (Double stud, Rockwool 48kg/m³, 2x15mm SoundStop)<br>- Flanking transmission risk audits (plenum, unsealed doors, back-to-back electrical boxes)<br>- CIE Overcast Sky Daylight Factor (DF %) per NBC Part 8 Sec 1 ($\ge 1.0\%$ bed, $\ge 1.5\%$ living, $\ge 2.0\%$ study)<br>- 9-Zone Vastu Shastra Paramasayika mandala quadrant alignment (Ishanya NE, Agni SE, Nairutya SW, Vayu NW, Brahmasthan) | `src/lib/calculators/five-pillars.test.ts`<br>`src/lib/calculators/acoustic-rt60-calculator.ts` | $\ge 18$ |
| **Pillar 5** | **4D EPC Construction Scheduling & Turnkey Resilience** | - 4D Critical Path Method (CPM): Forward pass (ES, EF), Backward pass (LS, LF), Total Float ($TF = LS - ES$), Critical Path detection<br>- Day 0 to Day 90 turnkey luxury handover baseline<br>- Dynamic lead-time compression on Value Engineering approvals (-14 weeks on domestic Kota/Kajaria stone swap)<br>- Delhi-NCR monsoon weather risk assessment (July 1 - Sept 15, IS 287 timber joinery 8-12% EMC warping risk, screed moisture buffering)<br>- buildingSMART IFC4 LOD 300 & COBie schedule export with CPWD DSR codes, U-values, STC, and fire ratings | `src/lib/calculators/five-pillars.test.ts`<br>`src/lib/calculators/construction-gantt-engine.ts` | $\ge 17$ |

---

## 4. Test Execution & Automated Runners

### Test Runner Commands
1. **Full Project Unit & Calculator Suites**:
   ```bash
   cd apps/web && npm test
   # Or equivalently:
   node apps/web/scripts/run-unit-tests.mjs
   ```
2. **Dedicated 5-Pillar E2E Runner with Tabular Output**:
   ```bash
   node apps/web/scripts/test-5pillars-e2e.mjs
   ```
3. **Adversarial Empirical Boundary Test Suite**:
   ```bash
   node apps/web/scripts/adversarial-compliance-test.mjs
   ```
4. **TypeScript Static Typecheck**:
   ```bash
   cd apps/web && npx tsc --noEmit
   ```

### Quality Assurance Gating Thresholds
- **Test Pass Rate**: 100% (Zero failing tests permitted).
- **TypeScript Errors**: 0 errors on strict configuration.
- **Regression Policy**: All existing 107 baseline tests must remain fully green.
- **Flakiness Policy**: All tests are fully deterministic with zero network, timer, or non-deterministic random seed dependencies.
