/**
 * Unit test suite for Staircase & Fire Life Safety Egress Calculator (NBC 2016 Part 4).
 */

import {
  calculateStaircaseCompliance,
  calculateStaircaseGeometry,
  resolveMultiExitRoutes,
  generateEvacuationDossier,
  generateFireEvacuationDossier,
  STAIRCASE_STATUTORY_LIMITS,
} from "./staircase-egress-calculator";

describe("Staircase Capacity & Geometry Compliance — NBC 2016 Part 4", () => {
  it("validates high-rise residential staircase geometry (width >= 1.50m, R <= 150mm, T >= 300mm)", () => {
    const res = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
      buildingHeightM: 24.0,
      occupancyType: "residential",
    });

    expect(res.isWidthCompliant).toBe(true);
    expect(res.isRiserCompliant).toBe(true);
    expect(res.isTreadCompliant).toBe(true);
    expect(res.isErgonomicCompliant).toBe(true);
    expect(res.ergonomicMetricMM).toBe(600);
    expect(res.overallPass).toBe(true);
    expect(res.risersPerFlight).toBeLessThanOrEqual(15);
    expect(res.landingDepthM).toBeGreaterThanOrEqual(1.50);
  });

  it("enforces Blondel ergonomic formula (550mm <= 2R + T <= 650mm) boundary values", () => {
    // Exact 550mm boundary (2*125 + 300 = 550)
    const pass550 = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.125,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(pass550.ergonomicMetricMM).toBe(550);
    expect(pass550.isErgonomicCompliant).toBe(true);

    // Below boundary: 549mm (2*124 + 300 = 548)
    const fail549 = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.124,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(fail549.ergonomicMetricMM).toBeLessThan(550);
    expect(fail549.isErgonomicCompliant).toBe(false);

    // Exact 650mm boundary (2*150 + 350 = 650)
    const pass650 = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.35,
      totalRiseM: 3.00,
    });
    expect(pass650.ergonomicMetricMM).toBe(650);
    expect(pass650.isErgonomicCompliant).toBe(true);

    // Exceeding boundary: 652mm (2*150 + 352 = 652)
    const fail651 = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.352,
      totalRiseM: 3.00,
    });
    expect(fail651.ergonomicMetricMM).toBeGreaterThan(650);
    expect(fail651.isErgonomicCompliant).toBe(false);
  });

  it("enforces maximum riser height of 150mm (0.15m)", () => {
    const pass = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(pass.isRiserCompliant).toBe(true);

    const fail = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.155,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(fail.isRiserCompliant).toBe(false);
    expect(fail.overallPass).toBe(false);
  });

  it("enforces minimum tread depth of 300mm (0.30m)", () => {
    const pass = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(pass.isTreadCompliant).toBe(true);

    const fail = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.28,
      totalRiseM: 3.00,
    });
    expect(fail.isTreadCompliant).toBe(false);
    expect(fail.overallPass).toBe(false);
  });

  it("enforces minimum flight width by occupancy and building height", () => {
    // High-rise residential (>15m): required >= 1.50m
    const highRise = calculateStaircaseCompliance({
      flightWidthM: 1.20,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
      buildingHeightM: 18.0,
      occupancyType: "residential",
    });
    expect(highRise.requiredWidthM).toBe(1.50);
    expect(highRise.isWidthCompliant).toBe(false);

    // Low-rise residential (<=15m): required >= 1.00m
    const lowRise = calculateStaircaseCompliance({
      flightWidthM: 1.20,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
      buildingHeightM: 12.0,
      occupancyType: "residential",
    });
    expect(lowRise.requiredWidthM).toBe(1.00);
    expect(lowRise.isWidthCompliant).toBe(true);

    // Commercial / Assembly: required >= 2.00m
    const commercial = calculateStaircaseCompliance({
      flightWidthM: 1.80,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
      occupancyType: "commercial",
    });
    expect(commercial.requiredWidthM).toBe(2.00);
    expect(commercial.isWidthCompliant).toBe(false);
  });

  it("enforces maximum 15 risers per flight and landing depth >= flight width", () => {
    // 3.6m rise at 0.15m riser = 24 risers -> requires 2 flights of 12 risers each
    const stair = calculateStaircaseCompliance({
      flightWidthM: 1.60,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.60,
    });
    expect(stair.flightsRequired).toBe(2);
    expect(stair.risersPerFlight).toBeLessThanOrEqual(15);
    expect(stair.landingDepthM).toBeGreaterThanOrEqual(1.60);
  });
});

