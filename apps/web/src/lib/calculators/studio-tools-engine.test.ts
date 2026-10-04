import { ATELIER_STUDIO_TOOLS, executeStudioTool } from "../agents-orchestrator";

describe("Universal Studio Tools Engine & Deterministic Function Calling", () => {
  it("ATELIER_STUDIO_TOOLS exposes all 9 architectural calculation tools", () => {
    expect(ATELIER_STUDIO_TOOLS.length).toBe(9);

    const toolNames = ATELIER_STUDIO_TOOLS.map((t) => t.function.name);
    expect(toolNames).toContain("audit_nbc_egress");
    expect(toolNames).toContain("calculate_ntg_efficiency");
    expect(toolNames).toContain("calculate_ve_swaps");
    expect(toolNames).toContain("verify_structural_bay");
    expect(toolNames).toContain("calculate_acoustic_rt60");
    expect(toolNames).toContain("calculate_staircase_capacity");
    expect(toolNames).toContain("calculate_daylight_factor");
    expect(toolNames).toContain("evaluate_vastu_mandala");
    expect(toolNames).toContain("generate_cinematic_shotlist");

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

  it("executeStudioTool('generate_cinematic_shotlist') generates 60fps camera waypoints and lens optics", () => {
    const { result, proofText } = executeStudioTool("generate_cinematic_shotlist", {
      roomNames: ["Foyer", "Living Room", "Terrace"],
      focalLengthMm: 28,
      cameraStyle: "steadicam_glide",
      lightingMood: "golden_hour",
    });

    expect(result.focalLengthMm).toBe(28);
    expect(result.waypoints.length).toBe(3);
    expect(result.waypoints[0].eye[1]).toBe(1.65); // 1.65m human eye level
    expect(result.totalDurationSec).toBe(9);
    expect(proofText).toContain("Higgsfield AI 60fps Walkthrough Shot List");
    expect(proofText).toContain("28mm Cine Prime");
  });

  it("executeStudioTool with unknown tool handles error gracefully without throwing", () => {
    const { result, proofText } = executeStudioTool("non_existent_tool", {});
    expect(result.error).toContain("Unknown tool");
    expect(proofText).toBe("");
  });
});

import { convertRevitToConstructionElements, convertRevitCamerasToHiggsfieldWaypoints, type RevitBIMPayload } from "../revit/revit-bridge";

describe("Autodesk Revit BIM Bridge & Higgsfield Conditioning", () => {
  const samplePayload: RevitBIMPayload = {
    version: "1.0",
    revitVersion: "Autodesk Revit 2025",
    projectName: "DLF CyberCity Luxury Suite",
    units: "metric",
    levels: [{ name: "Level 1", elevationM: 0.0 }],
    rooms: [
      {
        id: "revit_1",
        name: "Entrance Foyer",
        number: "101",
        areaSqM: 14.5,
        perimeterM: 15.0,
        unboundedHeightM: 3.0,
        level: "Level 1",
        boundaryPoints: [[0, 0], [4, 0], [4, 3.6], [0, 3.6]],
        finishSchedule: {
          floorFinish: "Italian Statuario Marble",
          wallFinish: "Asian Paints Royale Health Shield",
        },
      },
      {
        id: "revit_2",
        name: "Living Room Core",
        number: "102",
        areaSqM: 42.0,
        perimeterM: 26.0,
        unboundedHeightM: 3.2,
        level: "Level 1",
        boundaryPoints: [[4, 0], [10, 0], [10, 7], [4, 7]],
        finishSchedule: {
          floorFinish: "Italian Statuario Marble",
          wallFinish: "Burma Teak Acoustic Slats",
        },
      },
    ],
    cameras: [
      {
        viewName: "Walkthrough 1 - Entry",
        viewType: "Perspective",
        eyePosition: [2.0, 1.65, 0.5],
        targetPosition: [2.0, 1.45, 2.5],
        fieldOfViewDeg: 55,
        focalLengthMm: 28,
      },
      {
        viewName: "Walkthrough 2 - Living Room",
        viewType: "Perspective",
        eyePosition: [5.0, 1.65, 2.0],
        targetPosition: [8.0, 1.3, 4.5],
        fieldOfViewDeg: 55,
        focalLengthMm: 28,
      },
    ],
    exportedAt: "2026-10-04T00:00:00Z",
  };

  it("converts Revit BIM rooms into AtelierOS ConstructionElements", () => {
    const elements = convertRevitToConstructionElements(samplePayload);
    expect(elements.rooms?.length).toBe(2);
    expect(elements.rooms?.[0].label).toBe("Entrance Foyer");
    expect(elements.rooms?.[0].direction).toBe("E");
    expect(elements.rooms?.[1].label).toBe("Living Room Core");
    expect(elements.rooms?.[1].direction).toBe("NE");
    expect(elements.walls.length).toBe(8); // 4 walls per room
  });

  it("converts Revit 3D perspective cameras into Higgsfield AI flight waypoints", () => {
    const waypoints = convertRevitCamerasToHiggsfieldWaypoints(samplePayload.cameras);
    expect(waypoints.length).toBe(2);
    expect(waypoints[0].position[1]).toBe(1.65); // 1.65m human eye level
    expect(waypoints[0].fov).toBe(55);
    expect(waypoints[0].description).toContain("28mm Cine Prime");
    expect(waypoints[1].timeSec).toBe(3);
  });
});
