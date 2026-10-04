import { ATELIER_STUDIO_TOOLS, executeStudioTool } from "../agents-orchestrator";

describe("Universal Studio Tools Engine & Deterministic Function Calling", () => {
  it("ATELIER_STUDIO_TOOLS exposes all 8 architectural calculation tools", () => {
    expect(ATELIER_STUDIO_TOOLS.length).toBe(8);

    const toolNames = ATELIER_STUDIO_TOOLS.map((t) => t.function.name);
    expect(toolNames).toContain("audit_nbc_egress");
    expect(toolNames).toContain("calculate_ntg_efficiency");
    expect(toolNames).toContain("calculate_ve_swaps");
    expect(toolNames).toContain("verify_structural_bay");
    expect(toolNames).toContain("calculate_acoustic_rt60");
    expect(toolNames).toContain("calculate_staircase_capacity");
    expect(toolNames).toContain("calculate_daylight_factor");
    expect(toolNames).toContain("evaluate_vastu_mandala");

    for (const tool of ATELIER_STUDIO_TOOLS) {
      expect(tool.type).toBe("function");
      expect(tool.function.description.length).toBeGreaterThan(20);
      expect(tool.function.parameters.type).toBe("object");
      expect(tool.function.parameters.required.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("executeStudioTool('audit_nbc_egress') executes NBC 2016 travel distance and corridor checks", () => {
    const { result, proofText } = executeStudioTool("audit_nbc_egress", {
      carpetAreaSqM: 111,
      travelDistanceM: 18.4,
      corridorClearWidthM: 1.05,
    });

    expect(result.allPass).toBe(true);
    expect(result.occupantLoad).toBe(12);
    expect(proofText).toContain("NBC 2016 Part 4");
    expect(proofText).toContain("18.4 m");
    expect(proofText).toContain("COMPLIANT");
  });

  it("executeStudioTool('calculate_ntg_efficiency') computes exact Net-to-Gross spatial reclaim", () => {
    const { result, proofText } = executeStudioTool("calculate_ntg_efficiency", {
      grossAreaSqFt: 1200,
      currentNtgPct: 76,
      targetNtgPct: 84,
    });

    expect(result.grossAreaSqFt).toBe(1200);
    expect(result.currentUsableSqFt).toBe(912);
    expect(result.targetUsableSqFt).toBe(1008);
    expect(result.reclaimNeededSqFt).toBe(96);
    expect(proofText).toContain("NTG Efficiency Arithmetic");
    expect(proofText).toContain("1,200 sq ft");
  });

  it("executeStudioTool('calculate_ve_swaps') computes Capex reduction arithmetic", () => {
    const { result, proofText } = executeStudioTool("calculate_ve_swaps", {
      baselineCapex: 2850000,
      cutPercent: 20,
      currency: "₹",
      grossAreaSqFt: 1200,
    });

    expect(result.baselineCapex).toBe(2850000);
    expect(result.cutAmount).toBe(570000);
    expect(result.targetCapex).toBe(2280000);
    expect(result.costPerSqFtBaseline).toBe(2375);
    expect(result.costPerSqFtTarget).toBe(1900);
    expect(proofText).toContain("Capex Reduction Arithmetic");
    expect(proofText).toContain("₹28.5L");
  });

  it("executeStudioTool('verify_structural_bay') evaluates IS 456 L/d span and NBC ceiling plenum clearances", () => {
    const { result, proofText } = executeStudioTool("verify_structural_bay", {
      spanM: 6.0,
      effectiveDepthM: 0.45,
      floorToFloorHeightM: 3.35,
      plenumVoidM: 0.45,
    });

    expect(result.spanCheck.isCompliant).toBe(true);
    expect(result.spanCheck.spanToDepthRatio).toBe(13.3);
    expect(result.plenumCheck.isClashFree).toBe(true);
    expect(result.plenumCheck.habitableRoomHeightM).toBe(2.75);
    expect(proofText).toContain("Structural & MEP Plenum Coordination Check");
    expect(proofText).toContain("2.75m min");
  });

  it("executeStudioTool('calculate_acoustic_rt60') runs Sabine reverberation and STC 56 decoupling", () => {
    const { result, proofText } = executeStudioTool("calculate_acoustic_rt60", {
      lengthM: 5.0,
      widthM: 5.0,
      heightM: 3.0,
      roomType: "master_bedroom",
    });

    expect(result.rt60Result.rt60Seconds).toBe(0.47);
    expect(result.rt60Result.isCompliant).toBe(true);
    expect(result.stcCheck.isSTC56Compliant).toBe(true);
    expect(result.stcCheck.testedSTCRating).toBe(56);
    expect(proofText).toContain("Museum Acoustics & STC 56 Decoupling Simulation");
    expect(proofText).toContain("0.47s");
  });

  it("executeStudioTool('calculate_staircase_capacity') validates Blondel ergonomic metric and flight width", () => {
    const { result, proofText } = executeStudioTool("calculate_staircase_capacity", {
      riserMm: 150,
      treadMm: 300,
      flightWidthM: 1.50,
      totalRiseM: 3.0,
      buildingHeightM: 24.0,
    });

    expect(result.overallPass).toBe(true);
    expect(result.isErgonomicCompliant).toBe(true);
    expect(result.ergonomicMetricMM).toBe(600);
    expect(result.isWidthCompliant).toBe(true);
    expect(proofText).toContain("NBC 2016 Part 4 Table 8");
    expect(proofText).toContain("600 mm");
  });

  it("executeStudioTool('calculate_daylight_factor') evaluates CIE Daylight Factor and orientation", () => {
    const { result, proofText } = executeStudioTool("calculate_daylight_factor", {
      roomFloorAreaM2: 25,
      windowGlazingAreaM2: 4.5,
      windowHeadHeightM: 2.8,
      orientation: "NE",
      roomType: "living",
    });

    expect(result.estimatedDaylightFactorPercent).toBeGreaterThan(1.5);
    expect(result.isDaylightCompliant).toBe(true);
    expect(proofText).toContain("CIE Daylight Factor");
    expect(proofText).toContain("NE Light Flow");
  });

  it("executeStudioTool('evaluate_vastu_mandala') evaluates 9-zone quadrant alignments", () => {
    const { result, proofText } = executeStudioTool("evaluate_vastu_mandala", {
      kitchenQuadrant: "SE",
      masterBedroomQuadrant: "SW",
      livingQuadrant: "NE",
    });

    expect(result.overallScorePercent).toBeGreaterThanOrEqual(80);
    expect(result.brahmasthanClear).toBe(true);
    expect(proofText).toContain("Vastu Shastra 9-Zone Mandala Evaluation");
    expect(proofText).toContain("Agni (SE)");
  });

  it("executeStudioTool with unknown tool handles error gracefully without throwing", () => {
    const { result, proofText } = executeStudioTool("non_existent_tool", {});
    expect(result.error).toContain("Unknown tool");
    expect(proofText).toBe("");
  });
});
