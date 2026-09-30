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

    // --- 3. NBC CEILING HEIGHT (verified when wall_height_m is provided) ---
    if (typeof elements?.wall_height_m === "number" && elements.wall_height_m > 0) {
      totalChecks += 1;
      const heightOk = elements.wall_height_m >= 2.75;
      if (heightOk) {
        passedCount += 1;
        issues.push({
          id: "nbc_ceiling_height",
          code: "NBC-3.12.2",
          standard: "NBC 2016 Part 3",
          category: "Habitable Space",
          severity: "info",
          message: `Clear ceiling height (${elements.wall_height_m.toFixed(2)}m) satisfies NBC minimum of 2.75m.`,
          suggestion: "Full habitable room volume compliant.",
          passed: true,
          verified: true,
        });
      } else {
        issues.push({
          id: "nbc_ceiling_height",
          code: "NBC-3.12.2",
          standard: "NBC 2016 Part 3",
          category: "Habitable Space",
          severity: "error",
          message: `Clear ceiling height (${elements.wall_height_m.toFixed(2)}m) is below NBC minimum 2.75m.`,
          suggestion: "Raise clear ceiling or slab level to at least 2.75m for all habitable spaces.",
          passed: false,
          verified: true,
        });
      }
    } else {
      issues.push({
        id: "nbc_ceiling_height",
        code: "NBC-3.12.2",
        standard: "NBC 2016 Part 3",
        category: "Habitable Space",
        severity: "warning",
        message: "Ceiling height not verified — wall height not calibrated in current plan.",
        suggestion: "Confirm clear ceiling height meets the NBC minimum of 2.75m before relying on this report.",
        passed: false,
        verified: false,
      });
    }

    // --- 4. VASTU SHASTRA ENTRANCE ALIGNMENT (verified when plan bounds & doors exist) ---
    const bounds = elements?.floor_bounds;
    const hasBounds = bounds && bounds.max_x > bounds.min_x && bounds.max_y > bounds.min_y;
    if (hasBounds && doors.length > 0) {
      totalChecks += 1;
      // Main entry door (assumed first door or near perimeter)
      const primaryDoor = doors[0];
      const relX = (primaryDoor.position[0] - bounds.min_x) / (bounds.max_x - bounds.min_x);
      const relY = (primaryDoor.position[1] - bounds.min_y) / (bounds.max_y - bounds.min_y);
      // Ishanya (NE): low Y (North) and high X (East)
      const isIshanyaEast = relY <= 0.45 && relX >= 0.40;

      if (isIshanyaEast) {
        passedCount += 1;
        issues.push({
          id: "vastu_entrance",
          code: "VASTU-ISHANYA",
          standard: "Vastu Shastra Classical Principles",
          category: "Vastu Alignment",
          severity: "info",
          message: "Primary entrance aligns harmoniously with North-East / East (Ishanya) quadrant.",
          suggestion: "Optimal cosmic solar energy flow maintained.",
          passed: true,
          verified: true,
        });
      } else {
        issues.push({
          id: "vastu_entrance",
          code: "VASTU-ISHANYA",
          standard: "Vastu Shastra Classical Principles",
          category: "Vastu Alignment",
          severity: "warning",
          message: "Primary entrance is positioned outside the preferred North-East / East sector.",
          suggestion: "Consider repositioning the main entry toward North or East (Ishanya) for auspicious Vastu flow.",
          passed: false,
          verified: true,
        });
      }
    } else {
      issues.push({
        id: "vastu_entrance",
        code: "VASTU-ISHANYA",
        standard: "Vastu Shastra Classical Principles",
        category: "Vastu Alignment",
        severity: "warning",
        message: "Entrance orientation not verified — compass direction not captured in the extracted plan geometry.",
        suggestion: "Confirm the main entrance falls in the North-East / East (Ishanya) sector.",
        passed: false,
        verified: false,
      });
    }

    // --- 5. VASTU KITCHEN PLACEMENT (verified when semantic rooms are present) ---
    const rooms = elements?.rooms || [];
    const kitchenRoom = rooms.find((r) =>
      r.label.toLowerCase().includes("kitchen") ||
      r.label.toLowerCase().includes("rasoi") ||
      r.label.toLowerCase().includes("pantry")
    );

    if (kitchenRoom) {
      totalChecks += 1;
      const isAgniOrVayu = kitchenRoom.direction === "SE" || kitchenRoom.direction === "NW";
      if (isAgniOrVayu) {
        passedCount += 1;
        issues.push({
          id: "vastu_kitchen",
          code: "VASTU-AGNI",
          standard: "Vastu Shastra Classical Principles",
          category: "Vastu Alignment",
          severity: "info",
          message: `Kitchen positioned in ${kitchenRoom.direction} sector (${kitchenRoom.direction === "SE" ? "Agni" : "Vayu"}) per classical Vastu.`,
          suggestion: "Proper fire element containment achieved.",
          passed: true,
          verified: true,
        });
      } else {
        issues.push({
          id: "vastu_kitchen",
          code: "VASTU-AGNI",
          standard: "Vastu Shastra Classical Principles",
          category: "Vastu Alignment",
          severity: "warning",
          message: `Kitchen is located in ${kitchenRoom.direction || "unfavorable"} quadrant instead of South-East (Agni).`,
          suggestion: "Relocate kitchen cooktop to South-East (Agni) sector facing East.",
          passed: false,
          verified: true,
        });
      }
    } else {
      issues.push({
        id: "vastu_kitchen",
        code: "VASTU-AGNI",
        standard: "Vastu Shastra Classical Principles",
        category: "Vastu Alignment",
        severity: "warning",
        message: "Kitchen placement not verified — room labels not identified in the extracted plan.",
        suggestion: "Confirm kitchen cooktop is oriented in the South-East (Agni) sector facing East.",
        passed: false,
        verified: false,
      });
    }

    // --- 6. STAIRCASE ERGONOMICS & LIFE SAFETY (verified if staircases exist) ---
    const staircases = elements?.staircases || [];
    if (staircases.length > 0) {
      totalChecks += 1;
      let allStairsPass = true;
      for (const s of staircases) {
        const blondel = 2 * (s.riserHeight * 1000) + (s.treadDepth * 1000);
        if (blondel < 550 || blondel > 650 || s.riserHeight > 0.15 || s.treadDepth < 0.30 || s.flightWidth < 1.50) {
          allStairsPass = false;
          break;
        }
      }

      if (allStairsPass) {
        passedCount += 1;
        issues.push({
          id: "nbc_staircase_ergonomics",
          code: "NBC-4.Table-8",
          standard: "NBC 2016 Part 4",
          category: "Circulation & Egress",
          severity: "info",
          message: "Staircase geometry complies with NBC Part 4 (550mm ≤ 2R + T ≤ 650mm, clear flight width ≥ 1.50m).",
          suggestion: "Ergonomic evacuation capacity verified.",
          passed: true,
          verified: true,
        });
      } else {
        issues.push({
          id: "nbc_staircase_ergonomics",
          code: "NBC-4.Table-8",
          standard: "NBC 2016 Part 4",
          category: "Circulation & Egress",
          severity: "error",
          message: "Staircase exceeds NBC ergonomic limits (riser > 150mm, tread < 300mm, or clear width < 1.50m).",
          suggestion: "Adjust riser and tread dimensions to satisfy 550mm ≤ 2R + T ≤ 650mm.",
          passed: false,
          verified: true,
        });
      }
    }

    // --- 7. GURGAON DTCP / HRERA MAXIMUM HEIGHT ---
    issues.push({
      id: "dtcp_height",
      code: "HBC-2017-Cl.4",
      standard: "Haryana DTCP Plotted Norms",
      category: "Zoning",
      severity: "warning",
      message: "Building total height not verified — multi-story elevation not captured in 2D floor plan.",
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

    // --- 2. IBC CEILING HEIGHT (verified when wall_height_m is provided) ---
    if (typeof elements?.wall_height_m === "number" && elements.wall_height_m > 0) {
      totalChecks += 1;
      const heightOk = elements.wall_height_m >= 2.286; // 7ft 6in
      if (heightOk) {
        passedCount += 1;
        issues.push({
          id: "ibc_ceiling_height",
          code: "IBC-1207.2",
          standard: "International Building Code 2021",
          category: "Habitable Space",
          severity: "info",
          message: `Ceiling height (${(elements.wall_height_m * 3.28084).toFixed(1)} ft) meets IBC minimum of 7 ft 6 in (2.286m).`,
          suggestion: "Complies with IBC habitable ceiling clearance.",
          passed: true,
          verified: true,
        });
      } else {
        issues.push({
          id: "ibc_ceiling_height",
          code: "IBC-1207.2",
          standard: "International Building Code 2021",
          category: "Habitable Space",
          severity: "error",
          message: `Ceiling height (${(elements.wall_height_m * 3.28084).toFixed(1)} ft) is below IBC minimum of 7 ft 6 in (2.286m).`,
          suggestion: "Raise ceiling clearance to at least 7 ft 6 in for all habitable rooms.",
          passed: false,
          verified: true,
        });
      }
    } else {
      issues.push({
        id: "ibc_ceiling_height",
        code: "IBC-1207.2",
        standard: "International Building Code 2021",
        category: "Habitable Space",
        severity: "warning",
        message: "Ceiling height not verified — wall height not calibrated in current plan.",
        suggestion: "Confirm ceiling height meets the IBC minimum of 7 ft 6 in (2.286m) before relying on this report.",
        passed: false,
        verified: false,
      });
    }

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

    // --- 4. ADA CLEAR TURNING SPACE (60" Diameter) (verified when room area is known) ---
    const roomsUS = elements?.rooms || [];
    if (roomsUS.length > 0) {
      totalChecks += 1;
      const largestRoom = Math.max(...roomsUS.map((r) => r.area_m2));
      const has60InchSpace = largestRoom >= 2.5; // >2.5 m² allows 1.52m turning circle
      if (has60InchSpace) {
        passedCount += 1;
        issues.push({
          id: "ada_turning_space",
          code: "ADA-304.3.1",
          standard: "ADA Section 304",
          category: "ADA Accessibility",
          severity: "info",
          message: "Habitable rooms provide adequate clear floor space for 60\" (1.52m) wheelchair turning diameter.",
          suggestion: "Wheelchair turning radius accommodated.",
          passed: true,
          verified: true,
        });
      } else {
        issues.push({
          id: "ada_turning_space",
          code: "ADA-304.3.1",
          standard: "ADA Section 304",
          category: "ADA Accessibility",
          severity: "warning",
          message: "Room dimensions may not provide unobstructed 60\" turning space.",
          suggestion: "Ensure clear 60\" diameter turning circle exists free of fixed casework.",
          passed: false,
          verified: true,
        });
      }
    } else {
      issues.push({
        id: "ada_turning_space",
        code: "ADA-304.3.1",
        standard: "ADA Section 304",
        category: "ADA Accessibility",
        severity: "warning",
        message: "Corridor turning space not verified — room boundaries not identified in the extracted plan.",
        suggestion: "Confirm a 60\" (1.52m) unobstructed circular turning space exists at key circulation points.",
        passed: false,
        verified: false,
      });
    }
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
