import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_EPC_177_TASKS,
  DEFAULT_TURNKEY_TASKS,
  calculateCPM,
  applyVEFlooringSubstitution,
  applyValueEngineeringCompression,
  assessMonsoonRisk,
  checkMonsoonTaskAlerts,
  generateIFC4LOD300Records,
  exportCOBieScheduleCSV,
  type GanttTask,
} from "./construction-gantt-engine";
import { exportFloorPlanToIfc } from "../ifc-export";
import type { FloorPlan } from "@/components/floor-plan-editor/types";

describe("Pillar 5: 4D EPC Construction Scheduling & Turnkey Resilience Engine", () => {
  describe("Critical Path Method (CPM) Forward & Backward Passes", () => {
    test("calculates Early Start (ES), Early Finish (EF), Late Start (LS), and Late Finish (LF)", () => {
      // Empty input array boundary check
      const emptyRes = calculateCPM([]);
      assert.equal(emptyRes.totalDurationDays, 0);
      assert.equal(emptyRes.tasks.length, 0);
      assert.deepEqual(emptyRes.criticalPath, []);

      // Topological resolution of reverse-order DAG [Successor, Predecessor]
      const reverseOrderTasks = [
        { id: "task_succ", name: "Successor Task", tradePackage: "finishes" as const, durationDays: 10, predecessorIds: ["task_pred"], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
        { id: "task_pred", name: "Predecessor Task", tradePackage: "substructure" as const, durationDays: 5, predecessorIds: [], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
      ];
      const revCPM = calculateCPM(reverseOrderTasks);
      const pred = revCPM.tasks.find((t) => t.id === "task_pred");
      const succ = revCPM.tasks.find((t) => t.id === "task_succ");
      assert.equal(succ?.earlyStartDay, 5);
      assert.equal(succ?.earlyFinishDay, 15);
      assert.equal(revCPM.totalDurationDays, 15);
      assert.equal(pred?.lateStartDay, 0);
      assert.equal(pred?.lateFinishDay, 5);
      assert.equal(pred?.totalFloatDays, 0);

      // Cyclic dependency detection (A -> B -> A)
      const cyclicTasks = [
        { id: "cycle_A", name: "Cycle Task A", tradePackage: "substructure" as const, durationDays: 5, predecessorIds: ["cycle_B"], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
        { id: "cycle_B", name: "Cycle Task B", tradePackage: "finishes" as const, durationDays: 10, predecessorIds: ["cycle_A"], leadTimeWeeks: 0, isDomesticProcurement: true, monsoonSensitive: false },
      ];
      assert.throws(() => calculateCPM(cyclicTasks), /Cyclic dependency detected/);

      const result = calculateCPM(BASELINE_EPC_177_TASKS);
      assert.ok(result.totalDurationDays > 0);
      assert.ok(result.tasks.length > 0);

      for (const task of result.tasks) {
        assert.ok(task.earlyStartDay !== undefined);
        assert.ok(task.earlyFinishDay !== undefined);
        assert.ok(task.lateStartDay !== undefined);
        assert.ok(task.lateFinishDay !== undefined);
        assert.ok(task.totalFloatDays !== undefined);

        // Mathematical invariants:
        // EF = ES + Duration
        assert.equal(task.earlyFinishDay, task.earlyStartDay + task.durationDays);
        // LS = LF - Duration
        assert.equal(task.lateStartDay, task.lateFinishDay - task.durationDays);
        // Total Float = LS - ES = LF - EF
        const floatFromStart = task.lateStartDay - task.earlyStartDay;
        const floatFromFinish = task.lateFinishDay - task.earlyFinishDay;
        assert.equal(floatFromStart, floatFromFinish);
        assert.equal(task.totalFloatDays, floatFromStart);
      }
    });

    test("identifies critical path tasks strictly where Total Float = 0", () => {
      const result = calculateCPM(BASELINE_EPC_177_TASKS);
      assert.ok(result.criticalPath.length > 0);

      for (const taskId of result.criticalPath) {
        const task = result.tasks.find((t) => t.id === taskId);
        assert.ok(task, `Task ${taskId} must be present`);
        assert.equal(task.totalFloatDays, 0, `Critical task ${taskId} must have zero float`);
        assert.equal(task.isCritical, true);
      }

      // Non-critical tasks must have Total Float > 0
      const nonCriticalTasks = result.tasks.filter((t) => !result.criticalPath.includes(t.id));
      for (const task of nonCriticalTasks) {
        assert.ok((task.totalFloatDays ?? 0) > 0);
        assert.equal(task.isCritical, false);
      }
    });

    test("verifies baseline 177-calendar-day CPM schedule with imported marble on critical path", () => {
      const result = calculateCPM(BASELINE_EPC_177_TASKS);
      assert.equal(result.totalDurationDays, 177, "Baseline project duration must be exactly 177 calendar days");

      // Verify sequence on the critical path
      const criticalIds = result.criticalPath;
      assert.ok(criticalIds.includes("site_handover"));
      assert.ok(criticalIds.includes("substructure_columns"));
      assert.ok(
        criticalIds.includes("procurement_italian_marble"),
        "Imported marble procurement (112 days) must be on the critical path in baseline"
      );
      assert.ok(criticalIds.includes("flooring_installation_screed"));
      assert.ok(criticalIds.includes("woodwork_joinery_is287"));
      assert.ok(criticalIds.includes("turnkey_handover"));

      const marbleProc = result.tasks.find((t) => t.id === "procurement_italian_marble");
      assert.ok(marbleProc);
      assert.equal(marbleProc.durationDays, 112);
      assert.equal(marbleProc.leadTimeWeeks, 16);
      assert.equal(marbleProc.earlyStartDay, 24);
      assert.equal(marbleProc.earlyFinishDay, 136);
      assert.equal(marbleProc.totalFloatDays, 0);

      // Verify that parallel MEP and drywall have float in baseline
      const drywall = result.tasks.find((t) => t.id === "drywall_partitions");
      assert.ok(drywall);
      assert.equal(drywall.earlyFinishDay, 47);
      assert.equal(drywall.totalFloatDays, 89); // 136 - 47 = 89 days float
    });
  });

  describe("Value Engineering Lead Time Compression (ve_flooring_kajaria_kota)", () => {
    test("collapses procurement from 112 days to 14 days and compresses project to 88 days (<= 90 threshold)", () => {
      const veResult = applyVEFlooringSubstitution();

      assert.equal(veResult.weeksSaved, 14, "VE must save exactly 14 weeks lead time");
      assert.equal(veResult.daysSaved, 98, "VE must save exactly 98 calendar days");
      assert.equal(veResult.totalDurationDays, 88, "Compressed schedule must be exactly 88 calendar days");
      assert.equal(veResult.isTurnkeyHandoverCompliant, true, "88 days satisfies the <= 90 days statutory handover limit");

      // Verify that procurement is no longer the bottleneck and drywall is now on the critical path
      const kotaProc = veResult.tasks.find((t) => t.id === "procurement_domestic_kota");
      assert.ok(kotaProc);
      assert.equal(kotaProc.durationDays, 14);
      assert.equal(kotaProc.leadTimeWeeks, 2);
      assert.equal(kotaProc.earlyStartDay, 24);
      assert.equal(kotaProc.earlyFinishDay, 38);
      assert.equal(kotaProc.totalFloatDays, 9); // finishes on day 38 while drywall finishes day 47 (47 - 38 = 9)

      // Drywall now governs the start of flooring installation
      const drywall = veResult.tasks.find((t) => t.id === "drywall_partitions");
      assert.ok(drywall);
      assert.equal(drywall.totalFloatDays, 0, "Drywall is now on the critical path");
      assert.equal(drywall.isCritical, true);

      const flooring = veResult.tasks.find((t) => t.id === "flooring_installation_screed");
      assert.ok(flooring);
      assert.equal(flooring.earlyStartDay, 47);
      assert.equal(flooring.earlyFinishDay, 65);
      assert.equal(flooring.totalFloatDays, 0);

      const woodwork = veResult.tasks.find((t) => t.id === "woodwork_joinery_is287");
      assert.ok(woodwork);
      assert.equal(woodwork.earlyStartDay, 65);
      assert.equal(woodwork.earlyFinishDay, 80);
      assert.equal(woodwork.totalFloatDays, 0);

      const handover = veResult.tasks.find((t) => t.id === "turnkey_handover");
      assert.ok(handover);
      assert.equal(handover.earlyStartDay, 80);
      assert.equal(handover.earlyFinishDay, 88);
      assert.equal(handover.totalFloatDays, 0);
    });

    test("backwards compatibility with DEFAULT_TURNKEY_TASKS and applyValueEngineeringCompression", () => {
      const baseCPM = calculateCPM(DEFAULT_TURNKEY_TASKS);
      assert.ok(baseCPM.totalDurationDays >= 80 && baseCPM.totalDurationDays <= 100);

      const compressed = applyValueEngineeringCompression(DEFAULT_TURNKEY_TASKS, [
        {
          tradeId: "finishes",
          originalMaterial: "Italian Marble",
          proposedMaterial: "Kota Stone",
          costSavingINR: 855000,
          leadTimeReductionWeeks: 14,
        },
      ]);
      const stone = compressed.find((t) => t.id === "T500");
      assert.ok(stone);
      assert.equal(stone.leadTimeWeeks, 2);
      assert.equal(stone.isDomesticProcurement, true);
    });

    test("dynamically calculates daysSaved and weeksSaved for custom procurement duration tasks", () => {
      const customTasks: GanttTask[] = JSON.parse(JSON.stringify(BASELINE_EPC_177_TASKS));
      const marble = customTasks.find((t) => t.id === "procurement_italian_marble");
      assert.ok(marble);
      marble.durationDays = 42; // Custom 6-week procurement duration

      const veResult = applyVEFlooringSubstitution(customTasks);
      assert.equal(veResult.daysSaved, 28, "Custom 42d duration collapsing to 14d must save exactly 28 days");
      assert.equal(veResult.weeksSaved, 4, "28 days / 7 must save exactly 4 weeks");
    });
  });

  describe("Regional Monsoon Risk & IS 287 Alerts (Delhi-NCR)", () => {
    test("detects monsoon overlap (July 1 to Sept 15) and raises high-risk alerts for screed & joinery", () => {
      // With VE compressed schedule starting on June 1:
      // Day 47 (flooring) falls on July 18, and Day 65 (joinery) falls on August 5 — squarely in the monsoon!
      const compressed = applyVEFlooringSubstitution();
      const alerts = checkMonsoonTaskAlerts(compressed.tasks, { month: 6, day: 1 });

      assert.ok(alerts.length >= 2, "Must flag both screed and joinery tasks when overlapping monsoon");

      const screedAlert = alerts.find((a) => a.taskId === "flooring_installation_screed");
      assert.ok(screedAlert, "Must raise alert for flooring installation screed");
      assert.equal(screedAlert.riskLevel, "high");
      assert.ok(screedAlert.message.includes("95% RH"));
      assert.ok(screedAlert.statutoryMitigation.includes("IS 15477 C2TE S1"));

      const joineryAlert = alerts.find((a) => a.taskId === "woodwork_joinery_is287");
      assert.ok(joineryAlert, "Must raise alert for custom woodwork joinery");
      assert.equal(joineryAlert.riskLevel, "high");
      assert.ok(joineryAlert.message.includes("IS 287"));
      assert.ok(joineryAlert.message.includes("8–12% Equilibrium Moisture Content") || joineryAlert.message.includes("8-12%"));
      assert.ok(joineryAlert.statutoryMitigation.includes("BWP 710 marine plywood backer"));
      assert.ok(joineryAlert.statutoryMitigation.includes("2mm expansion reveals"));

      // Also verify baseline 177-day schedule starting in March/April overlaps monsoon
      const baselineSchedule = calculateCPM(BASELINE_EPC_177_TASKS);
      const baselineAlerts = checkMonsoonTaskAlerts(baselineSchedule.tasks, { month: 4, day: 1 });
      assert.ok(baselineAlerts.length >= 2, "Baseline schedule starting April 1 must also flag monsoon risks");
    });

    test("dry season projects (starting in October/November) produce zero monsoon risk alerts", () => {
      const schedule = calculateCPM(DEFAULT_TURNKEY_TASKS);
      // Project starting in November: Nov to Jan, zero monsoon overlap
      const alerts = checkMonsoonTaskAlerts(schedule.tasks, { month: 11, day: 1 });
      assert.equal(alerts.length, 0, "No alerts during dry winter season");

      const winterAssessment = assessMonsoonRisk(11, 90);
      assert.equal(winterAssessment.isMonsoonImpacted, false);
      assert.equal(winterAssessment.recommendedWeatherBufferDays, 0);
    });

    test("assessMonsoonRisk evaluates July start with 8-day contingency buffer", () => {
      const monsoonAssessment = assessMonsoonRisk(7, 90);
      assert.equal(monsoonAssessment.isMonsoonImpacted, true);
      assert.equal(monsoonAssessment.joineryEMCRisk, true);
      assert.equal(monsoonAssessment.screedMoistureRisk, true);
      assert.equal(monsoonAssessment.recommendedWeatherBufferDays, 8);
      assert.ok(monsoonAssessment.mitigationGuidelines.some((g) => g.includes("IS 287")));
    });
  });

  describe("Enriched IFC4 LOD 300 Export & COBie Verification", () => {
    test("exports valid ISO-10303-21 IFC4 file with Pset_WallCommon and COBie_Specification", () => {
      const samplePlan: FloorPlan = {
        walls: [
          { id: "w1", start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, thickness: 0.15 },
          { id: "w2", start: { x: 6, y: 0 }, end: { x: 6, y: 5 }, thickness: 0.15 },
        ],
        doors: [{ id: "d1", position: { x: 3, y: 0 }, width: 1.0, wallId: "w1" }],
        windows: [{ id: "win1", position: { x: 6, y: 2.5 }, width: 1.2, wallId: "w2" }],
        rooms: [],
        gridSize: 0.5,
        panOffset: { x: 0, y: 0 },
        zoom: 35,
      };

      const ifcText = exportFloorPlanToIfc(samplePlan, "DLF Phase 5 Luxury Sanctuary");

      // Verify ISO-10303-21 STEP envelope
      assert.ok(ifcText.startsWith("ISO-10303-21;"));
      assert.ok(ifcText.includes("FILE_SCHEMA(('IFC4'));"));
      assert.ok(ifcText.includes("END-ISO-10303-21;"));

      // Verify Pset_WallCommon properties
      assert.ok(ifcText.includes("Pset_WallCommon"));
      assert.ok(ifcText.includes("IFCTHERMALTRANSMITTANCEMEASURE(0.35)"), "Must embed U = 0.35 W/m²K");
      assert.ok(ifcText.includes("IFCLABEL('STC 56 Tested')"), "Must embed STC 56 Tested");
      assert.ok(ifcText.includes("IFCLABEL('FD 120 (2-Hour Fire Barrier)')"), "Must embed FD 120 2-Hour Fire Barrier");

      // Verify COBie_Specification properties
      assert.ok(ifcText.includes("COBie_Specification"));
      assert.ok(ifcText.includes("IFCLABEL('Architectural Building Element')"));
      assert.ok(ifcText.includes("IFCLABEL('Tier-1 EPC Turnkey Handover')"));

      // Verify relational linkage via IFCRELDEFINESBYPROPERTIES
      assert.ok(ifcText.includes("IFCRELDEFINESBYPROPERTIES"));
    });

    test("generates and exports COBie schedule CSV with required attributes", () => {
      const records = generateIFC4LOD300Records();
      assert.ok(records.length >= 4);

      const csv = exportCOBieScheduleCSV(records);
      assert.ok(csv.includes("IFC GUID,Entity Type,Component Name,Material Specification,Fire Rating (NBC 2016),Acoustic STC,Thermal U-Value (W/m²K),CPWD DSR 2024 Code,BIM LOD Stage"));
      assert.ok(csv.includes("FD 120"));
      assert.ok(csv.includes("0.35"));
      assert.ok(csv.includes("LOD 300 Turnkey"));
    });

    test("dynamically scales IFC4 LOD 300 records according to roomCount", () => {
      const records4 = generateIFC4LOD300Records(4);
      assert.equal(records4.length, 4, "roomCount = 4 produces 4 baseline structural records");

      const records8 = generateIFC4LOD300Records(8);
      assert.equal(records8.length, 8, "roomCount = 8 produces 4 base + 4 spatial zone records");
      assert.equal(records8.filter((r) => r.entityType === "IfcSpace").length, 4);

      const records12 = generateIFC4LOD300Records(12);
      assert.equal(records12.length, 12, "roomCount = 12 produces 12 total records");
      assert.ok(records12.every((r) => r.guid && r.guid.length > 0));
      assert.ok(records12.every((r) => r.cobieStage === "LOD 300 Turnkey"));
    });
  });
});
