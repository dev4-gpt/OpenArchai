/**
 * PE/BOQ deterministic calculators for AtelierOS.
 *
 * Provides exact arithmetic for:
 *   - Net-to-Gross (NTG) efficiency ratio
 *   - Capex cut targets (% reduction)
 *   - Value-engineering BOQ proof
 *
 * These outputs are injected into agent prompts so LLMs cite exact
 * numbers rather than approximating them.
 */

// ---------------------------------------------------------------------------
// NTG — Net-to-Gross Efficiency
// ---------------------------------------------------------------------------

export interface NTGInputs {
  grossAreaSqFt: number;
  circulationSqFt?: number;   // known circulation waste; if omitted, derived from current NTG
  currentNtgPct?: number;     // current NTG e.g. 76 (percent)
  targetNtgPct: number;       // target NTG e.g. 84 (percent)
}

export interface NTGProof {
  grossAreaSqFt: number;
  currentUsableSqFt: number;
  targetUsableSqFt: number;
  reclaimNeededSqFt: number;
  currentCirculationSqFt: number;
  targetCirculationSqFt: number;
  circulationCutSqFt: number;
  proofText: string;
}

/**
 * Computes the NTG reclaim arithmetic and returns a verbatim proof block.
 */
export function generateNTGProof(inputs: NTGInputs): NTGProof {
  const { grossAreaSqFt, targetNtgPct, currentNtgPct = 76 } = inputs;
  const currentUsableSqFt = grossAreaSqFt * (currentNtgPct / 100);
  const targetUsableSqFt = grossAreaSqFt * (targetNtgPct / 100);
  const reclaimNeededSqFt = targetUsableSqFt - currentUsableSqFt;
  const currentCirculationSqFt = grossAreaSqFt - currentUsableSqFt;
  const targetCirculationSqFt = grossAreaSqFt - targetUsableSqFt;
  const circulationCutSqFt = currentCirculationSqFt - targetCirculationSqFt;

  const proofText = `NTG Efficiency Arithmetic
==========================
Gross Floor Area:       ${grossAreaSqFt.toLocaleString()} sq ft
Current NTG (${currentNtgPct}%):   ${grossAreaSqFt} × ${(currentNtgPct / 100).toFixed(2)} = ${Math.round(currentUsableSqFt).toLocaleString()} sq ft usable  (Circulation: ${Math.round(currentCirculationSqFt)} sq ft)
Target  NTG (${targetNtgPct}%):   ${grossAreaSqFt} × ${(targetNtgPct / 100).toFixed(2)} = ${Math.round(targetUsableSqFt).toLocaleString()} sq ft usable  (Circulation: ${Math.round(targetCirculationSqFt)} sq ft)
Usable Reclaim Needed:  +${Math.round(reclaimNeededSqFt)} sq ft
Circulation to Cut:     ${Math.round(currentCirculationSqFt)} sq ft → ${Math.round(targetCirculationSqFt)} sq ft  (eliminate ${Math.round(circulationCutSqFt)} sq ft dedicated corridor)`;

  return {
    grossAreaSqFt,
    currentUsableSqFt,
    targetUsableSqFt,
    reclaimNeededSqFt,
    currentCirculationSqFt,
    targetCirculationSqFt,
    circulationCutSqFt,
    proofText,
  };
}

// ---------------------------------------------------------------------------
// Capex Cut — % reduction proof
// ---------------------------------------------------------------------------

export interface CapexProofInputs {
  baselineCapex: number;        // e.g. 2850000 (₹)
  cutPercent: number;           // e.g. 20
  currency?: string;            // e.g. "₹"
  grossAreaSqFt?: number;       // for cost/sqft readout
}

export interface CapexProof {
  baselineCapex: number;
  cutAmount: number;
  targetCapex: number;
  costPerSqFtBaseline?: number;
  costPerSqFtTarget?: number;
  proofText: string;
}

/**
 * Computes the capex reduction arithmetic and returns a verbatim proof block.
 */
export function generateCapexProof(inputs: CapexProofInputs): CapexProof {
  const { baselineCapex, cutPercent, currency = "₹", grossAreaSqFt } = inputs;
  const cutAmount = Math.round(baselineCapex * (cutPercent / 100));
  const targetCapex = baselineCapex - cutAmount;
  const costPerSqFtBaseline = grossAreaSqFt
    ? Math.round(baselineCapex / grossAreaSqFt)
    : undefined;
  const costPerSqFtTarget = grossAreaSqFt
    ? Math.round(targetCapex / grossAreaSqFt)
    : undefined;

  const lakhify = (n: number) =>
    `${currency}${(n / 100000).toFixed(1)}L`;

  const sqftLine =
    grossAreaSqFt && costPerSqFtBaseline && costPerSqFtTarget
      ? `\nCost per sq ft:         ${currency}${costPerSqFtBaseline}/sqft → ${currency}${costPerSqFtTarget}/sqft`
      : "";

  const proofText = `Capex Reduction Arithmetic
===========================
Baseline Capex:         ${lakhify(baselineCapex)} (${currency}${baselineCapex.toLocaleString()})
Cut Required (${cutPercent}%):    ${lakhify(baselineCapex)} × ${cutPercent / 100} = ${lakhify(cutAmount)}
Target Capex:           ${lakhify(baselineCapex)} − ${lakhify(cutAmount)} = ${lakhify(targetCapex)}${sqftLine}`;

  return { baselineCapex, cutAmount, targetCapex, costPerSqFtBaseline, costPerSqFtTarget, proofText };
}
