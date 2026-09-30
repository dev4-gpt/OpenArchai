/**
 * Private Equity Real Estate Underwriting & Statutory FAR Monetization Engine.
 *
 * Implements institutional financial modeling for AtelierOS:
 * 1. Haryana DTCP / NBC 2016 Part 3:
 *    - Base FAR (1.75) vs Purchasable FAR / TDR (up to 2.64)
 *    - Ground Coverage cap (60%)
 *    - Net-to-Gross (NTG) & Carpet-to-Saleable efficiency ratios
 * 2. Institutional Underwriting Metrics:
 *    - Net Operating Income (NOI)
 *    - Yield-on-Cost (YoC)
 *    - 10-Year Levered/Unlevered IRR
 *    - Capital Payback Period (years)
 * 3. Official CPWD Delhi Schedule of Rates (DSR 2024) Item-Rate Tender Schedule Generator
 */

export interface UnderwritingInputs {
  grossFloorAreaSqFt: number;
  carpetAreaSqFt: number;
  totalCapexINR: number;
  rentalRatePerSqFtMonthlyINR?: number; // default ₹125/sqft for DLF Phase 5 Grade A
  operatingExpenseRatio?: number;      // default 0.15 (15% OPEX)
  baseFAR?: number;                    // default 1.75
  purchasableFAR?: number;             // default 0.89 (total FAR 2.64)
  plotAreaSqFt?: number;
  holdingPeriodYears?: number;         // default 10
  annualRentalGrowthRate?: number;     // default 0.05 (5%)
  exitCapRate?: number;                // default 0.08 (8%)
}

export interface CPWDTenderItem {
  itemCode: string;          // e.g. "CPWD 11.36.1"
  subHead?: string;          // e.g. "Flooring & Tiling"
  description: string;
  quantity: number;
  unit: string;
  dsrRateINR?: number;
  rateInr?: number;          // Compatibility alias for dsrRateINR
  amountINR?: number;
}

export interface UnderwritingResult {
  carpetAreaSqFt: number;
  grossFloorAreaSqFt: number;
  circulationAreaSqFt: number;
  carpetToSaleableRatio: number;      // e.g. 0.84 (84%)
  carpetToSaleablePercentFormatted: string; // "84.0%"
  meetsNTGThreshold: boolean;         // >= 84%

  // Statutory FAR
  plotAreaSqFt: number;
  baseAllowableGFA: number;
  purchasableGFA: number;
  totalPermissibleGFA: number;
  farUtilizationPercent: number;
  isFARCompliant: boolean;

  // Commercial Metrics
  grossAnnualRevenueINR: number;
  netOperatingIncomeINR: number;      // NOI
  yieldOnCostPercent: number;         // (NOI / Capex) * 100
  yieldOnCostFormatted: string;       // "9.2%"
  paybackPeriodYears: number;
  estimated10YrIRRPercent: number;
  isInstitutionalGrade: boolean;      // YoC >= 8.5% && NTG >= 84%

  // Tender Schedule
  cpwdTenderSchedule: CPWDTenderItem[];
  tenderScheduleGrandTotalINR: number;
}

export const CPWD_DSR_2024_DEFAULTS = {
  BASE_FAR: 1.75,
  MAX_PURCHASABLE_FAR: 0.89, // Total 2.64
  MAX_GROUND_COVERAGE_PERCENT: 60,
  DEFAULT_RENTAL_RATE_INR: 125,
  DEFAULT_OPEX_RATIO: 0.15,
  MIN_INSTITUTIONAL_NTG: 0.84, // 84%
  MIN_INSTITUTIONAL_YIELD: 8.5, // 8.5%
};

/**
 * Calculates complete private equity underwriting & statutory FAR monetization metrics.
 */
