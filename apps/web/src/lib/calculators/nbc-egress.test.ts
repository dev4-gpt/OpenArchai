/**
 * Unit tests for NBC 2016 egress compliance calculators.
 *
 * Run with:  npx jest src/lib/calculators/nbc-egress.test.ts
 * (or vitest if configured:  npx vitest run src/lib/calculators/nbc-egress.test.ts)
 */

import {
  NBC,
  calcOccupantLoad,
  calcRequiredEgressWidthMm,
  verifyEgressClearWidth,
  verifyTravelDistance,
  verifyDeadEnd,
  generateEgressProof,
} from "./nbc-egress";

// ---------------------------------------------------------------------------
// calcOccupantLoad
// ---------------------------------------------------------------------------
describe("calcOccupantLoad — NBC 2016 Part 4 Table 1 (9.3 m²/person)", () => {
  it("returns 1 for a tiny bathroom (9.3 m²)", () => {
    expect(calcOccupantLoad(9.3)).toBe(1);
  });

  it("rounds UP — 9.31 m² → 2 persons", () => {
    expect(calcOccupantLoad(9.31)).toBe(2);
  });

  it("standard 111 m² apartment → 12 persons", () => {
    // 111 / 9.3 = 11.935... → ceil = 12
    expect(calcOccupantLoad(111)).toBe(12);
  });

  it("large 250 m² villa → 27 persons", () => {
    // 250 / 9.3 = 26.88... → ceil = 27
    expect(calcOccupantLoad(250)).toBe(27);
  });

  it("throws on zero area", () => {
    expect(() => calcOccupantLoad(0)).toThrow(RangeError);
  });

  it("throws on negative area", () => {
    expect(() => calcOccupantLoad(-10)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// calcRequiredEgressWidthMm
// ---------------------------------------------------------------------------
describe("calcRequiredEgressWidthMm — NBC 2016 Part 4 Table 2 (3.81 mm/occupant, min 900 mm)", () => {
  it("enforces 900 mm floor even for very small occupant count", () => {
    // 1 person × 3.81 = 3.81 mm → floor to 900 mm
    expect(calcRequiredEgressWidthMm(1)).toBe(900);
  });

  it("12 occupants → 45.72 mm, floored to 900 mm", () => {
    // 12 × 3.81 = 45.72 mm → still below 900 mm floor
    expect(calcRequiredEgressWidthMm(12)).toBe(900);
  });

  it("237 occupants → 903.0 mm (exceeds floor)", () => {
    // 237 × 3.81 = 902.97 → 903 mm (above 900 mm floor, so calculated value wins)
    const result = calcRequiredEgressWidthMm(237);
    expect(result).toBeGreaterThanOrEqual(900);
    expect(result).toBeCloseTo(903, 0);
  });
});

// ---------------------------------------------------------------------------
// verifyEgressClearWidth
// ---------------------------------------------------------------------------
describe("verifyEgressClearWidth — NBC 2016 Part 4 Table 2", () => {
  describe("private residential spine (0.9 m minimum)", () => {
    it("PASS: 1.05 m spine", () => {
      const r = verifyEgressClearWidth(1.05);
      expect(r.pass).toBe(true);
      expect(r.limit).toBe(NBC.MIN_INTERNAL_PASSAGE_WIDTH_M);
    });

    it("PASS: exactly 0.9 m (boundary)", () => {
      expect(verifyEgressClearWidth(0.9).pass).toBe(true);
    });

    it("FAIL: 0.85 m spine", () => {
      expect(verifyEgressClearWidth(0.85).pass).toBe(false);
    });
  });

  describe("common corridor (1.2 m minimum)", () => {
    it("PASS: 1.5 m common corridor", () => {
      expect(verifyEgressClearWidth(1.5, true).pass).toBe(true);
    });

    it("FAIL: 0.9 m common corridor (passes private but fails public standard)", () => {
      expect(verifyEgressClearWidth(0.9, true).pass).toBe(false);
    });

    it("PASS: exactly 1.2 m (boundary)", () => {
      expect(verifyEgressClearWidth(1.2, true).pass).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// verifyTravelDistance
// ---------------------------------------------------------------------------
describe("verifyTravelDistance — NBC 2016 Part 4 Cl. 4.5.1", () => {
  describe("unsprinklered (30 m max)", () => {
    it("PASS: 18.4 m (the AtelierOS demo case)", () => {
      expect(verifyTravelDistance(18.4, false).pass).toBe(true);
    });

    it("PASS: exactly 30 m (boundary)", () => {
      expect(verifyTravelDistance(30, false).pass).toBe(true);
    });

    it("FAIL: 30.1 m", () => {
      expect(verifyTravelDistance(30.1, false).pass).toBe(false);
    });
  });

  describe("sprinklered (45 m max)", () => {
    it("PASS: 44 m in sprinklered building", () => {
      expect(verifyTravelDistance(44, true).pass).toBe(true);
    });

    it("FAIL: 45.1 m even with sprinklers", () => {
      expect(verifyTravelDistance(45.1, true).pass).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// verifyDeadEnd
// ---------------------------------------------------------------------------
describe("verifyDeadEnd — NBC 2016 Part 4 Cl. 4.6 (6.0 m max)", () => {
  it("PASS: 0 m (no dead end)", () => {
    expect(verifyDeadEnd(0).pass).toBe(true);
  });

  it("PASS: exactly 6.0 m (boundary)", () => {
    expect(verifyDeadEnd(6.0).pass).toBe(true);
  });

  it("FAIL: 6.1 m dead end", () => {
    expect(verifyDeadEnd(6.1).pass).toBe(false);
  });

  it("FAIL: 12 m dead end", () => {
    expect(verifyDeadEnd(12).pass).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateEgressProof — integration test
// ---------------------------------------------------------------------------
describe("generateEgressProof — full compliance proof", () => {
  const STANDARD_INPUTS = {
    carpetAreaSqM: 111,
    corridorClearWidthM: 1.05,
    travelDistanceM: 18.4,
    deadEndM: 0,
    sprinklered: false,
  };

  it("passes for the standard AtelierOS demo apartment", () => {
    const proof = generateEgressProof(STANDARD_INPUTS);
    expect(proof.allPass).toBe(true);
    expect(proof.occupantLoad).toBe(12);
    expect(proof.corridorCheck.pass).toBe(true);
    expect(proof.travelDistanceCheck.pass).toBe(true);
    expect(proof.deadEndCheck?.pass).toBe(true);
  });

  it("proofText contains occupant load arithmetic", () => {
    const proof = generateEgressProof(STANDARD_INPUTS);
    expect(proof.proofText).toContain("111.0 m² ÷ 9.3 m²/person = 12 persons");
  });

  it("proofText contains travel distance check", () => {
    const proof = generateEgressProof(STANDARD_INPUTS);
    expect(proof.proofText).toContain("18.4 m");
    expect(proof.proofText).toContain("PASS");
  });

  it("fails when corridor is too narrow", () => {
    const proof = generateEgressProof({ ...STANDARD_INPUTS, corridorClearWidthM: 0.8 });
    expect(proof.allPass).toBe(false);
    expect(proof.corridorCheck.pass).toBe(false);
  });

  it("fails when travel distance exceeds limit", () => {
    const proof = generateEgressProof({ ...STANDARD_INPUTS, travelDistanceM: 35 });
    expect(proof.allPass).toBe(false);
    expect(proof.travelDistanceCheck.pass).toBe(false);
  });

  it("omits dead-end check when deadEndM not supplied", () => {
    const { deadEndM: _, ...inputsWithoutDeadEnd } = STANDARD_INPUTS;
    const proof = generateEgressProof(inputsWithoutDeadEnd);
    expect(proof.deadEndCheck).toBeUndefined();
    // allPass should still work based on remaining checks
    expect(typeof proof.allPass).toBe("boolean");
  });
});