describe("Multi-Exit Nearest-Exit Vector Routing", () => {
  it("partitions retreat points to their nearest designated exit", () => {
    const retreatPoints = [
      { x: 2.0, y: 2.0 },
      { x: 18.0, y: 15.0 },
    ];
    const exits = [
      { id: "exit-west", position: { x: 1.0, y: 1.0 } },
      { id: "exit-east", position: { x: 20.0, y: 16.0 } },
    ];

    const routes = resolveMultiExitRoutes(retreatPoints, exits, 30.0);
    expect(routes.length).toBe(2);
    expect(routes[0].exitId).toBe("exit-west");
    expect(routes[1].exitId).toBe("exit-east");
    expect(routes[0].isCompliant).toBe(true);
    expect(routes[1].isCompliant).toBe(true);
    expect(routes[0].routeWaypoints.length).toBe(4);
  });

  it("flags non-compliant travel distance when exceeding 30.0m", () => {
    const retreatPoints = [{ x: 50.0, y: 50.0 }];
    const exits = [{ id: "exit-1", position: { x: 0.0, y: 0.0 } }];

    const routes = resolveMultiExitRoutes(retreatPoints, exits, 30.0);
    expect(routes[0].isCompliant).toBe(false);
    expect(routes[0].travelDistanceM).toBeGreaterThan(30.0);
  });

  it("handles empty exits list gracefully", () => {
    const routes = resolveMultiExitRoutes([{ x: 5, y: 5 }], []);
    expect(routes).toEqual([]);
  });
});

