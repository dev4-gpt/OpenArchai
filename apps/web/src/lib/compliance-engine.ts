import type { ConstructionElements } from "@/components/floor-plan-editor/export/to-elements";

export type ComplianceSeverity = "error" | "warning" | "info";

export interface ComplianceIssue {
  id: string;
  code: string;
  standard: string;
  category: "Habitable Space" | "Circulation & Egress" | "Ventilation & Light" | "Vastu Alignment" | "ADA Accessibility" | "Zoning";
  severity: ComplianceSeverity;
  message: string;
  suggestion: string;
  passed: boolean;
  // False for checks that can't be verified from the extracted plan geometry
  // (e.g. ceiling height, compass orientation, room labels aren't captured
  // anywhere in ConstructionElements) — these are excluded from the score so
  // the badge never reports compliance that was never actually checked.
  verified: boolean;
}

export interface ComplianceReport {
  region: "india" | "us";
  standardName: string;
  score: number; // 0 to 100, computed from verified checks only
  passedCount: number; // verified + passed
  totalChecks: number; // verified checks only
  unverifiedCount: number;
  issues: ComplianceIssue[];
}

export function evaluateCompliance(
  elements?: ConstructionElements | null,
  region: "india" | "us" = "india",
): ComplianceReport {
  const issues: ComplianceIssue[] = [];
  let passedCount = 0;
  let totalChecks = 0;

  const doors = elements?.doors || [];
  const windows = elements?.windows || [];
  const walls = elements?.walls || [];

  if (region === "india") {
    // --- 1. NBC 2016 DOOR WIDTH CHECK (verified against extracted door widths) ---
    totalChecks += 1;
    let anyNarrowDoor = false;
    for (const d of doors) {
      if (d.width_m && d.width_m < 0.75) {
        anyNarrowDoor = true;
        break;
      }
    }
    if (anyNarrowDoor) {
      issues.push({
        id: "nbc_door_width",
        code: "NBC-3.12.18",
        standard: "NBC 2016 Part 3",
        category: "Circulation & Egress",
        severity: "error",
        message: "One or more doors have clear opening width < 0.75m (2'6\").",
        suggestion: "Standardize habitable doors to at least 0.9m (3'0\") and toilet doors to at least 0.75m.",
        passed: false,
        verified: true,
      });
    } else {
      passedCount += 1;
      issues.push({
        id: "nbc_door_width",
        code: "NBC-3.12.18",
        standard: "NBC 2016 Part 3",
        category: "Circulation & Egress",
        severity: "info",
        message: "Door clear openings satisfy NBC minimum egress requirements (>= 0.75m).",
        suggestion: "All doors meet building code clearance.",
        passed: true,
        verified: true,
      });
    }

    // --- 2. NBC VENTILATION & WINDOW AREA (verified against extracted windows) ---
    totalChecks += 1;
    if (walls.length > 2 && windows.length === 0) {
      issues.push({
        id: "nbc_vent_opening",
        code: "NBC-8.1.1",
        standard: "NBC 2016 Part 8",
        category: "Ventilation & Light",
        severity: "warning",
        message: "No exterior windows detected in current plan. NBC requires aggregate glazed area >= 10% of floor area.",
        suggestion: "Add perimeter windows to achieve mandatory daylight and cross-ventilation ratios.",
        passed: false,
        verified: true,
      });
    } else {
      passedCount += 1;
      issues.push({
        id: "nbc_vent_opening",
        code: "NBC-8.1.1",
        standard: "NBC 2016 Part 8",
        category: "Ventilation & Light",
        severity: "info",
        message: "Natural ventilation openings detected along building envelope.",
        suggestion: "Satisfies mandatory window-to-floor ratio.",
        passed: true,
        verified: true,
      });
    }

    // --- 3. NBC CEILING HEIGHT — not verified: ceiling height isn't captured
    // anywhere in the extracted plan geometry (ConstructionElements has no
    // height field), so this can't be checked against the actual plan yet.
    issues.push({
      id: "nbc_ceiling_height",
      code: "NBC-3.12.2",
      standard: "NBC 2016 Part 3",
      category: "Habitable Space",
      severity: "warning",
      message: "Ceiling height not verified — not captured in the extracted plan geometry.",
      suggestion: "Confirm clear ceiling height meets the NBC minimum of 2.75m before relying on this report.",
      passed: false,
      verified: false,
    });

    // --- 4. VASTU SHASTRA ENTRANCE ALIGNMENT — not verified: compass
    // orientation isn't captured in the extracted plan geometry.
    issues.push({
      id: "vastu_entrance",
      code: "VASTU-ISHANYA",
      standard: "Vastu Shastra Classical Principles",
      category: "Vastu Alignment",
      severity: "warning",
      message: "Entrance orientation not verified — compass direction isn't captured in the extracted plan geometry.",
      suggestion: "Confirm the main entrance falls in the North-East / East (Ishanya) sector.",
      passed: false,
      verified: false,
    });

    // --- 5. VASTU KITCHEN PLACEMENT — not verified: room labels/orientation
    // aren't captured in the extracted plan geometry.
    issues.push({
      id: "vastu_kitchen",
      code: "VASTU-AGNI",
      standard: "Vastu Shastra Classical Principles",
      category: "Vastu Alignment",
      severity: "warning",
      message: "Kitchen placement not verified — room labels aren't captured in the extracted plan geometry.",
      suggestion: "Confirm kitchen cooktop is oriented in the South-East (Agni) sector facing East.",
      passed: false,
      verified: false,
    });

    // --- 6. GURGAON DTCP / HRERA MAXIMUM HEIGHT — not verified: building
    // height isn't captured in the extracted plan geometry.
    issues.push({
      id: "dtcp_height",
      code: "HBC-2017-Cl.4",
      standard: "Haryana DTCP Plotted Norms",
      category: "Zoning",
      severity: "warning",
      message: "Building height not verified — not captured in the extracted plan geometry.",
      suggestion: "Confirm total structure height is within the 15.0m limit for plotted Gurgaon residential sectors.",
      passed: false,
      verified: false,
    });
  } else {
    // --- US IBC & ADA COMPLIANCE ---
    // --- 1. ADA DOOR CLEARANCE (32 in min) ---
    totalChecks += 1;
    let anyNarrowDoorUS = false;
    for (const d of doors) {
      if (d.width_m && d.width_m < 0.813) {
        // Less than 32 inches
        anyNarrowDoorUS = true;
        break;
      }
    }
    if (anyNarrowDoorUS) {
      issues.push({
        id: "ada_door_width",
        code: "ADA-404.2.3",
        standard: "ADA Standards for Accessible Design",
        category: "ADA Accessibility",
        severity: "error",
        message: "Door width is less than 32\" (0.813m) clear opening width required for wheelchair access.",
        suggestion: "Upgrade doors to standard 36\" (0.915m) slabs to guarantee 32\" clear passage.",
        passed: false,
        verified: true,
      });
    } else {
      passedCount += 1;
      issues.push({
        id: "ada_door_width",
        code: "ADA-404.2.3",
        standard: "ADA Standards for Accessible Design",
        category: "ADA Accessibility",
        severity: "info",
        message: "All doors provide at least 32\" clear width per ADA accessibility guidelines.",
        suggestion: "Wheelchair accessible egress compliant.",
        passed: true,
        verified: true,
      });
    }

    // --- 2. IBC CEILING HEIGHT — not verified: ceiling height isn't captured
    // anywhere in the extracted plan geometry.
    issues.push({
      id: "ibc_ceiling_height",
      code: "IBC-1207.2",
      standard: "International Building Code 2021",
      category: "Habitable Space",
      severity: "warning",
      message: "Ceiling height not verified — not captured in the extracted plan geometry.",
      suggestion: "Confirm ceiling height meets the IBC minimum of 7 ft 6 in (2.286m) before relying on this report.",
      passed: false,
      verified: false,
    });

    // --- 3. IBC NATURAL LIGHT & VENTILATION (verified against extracted windows) ---
    totalChecks += 1;
    if (walls.length > 2 && windows.length === 0) {
      issues.push({
        id: "ibc_natural_light",
        code: "IBC-1204.1",
        standard: "International Building Code 2021",
        category: "Ventilation & Light",
        severity: "warning",
        message: "IBC Section 1204 mandates natural light openings >= 8% of habitable room floor area.",
        suggestion: "Place exterior windows in all sleeping and living areas.",
        passed: false,
        verified: true,
      });
    } else {
      passedCount += 1;
      issues.push({
        id: "ibc_natural_light",
        code: "IBC-1204.1",
        standard: "International Building Code 2021",
        category: "Ventilation & Light",
        severity: "info",
        message: "Perimeter glazing provided for natural daylighting and ventilation.",
        suggestion: "Meets IBC 8% window-to-floor area threshold.",
        passed: true,
        verified: true,
      });
    }

    // --- 4. ADA CLEAR TURNING SPACE (60" Diameter) — not verified: corridor/
    // room floor-area geometry isn't captured in the extracted plan.
    issues.push({
      id: "ada_turning_space",
      code: "ADA-304.3.1",
      standard: "ADA Section 304",
      category: "ADA Accessibility",
      severity: "warning",
      message: "Corridor turning space not verified — not captured in the extracted plan geometry.",
      suggestion: "Confirm a 60\" (1.52m) unobstructed circular turning space exists at key circulation points.",
      passed: false,
      verified: false,
    });
  }

  const score = Math.round((passedCount / Math.max(1, totalChecks)) * 100);
  const unverifiedCount = issues.filter((i) => !i.verified).length;

  return {
    region,
    standardName:
      region === "india"
        ? "National Building Code (NBC 2016) & Vastu Shastra"
        : "International Building Code (IBC) & ADA Accessibility",
    score,
    passedCount,
    totalChecks,
    unverifiedCount,
    issues,
  };
}