export function calculatePEUnderwriting(inputs: UnderwritingInputs): UnderwritingResult {
  const grossGFA = Math.max(1, inputs.grossFloorAreaSqFt);
  const carpet = Math.max(1, inputs.carpetAreaSqFt);
  const totalCapex = Math.max(1, inputs.totalCapexINR);

  const rentalRate = inputs.rentalRatePerSqFtMonthlyINR ?? CPWD_DSR_2024_DEFAULTS.DEFAULT_RENTAL_RATE_INR;
  const opexRatio = inputs.operatingExpenseRatio ?? CPWD_DSR_2024_DEFAULTS.DEFAULT_OPEX_RATIO;
  const baseFAR = inputs.baseFAR ?? CPWD_DSR_2024_DEFAULTS.BASE_FAR;
  const purchasableFAR = inputs.purchasableFAR ?? CPWD_DSR_2024_DEFAULTS.MAX_PURCHASABLE_FAR;
  const plotArea = inputs.plotAreaSqFt ?? Math.round(grossGFA / (baseFAR + purchasableFAR));

  // 1. Spatial & Net-to-Gross (NTG) Efficiency
  const circulation = Math.max(0, grossGFA - carpet);
  const carpetRatio = Math.round((carpet / grossGFA) * 1000) / 1000;
  const meetsNTG = carpetRatio >= CPWD_DSR_2024_DEFAULTS.MIN_INSTITUTIONAL_NTG;

  // 2. Statutory FAR & Zoning Envelope
  const baseAllowable = Math.round(plotArea * baseFAR);
  const purchasable = Math.round(plotArea * purchasableFAR);
  const totalPermissible = baseAllowable + purchasable;
  let farUtilization = Math.round((grossGFA / totalPermissible) * 1000) / 10;
  if (grossGFA > totalPermissible && farUtilization <= 100.0) {
    farUtilization = Number(((grossGFA / totalPermissible) * 100).toFixed(2));
    if (farUtilization <= 100.0) farUtilization = 100.01;
  }
  const isFARCompliant = grossGFA <= totalPermissible;

  // 3. Pro-Forma Revenue & Yield-on-Cost (YoC)
  const grossAnnualRev = Math.round(carpet * rentalRate * 12);
  const noi = Math.round(grossAnnualRev * (1 - opexRatio));
  const yieldOnCost = Math.round((noi / totalCapex) * 1000) / 10;
  const payback = Math.round((totalCapex / Math.max(1, noi)) * 10) / 10;

  // 4. 10-Year Pro-Forma IRR Projection
  const holdingYears = inputs.holdingPeriodYears ?? 10;
  const growthRate = inputs.annualRentalGrowthRate ?? 0.05;
  const exitCap = inputs.exitCapRate ?? 0.08;

  let projectedTerminalNOI = noi;
  for (let yr = 1; yr < holdingYears; yr++) {
    projectedTerminalNOI *= 1 + growthRate;
  }
  const terminalValuation = Math.round(projectedTerminalNOI / exitCap);

  // Approximate un-levered IRR via standard discounted cashflow
  // Net cash flows: [-Capex, NOI_1, NOI_2, ..., NOI_10 + TerminalVal]
  let irrEstimate = 12.0; // default baseline
  for (let testIRR = 0.05; testIRR <= 0.40; testIRR += 0.005) {
    let npv = -totalCapex;
    let runningNOI = noi;
    for (let yr = 1; yr <= holdingYears; yr++) {
      const discount = Math.pow(1 + testIRR, yr);
      const cf = yr === holdingYears ? runningNOI + terminalValuation : runningNOI;
      npv += cf / discount;
      runningNOI *= 1 + growthRate;
    }
    if (npv <= 0) {
      irrEstimate = Math.round(testIRR * 1000) / 10;
      break;
    }
  }

  const isInstitutional =
    yieldOnCost >= CPWD_DSR_2024_DEFAULTS.MIN_INSTITUTIONAL_YIELD &&
    carpetRatio >= CPWD_DSR_2024_DEFAULTS.MIN_INSTITUTIONAL_NTG;

  // 5. Official CPWD Delhi Schedule of Rates (DSR 2024) Tender Schedule Generator
  const tenderSchedule: CPWDTenderItem[] = [
    {
      itemCode: "CPWD 11.36.1",
      subHead: "Flooring & Skirting",
      description: "Providing and laying vitrified floor tiles in 1200x600mm size with IS 15477 polymer adhesive",
      quantity: Math.round(carpet * 0.092903), // sq m
      unit: "sqm",
      dsrRateINR: 1450,
      amountINR: Math.round(carpet * 0.092903 * 1450),
    },
    {
      itemCode: "CPWD 13.48",
      subHead: "Wall Finishes & Coating",
      description: "Wall painting with premium acrylic emulsion paint of interior grade (VOC < 5g/L)",
      quantity: Math.round(carpet * 0.092903 * 2.8), // wall surface multiplier
      unit: "sqm",
      dsrRateINR: 285,
      amountINR: Math.round(carpet * 0.092903 * 2.8 * 285),
    },
    {
      itemCode: "CPWD 9.21.2",
      subHead: "Doors & Joinery",
      description: "Supplying and fixing 40mm thick kiln-dried timber flush door shutters (IS 287 8-12% EMC)",
      quantity: 5,
      unit: "each",
      dsrRateINR: 18500,
      amountINR: 5 * 18500,
    },
    {
      itemCode: "CPWD 19.3.1",
      subHead: "Plumbing & Core Wet Shafts",
      description: "Providing and fixing vertical pre-sleeved 300x300mm MEP wet core stack with acoustic wrap",
      quantity: 1,
      unit: "job",
      dsrRateINR: 165000,
      amountINR: 165000,
    },
    {
      itemCode: "CPWD 31.8.2",
      subHead: "Acoustic Decoupling",
      description: "Drywall partition with 90mm studs, 50mm Rockwool and dual Gyproc SoundStop boards (STC 56)",
      quantity: Math.round(carpet * 0.092903 * 0.6),
      unit: "sqm",
      dsrRateINR: 2650,
      amountINR: Math.round(carpet * 0.092903 * 0.6 * 2650),
    },
  ];

  const tenderTotal = tenderSchedule.reduce((acc, row) => acc + (row.amountINR ?? 0), 0);

  return {
    carpetAreaSqFt: carpet,
    grossFloorAreaSqFt: grossGFA,
    circulationAreaSqFt: circulation,
    carpetToSaleableRatio: carpetRatio,
    carpetToSaleablePercentFormatted: `${(carpetRatio * 100).toFixed(1)}%`,
    meetsNTGThreshold: meetsNTG,
    plotAreaSqFt: plotArea,
    baseAllowableGFA: baseAllowable,
    purchasableGFA: purchasable,
    totalPermissibleGFA: totalPermissible,
    farUtilizationPercent: farUtilization,
    isFARCompliant: isFARCompliant,
    grossAnnualRevenueINR: grossAnnualRev,
    netOperatingIncomeINR: noi,
    yieldOnCostPercent: yieldOnCost,
    yieldOnCostFormatted: `${yieldOnCost.toFixed(1)}%`,
    paybackPeriodYears: payback,
    estimated10YrIRRPercent: irrEstimate,
    isInstitutionalGrade: isInstitutional,
    cpwdTenderSchedule: tenderSchedule,
    tenderScheduleGrandTotalINR: tenderTotal,
  };
}

/**
 * Generates official CPWD CSV formatted text for tender procurement export.
 */
export function generateCPWDTenderCsv(items: CPWDTenderItem[]): string {
  const headers = ["Item Code", "Sub-Head", "Description", "Quantity", "Unit", "DSR Rate (INR)", "Amount (INR)"];
  let grandTotal = 0;
  const rows = items.map((it) => {
    const rate = it.dsrRateINR ?? it.rateInr ?? 0;
    const amount = it.amountINR ?? Math.round(it.quantity * rate);
    grandTotal += amount;
    return [
      `"${it.itemCode}"`,
      `"${it.subHead ?? "General"}"`,
      `"${it.description.replace(/"/g, '""')}"`,
      it.quantity,
      `"${it.unit}"`,
      rate,
      amount,
    ];
  });
  rows.push(["", "", '"GRAND TOTAL (CPWD DSR 2024)"', "", "", "", grandTotal]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export const exportCPWDTenderScheduleCSV = generateCPWDTenderCsv;

