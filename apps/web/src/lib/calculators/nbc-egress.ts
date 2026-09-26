/**
 * Deterministic NBC 2016 (National Building Code of India) egress compliance calculators.
 *
 * All constants are sourced directly from NBC 2016:
 *   - Part 4 (Fire & Life Safety), Tables 1 & 2, Clauses 4.5.1, 4.6
 *
 * These functions are pure (no side-effects, no API calls) and can be called by agent
 * prompts, unit tests, and the MiroFish harness to produce verifiable arithmetic.
 */

// ---------------------------------------------------------------------------
// NBC 2016 Constants (do not change without updating the source clause reference)
// ---------------------------------------------------------------------------
export const NBC = {
  /** NBC 2016 Part 4 Table 1 — Residential occupant load factor */
  OCCUPANT_LOAD_FACTOR_M2_PER_PERSON: 9.3,

  /** NBC 2016 Part 4 Table 2 — Minimum clear width: internal exit door */
  MIN_EXIT_DOOR_CLEAR_WIDTH_M: 0.9,

  /** NBC 2016 Part 4 Table 2 — Minimum clear width: common corridor */
  MIN_CORRIDOR_CLEAR_WIDTH_M: 1.2,

  /** NBC 2016 Part 4 Table 2 — Internal residential passage (spine) */
  MIN_INTERNAL_PASSAGE_WIDTH_M: 0.9,

  /**
   * NBC 2016 Part 4 Table 2 — Egress width factor.
   * Required clear width (mm) = occupants × 3.81 mm/occupant
   * (equivalent to 0.15 inch/occupant per IBC cross-reference)
   */
  EGRESS_WIDTH_FACTOR_MM_PER_OCCUPANT: 3.81,

  /** NBC 2016 Part 4 Clause 4.5.1 — Max travel distance, unsprinklered residential */
  MAX_TRAVEL_DISTANCE_UNSPRINKLERED_M: 30,

  /** NBC 2016 Part 4 Clause 4.5.1 — Max travel distance, sprinklered residential */
  MAX_TRAVEL_DISTANCE_SPRINKLERED_M: 45,

  /** NBC 2016 Part 4 Clause 4.6 — Absolute maximum dead-end corridor length */
  MAX_DEAD_END_M: 6.0,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ComplianceResult {
  pass: boolean;
  value: number;
  limit: number;
  clause: string;
  message: string;
}

export interface EgressProofInputs {
  carpetAreaSqM: number;
  corridorClearWidthM: number;
  travelDistanceM: number;
  deadEndM?: number;
  sprinklered?: boolean;
  isCommonCorridor?: boolean;
}

export interface EgressProof {
  occupantLoad: number;
  requiredEgressWidthMm: number;
  corridorCheck: ComplianceResult;
  travelDistanceCheck: ComplianceResult;
  deadEndCheck?: ComplianceResult;
  allPass: boolean;
  /** Verbatim proof text suitable for a CFO / statutory auditor review */
  proofText: string;
}

// ---------------------------------------------------------------------------
// Core Calculator Functions
// ---------------------------------------------------------------------------

/**
 * Calculates the design occupant load for a residential space.
 * NBC 2016 Part 4 Table 1: 9.3 m² per person.
 *
 * @param carpetAreaSqM  Net carpet area in square metres (excludes walls & voids)
 * @returns  Number of occupants (rounded up per fire-safety convention)
 */
export function calcOccupantLoad(carpetAreaSqM: number): number {
  if (carpetAreaSqM <= 0) throw new RangeError("carpetAreaSqM must be > 0");
  return Math.ceil(carpetAreaSqM / NBC.OCCUPANT_LOAD_FACTOR_M2_PER_PERSON);
}

/**
 * Calculates the minimum required egress clear width in millimetres.
 * NBC 2016 Part 4 Table 2: 3.81 mm per occupant.
 *
 * @param occupants  Design occupant load from calcOccupantLoad()
 * @returns  Required clear width in mm (minimum 900 mm per door/passage floor)
 */
export function calcRequiredEgressWidthMm(occupants: number): number {
  const calculated = occupants * NBC.EGRESS_WIDTH_FACTOR_MM_PER_OCCUPANT;
  // NBC enforces an absolute floor of 900 mm for any internal exit passage
  return Math.max(calculated, NBC.MIN_EXIT_DOOR_CLEAR_WIDTH_M * 1000);
}

/**
 * Verifies that the provided corridor/passage clear width meets NBC minimums.
 * Uses the internal-passage standard (0.9 m) for residential spines.
 *
 * @param clearWidthM  Measured clear width of the corridor in metres
 * @param isCommonCorridor  True for shared building corridors (1.2 m); false for private spine (0.9 m)
 */
export function verifyEgressClearWidth(
  clearWidthM: number,
  isCommonCorridor = false,
): ComplianceResult {
  const limit = isCommonCorridor
    ? NBC.MIN_CORRIDOR_CLEAR_WIDTH_M
    : NBC.MIN_INTERNAL_PASSAGE_WIDTH_M;
  const clause = isCommonCorridor
    ? "NBC 2016 Part 4 Table 2 (common corridor: 1.2 m min)"
    : "NBC 2016 Part 4 Table 2 (internal residential passage: 0.9 m min)";
  const pass = clearWidthM >= limit;
  return {
    pass,
    value: clearWidthM,
    limit,
    clause,
    message: pass
      ? `✅ Clear width ${clearWidthM.toFixed(2)} m ≥ ${limit} m — compliant.`
      : `❌ Clear width ${clearWidthM.toFixed(2)} m < ${limit} m minimum — VIOLATION.`,
  };
}

/**
 * Verifies that the travel distance to the nearest exit stair does not exceed the NBC limit.
 *
 * @param distanceM   Measured travel distance in metres (worst-case path to exit)
 * @param sprinklered  True if the floor is fully sprinklered (raises limit from 30 m to 45 m)
 */
export function verifyTravelDistance(
  distanceM: number,
  sprinklered = false,
): ComplianceResult {
  const limit = sprinklered
    ? NBC.MAX_TRAVEL_DISTANCE_SPRINKLERED_M
    : NBC.MAX_TRAVEL_DISTANCE_UNSPRINKLERED_M;
  const clause = sprinklered
    ? "NBC 2016 Part 4 Cl. 4.5.1 (sprinklered: 45 m max)"
    : "NBC 2016 Part 4 Cl. 4.5.1 (unsprinklered: 30 m max)";
  const pass = distanceM <= limit;
  return {
    pass,
    value: distanceM,
    limit,
    clause,
    message: pass
      ? `✅ Travel distance ${distanceM.toFixed(1)} m ≤ ${limit} m — compliant.`
      : `❌ Travel distance ${distanceM.toFixed(1)} m > ${limit} m maximum — VIOLATION.`,
  };
}

/**
 * Verifies that no dead-end corridor exceeds the NBC maximum of 6.0 m.
 *
 * @param deadEndM  Length of the dead-end corridor in metres
 */
export function verifyDeadEnd(deadEndM: number): ComplianceResult {
  const limit = NBC.MAX_DEAD_END_M;
  const clause = "NBC 2016 Part 4 Cl. 4.6 (dead-end: 6.0 m max)";
  const pass = deadEndM <= limit;
  return {
    pass,
    value: deadEndM,
    limit,
    clause,
    message: pass
      ? `✅ Dead-end ${deadEndM.toFixed(1)} m ≤ 6.0 m — compliant.`
      : `❌ Dead-end ${deadEndM.toFixed(1)} m > 6.0 m maximum — VIOLATION.`,
  };
}

/**
 * Generates a complete, verifiable egress compliance proof — the kind a
 * statutory auditor, CFO, or NBC inspector can sign off on.
 *
 * @param inputs  EgressProofInputs object with all measured values
 * @returns  EgressProof with individual check results and a formatted proof text block
 */
export function generateEgressProof(inputs: EgressProofInputs): EgressProof {
  const {
    carpetAreaSqM,
    corridorClearWidthM,
    travelDistanceM,
    deadEndM,
    sprinklered = false,
    isCommonCorridor = false,
  } = inputs;

  const occupantLoad = calcOccupantLoad(carpetAreaSqM);
  const requiredEgressWidthMm = calcRequiredEgressWidthMm(occupantLoad);

  const corridorCheck = verifyEgressClearWidth(corridorClearWidthM, isCommonCorridor);
  const travelDistanceCheck = verifyTravelDistance(travelDistanceM, sprinklered);
  const deadEndCheck = deadEndM !== undefined ? verifyDeadEnd(deadEndM) : undefined;

  const allPass =
    corridorCheck.pass &&
    travelDistanceCheck.pass &&
    (deadEndCheck === undefined || deadEndCheck.pass);

  const deadEndLine =
    deadEndCheck !== undefined
      ? `  Dead-End:       ${deadEndCheck.value.toFixed(1)} m  ≤  ${deadEndCheck.limit} m  →  ${deadEndCheck.pass ? "PASS" : "FAIL"}\n`
      : "";

  const minCorridorWidth = isCommonCorridor
    ? NBC.MIN_CORRIDOR_CLEAR_WIDTH_M
    : NBC.MIN_INTERNAL_PASSAGE_WIDTH_M;
  const corridorLabel = isCommonCorridor ? "Common Corridor:" : "Corridor Width: ";

  const proofText = `NBC 2016 Part 4 — Egress Compliance Proof
==========================================
Carpet Area:        ${carpetAreaSqM.toFixed(1)} m²
Occupant Load:      ${carpetAreaSqM.toFixed(1)} m² ÷ ${NBC.OCCUPANT_LOAD_FACTOR_M2_PER_PERSON} m²/person = ${occupantLoad} persons  [Part 4 Table 1]
Required Width:     ${occupantLoad} persons × ${NBC.EGRESS_WIDTH_FACTOR_MM_PER_OCCUPANT} mm/person = ${(occupantLoad * NBC.EGRESS_WIDTH_FACTOR_MM_PER_OCCUPANT).toFixed(0)} mm  (floor: 900 mm)  [Part 4 Table 2]

Checks:
  ${corridorLabel}  ${corridorClearWidthM.toFixed(2)} m  ≥  ${minCorridorWidth.toFixed(1)} m  →  ${corridorCheck.pass ? "PASS" : "FAIL"}  [Part 4 Table 2]
  Travel Distance:  ${travelDistanceM.toFixed(1)} m  ≤  ${travelDistanceCheck.limit} m  →  ${travelDistanceCheck.pass ? "PASS" : "FAIL"}  [Part 4 Cl. 4.5.1]
${deadEndLine}
Overall:            ${allPass ? "✅ COMPLIANT" : "❌ NON-COMPLIANT — see failures above"}`;

  return {
    occupantLoad,
    requiredEgressWidthMm,
    corridorCheck,
    travelDistanceCheck,
    deadEndCheck,
    allPass,
    proofText,
  };
}