describe("Municipal Fire Evacuation Dossier Generator", () => {
  it("generates complete life safety documentation with 50 Pa pressurization, FD 120, and checklist", () => {
    const dossier = generateFireEvacuationDossier({
      projectName: "The Camellias High-Rise Sanctuary",
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.30,
      buildingHeightM: 28.0,
      occupantLoad: 30,
      furthestTravelDistanceM: 21.4,
    });

    expect(dossier.projectName).toBe("The Camellias High-Rise Sanctuary");
    expect(dossier.pressurizationPa).toBe(50);
    expect(dossier.fireDoorRating).toContain("FD 120");
    expect(dossier.staircaseSpecs.isWidthCompliant).toBe(true);
    expect(dossier.exitCapacities.totalStairCapacityPersons).toBeGreaterThanOrEqual(30);

    // Life safety checklist verification
    expect(dossier.lifeSafetyChecklist.length).toBeGreaterThanOrEqual(10);
    const widthCheck = dossier.lifeSafetyChecklist.find((c) => c.item === "Stairway Clear Width");
    expect(widthCheck?.status).toBe("PASS");
    const pressCheck = dossier.lifeSafetyChecklist.find((c) => c.item === "Positive Staircase Pressurization");
    expect(pressCheck?.status).toBe("PASS");

    // Output formats verification
    expect(dossier.dossierMarkdown).toContain("MUNICIPAL FIRE PREVENTION & LIFE SAFETY SUBMISSION DOSSIER");
    expect(dossier.dossierMarkdown).toContain("50 Pa");
    expect(dossier.dossierMarkdown).toContain("FD 120");
    expect(dossier.dossierHtml).toContain("<!DOCTYPE html>");
    expect(dossier.dossierHtml).toContain("Municipal Fire Directorate Certification");
    expect(dossier.dossierJson).toContain("\"pressurizationPa\": 50");
  });

  it("generateEvacuationDossier remains backwards compatible", () => {
    const summary = {
      projectName: "DLF Phase 5 Core",
      occupantLoad: 24,
      furthestTravelDistanceM: 18.4,
      staircaseClearWidthM: 1.50,
      fireDoorRating: "FD 120",
      hasPressurizationFan: true,
      hoseReelCount: 2,
    };
    const text = generateEvacuationDossier(summary);
    expect(text).toContain("STATUTORY FIRE LIFE SAFETY & EVACUATION DOSSIER");
    expect(text).toContain("50 Pa Positive Pressure");
    expect(text).toContain("FD 120");
  });

  it("enforces strict riser ceiling boundary: R = 150mm passes, R = 151mm fails", () => {
    const pass = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.150,
      treadDepthM: 0.300,
      totalRiseM: 3.00,
    });
    expect(pass.isRiserCompliant).toBe(true);
    expect(pass.overallPass).toBe(true);

    const fail = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.151,
      treadDepthM: 0.300,
      totalRiseM: 3.00,
    });
    expect(fail.isRiserCompliant).toBe(false);
    expect(fail.overallPass).toBe(false);
  });

  it("enforces strict tread floor boundary: T = 300mm passes, T = 299mm fails", () => {
    const pass = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.150,
      treadDepthM: 0.300,
      totalRiseM: 3.00,
    });
    expect(pass.isTreadCompliant).toBe(true);
    expect(pass.overallPass).toBe(true);

    const fail = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.150,
      treadDepthM: 0.299,
      totalRiseM: 3.00,
    });
    expect(fail.isTreadCompliant).toBe(false);
    expect(fail.overallPass).toBe(false);
  });

  it("safely guards against non-positive dimensions without producing NaN or Infinity", () => {
    const resR0 = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0,
      treadDepthM: 0.300,
      totalRiseM: 3.00,
    });
    expect(resR0.isRiserCompliant).toBe(false);
    expect(resR0.overallPass).toBe(false);
    expect(resR0.riserCount).toBe(0);
    expect(resR0.risersPerFlight).toBe(0);
    expect(resR0.flightsRequired).toBe(0);

    const resRNeg = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: -0.15,
      treadDepthM: 0.300,
      totalRiseM: 3.00,
    });
    expect(resRNeg.isRiserCompliant).toBe(false);
    expect(resRNeg.overallPass).toBe(false);

    const resT0 = calculateStaircaseCompliance({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0,
      totalRiseM: 3.00,
    });
    expect(resT0.isTreadCompliant).toBe(false);
    expect(resT0.overallPass).toBe(false);

    const resW0 = calculateStaircaseCompliance({
      flightWidthM: 0,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(resW0.isWidthCompliant).toBe(false);
    expect(resW0.overallPass).toBe(false);
  });

  it("exposes and populates fireDoorCount in FireEvacuationDossier", () => {
    const dossierDefault = generateFireEvacuationDossier({
      flightWidthM: 1.50,
      riserHeightM: 0.15,
      treadDepthM: 0.30,
      totalRiseM: 3.00,
    });
    expect(dossierDefault.fireDoorCount).toBe(2);
    expect(dossierDefault.dossierMarkdown).toContain("2x FD 120");
    expect(dossierDefault.dossierHtml).toContain("2x FD 120");
    expect(JSON.parse(dossierDefault.dossierJson).fireDoorCount).toBe(2);

    const mockPlanWithDoors = {
      rooms: [],
      walls: [],
      doors: [
        { id: "d1", position: { x: 0, y: 0 }, width: 1.0, wallId: null, isFireExit: true },
        { id: "d2", position: { x: 10, y: 0 }, width: 1.0, wallId: null, isFireExit: true },
        { id: "d3", position: { x: 20, y: 0 }, width: 1.0, wallId: null, isFireExit: true },
        { id: "d4", position: { x: 30, y: 0 }, width: 1.0, wallId: null, isFireExit: false },
      ],
      windows: [],
      gridSize: 0.5,
      panOffset: { x: 0, y: 0 },
      zoom: 35,
    };
    const dossierWithPlan = generateFireEvacuationDossier({}, mockPlanWithDoors);
    expect(dossierWithPlan.fireDoorCount).toBe(3); // 3 doors with isFireExit !== false
  });

  it("deduplicates adjacent colinear waypoints in resolveMultiExitRoutes", () => {
    const exits = [{ id: "exit-start", position: { x: 0, y: 0 } }];
    const routesHorizontal = resolveMultiExitRoutes([{ x: 5, y: 0 }], exits);
    expect(routesHorizontal[0].routeWaypoints.length).toBe(2);
    expect(routesHorizontal[0].routeWaypoints).toEqual([
      { x: 5, y: 0 },
      { x: 0, y: 0 },
    ]);

    const routesVertical = resolveMultiExitRoutes([{ x: 0, y: 10 }], exits);
    expect(routesVertical[0].routeWaypoints.length).toBe(3);
    // (0, 10), (0, 5), (0, 0)
    expect(routesVertical[0].routeWaypoints).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: 5 },
      { x: 0, y: 0 },
    ]);
  });
});
