/**
 * 4D EPC Construction Scheduling, Critical Path Method (CPM) & Turnkey Resilience Engine.
 *
 * Implements Pillar 5 capabilities for AtelierOS:
 * 1. 4D CPM Gantt Scheduling Engine:
 *    - Day 0 to Day 90 turnkey luxury handover timeline
 *    - Forward/backward pass CPM logic calculating Early Start (ES), Early Finish (EF),
 *      Late Start (LS), Late Finish (LF), and Total Float (TF)
 *    - Automated Critical Path identification
 * 2. Dynamic Lead-Time Compression on Value Engineering (VE) Approvals:
 *    - Quantifies procurement acceleration (e.g., Italian Marble -> Kota Stone compresses lead time by up to 14 weeks)
 * 3. Regional Monsoon Weather Risk & Climate Resilience:
 *    - Delhi-NCR / Haryana monsoon impact analysis (July-September humidity > 80%)
 *    - IS 287 Timber joinery moisture equilibrium (8-12% EMC) warping warnings
 *    - Efflorescence moisture buffering for subgrade screed curing
 * 4. Enriched IFC4 LOD 300 & COBie Architectural Data Export Generator:
 *    - Compliant with buildingSMART IFC4 Design Transfer View
 *    - Full property sets: Pset_WallCommon, Pset_DoorCommon, Acoustic STC, Fire Rating, CPWD DSR codes
 */

export interface GanttTask {
  id: string;
  name: string;
  tradePackage: 'substructure' | 'mep' | 'civil_structural' | 'finishes' | 'drywall_ceiling' | 'millwork' | 'commissioning' | 'procurement';
  durationDays: number;
  predecessorIds: string[];
  leadTimeWeeks: number;
  isDomesticProcurement: boolean;
  monsoonSensitive: boolean;

  // CPM Calculated Fields
  earlyStartDay?: number;
  earlyFinishDay?: number;
  lateStartDay?: number;
  lateFinishDay?: number;
  totalFloatDays?: number;
  isCritical?: boolean;
}

export interface ValueEngineeringSwap {
  tradeId: string;
  originalMaterial: string;
  proposedMaterial: string;
  costSavingINR: number;
  leadTimeReductionWeeks: number;
}

export interface MonsoonRiskAssessment {
  scheduledStartMonth: number; // 1-12
  scheduledEndMonth: number;
  monsoonOverlapDays: number;
  isMonsoonImpacted: boolean;
  joineryEMCRisk: boolean; // IS 287 8-12% EMC
  screedMoistureRisk: boolean;
  recommendedWeatherBufferDays: number;
  mitigationGuidelines: string[];
}

export interface MonsoonTaskAlert {
  taskId: string;
  taskName: string;
  riskLevel: 'medium' | 'high';
  relativeStartDay: number;
  relativeEndDay: number;
  message: string;
  statutoryMitigation: string;
  codeCitation: string;
}

export interface IFCPropertyRecord {
  guid: string;
  entityType: 'IfcWall' | 'IfcSlab' | 'IfcDoor' | 'IfcSpace' | 'IfcColumn' | 'IfcBeam';
  name: string;
  material: string;
  fireRating: string; // e.g. "FD 120"
  acousticSTC: number; // e.g. 56
  uValueW_m2K: number;
  cpwdItemCode?: string;
  cobieStage: string; // e.g. "LOD 300 Turnkey"
}

export interface ConstructionScheduleResult {
  tasks: GanttTask[];
  totalProjectDurationDays: number;
  criticalPathTaskIds: string[];
  procurementLeadTimeWeeks: number;
  monsoonRisk: MonsoonRiskAssessment;
  ifcRecordsCount: number;
}

/**
 * Standard Day 0 to Day 90 Turnkey Luxury Architectural Task Hierarchy
 * Maintained for backwards-compatibility with existing unit test runners.
 */
export const DEFAULT_TURNKEY_TASKS: GanttTask[] = [
  {
    id: 'T100',
    name: 'Site Handover, Protection & MEP Laser Alignment',
    tradePackage: 'substructure',
    durationDays: 5,
    predecessorIds: [],
    leadTimeWeeks: 1,
    isDomesticProcurement: true,
    monsoonSensitive: false,
  },
  {
    id: 'T200',
    name: 'Structural Bay Column & Continuous MEP Wet Core Riser Setup',
    tradePackage: 'civil_structural',
    durationDays: 14,
    predecessorIds: ['T100'],
    leadTimeWeeks: 2,
    isDomesticProcurement: true,
    monsoonSensitive: false,
  },
  {
    id: 'T300',
    name: 'MEP High-Level Ducted VRV & Concealed Plumbing Rough-ins',
    tradePackage: 'mep',
    durationDays: 16,
    predecessorIds: ['T200'],
    leadTimeWeeks: 3,
    isDomesticProcurement: true,
    monsoonSensitive: true,
  },
  {
    id: 'T400',
    name: '450mm False Ceiling Plenum Framing & Rockwool Acoustic Infill',
    tradePackage: 'drywall_ceiling',
    durationDays: 12,
    predecessorIds: ['T300'],
    leadTimeWeeks: 2,
    isDomesticProcurement: true,
    monsoonSensitive: true,
  },
  {
    id: 'T500',
    name: 'Natural Stone Flooring (Imported Marble or Domestic Kota Stone)',
    tradePackage: 'finishes',
    durationDays: 20,
    predecessorIds: ['T400'],
    leadTimeWeeks: 16, // Default imported marble: 16 weeks lead time
    isDomesticProcurement: false,
    monsoonSensitive: true,
  },
  {
    id: 'T600',
    name: 'Custom Architectural Millwork, Acoustic Wall Slats & Joinery',
    tradePackage: 'millwork',
    durationDays: 15,
    predecessorIds: ['T500'],
    leadTimeWeeks: 6,
    isDomesticProcurement: true,
    monsoonSensitive: true, // Timber EMC 8-12% sensitivity
  },
  {
    id: 'T700',
    name: 'Sanitary Fixtures, Lighting Commissioning & Final Handover',
    tradePackage: 'commissioning',
    durationDays: 8,
    predecessorIds: ['T600'],
    leadTimeWeeks: 2,
    isDomesticProcurement: true,
    monsoonSensitive: false,
  },
];

export const DEFAULT_CONSTRUCTION_SCHEDULE = DEFAULT_TURNKEY_TASKS;

/**
 * Baseline 177-Calendar-Day EPC Schedule
 *
 * Models the full institutional EPC turnkey schedule with imported Italian Statuario marble
 * on the critical path.
 *
 * Sequence:
 * 1. Site Handover & Mobilization (5d) -> Day 0 to 5
 * 2. Substructure & Column Framing (19d) -> Day 5 to 24
 * 3. MEP High-Level VRV Rough-ins (16d) -> Day 24 to 40
 * 4. 450mm Ceiling Plenum & STC 56 Drywall (7d) -> Day 40 to 47
 * 5. Imported Italian Statuario Marble Procurement (112d / 16 weeks) -> Day 24 to 136 (CRITICAL!)
 * 6. Subfloor Screed & Flooring Installation (18d) -> depends on [drywall(47), marble(136)] -> Day 136 to 154 (CRITICAL!)
 * 7. Custom Joinery & Woodwork (IS 287) (15d) -> Day 154 to 169 (CRITICAL!)
 * 8. Testing, Commissioning & Turnkey Handover (8d) -> Day 169 to 177 (CRITICAL!)
 *
 * Total duration = 177 calendar days.
 */
export const BASELINE_EPC_177_TASKS: GanttTask[] = [
  {
    id: 'site_handover',
    name: 'Site Handover, Protection & MEP Laser Alignment',
    tradePackage: 'substructure',
    durationDays: 5,
    predecessorIds: [],
    leadTimeWeeks: 1,
    isDomesticProcurement: true,
    monsoonSensitive: false,
  },
  {
    id: 'substructure_columns',
    name: 'Structural Bay RC Columns & 300x300mm Core Sleeving',
    tradePackage: 'civil_structural',
    durationDays: 19,
    predecessorIds: ['site_handover'],
    leadTimeWeeks: 2,
    isDomesticProcurement: true,
    monsoonSensitive: false,
  },
  {
    id: 'mep_roughins',
    name: 'MEP High-Level Ducted VRV & Plumbing Stacks Rough-ins',
    tradePackage: 'mep',
    durationDays: 16,
    predecessorIds: ['substructure_columns'],
    leadTimeWeeks: 3,
    isDomesticProcurement: true,
    monsoonSensitive: true,
  },
  {
    id: 'drywall_partitions',
    name: '450mm False Ceiling Plenum & STC 56 Drywall Partitions',
    tradePackage: 'drywall_ceiling',
    durationDays: 7,
    predecessorIds: ['mep_roughins'],
    leadTimeWeeks: 2,
    isDomesticProcurement: true,
    monsoonSensitive: true,
  },
  {
    id: 'procurement_italian_marble',
    name: 'Imported Italian Statuario Marble Sourcing & Transoceanic Shipping',
    tradePackage: 'procurement',
    durationDays: 112, // 16 weeks = 112 days lead time
    predecessorIds: ['substructure_columns'],
    leadTimeWeeks: 16,
    isDomesticProcurement: false,
    monsoonSensitive: false,
  },
  {
    id: 'flooring_installation_screed',
    name: 'Subfloor Screed Curing & Natural Stone Flooring Installation',
    tradePackage: 'finishes',
    durationDays: 18,
    predecessorIds: ['drywall_partitions', 'procurement_italian_marble'],
    leadTimeWeeks: 0,
    isDomesticProcurement: false,
    monsoonSensitive: true,
  },
  {
    id: 'woodwork_joinery_is287',
    name: 'Custom Architectural Millwork & IS 287 Kiln-Dried Timber Joinery',
    tradePackage: 'millwork',
    durationDays: 15,
    predecessorIds: ['flooring_installation_screed'],
    leadTimeWeeks: 6,
    isDomesticProcurement: true,
    monsoonSensitive: true,
  },
  {
    id: 'turnkey_handover',
    name: 'MEP Testing, Circadian Lighting Commissioning & Final Turnkey Handover',
    tradePackage: 'commissioning',
    durationDays: 8,
    predecessorIds: ['woodwork_joinery_is287'],
    leadTimeWeeks: 2,
    isDomesticProcurement: true,
    monsoonSensitive: false,
  },
];

/**
 * Calculates Critical Path Method (CPM) Forward and Backward Pass.
 *
 * Mathematical Invariants:
 * - Forward Pass: Early Start (ES) = max(EF of predecessors), Early Finish (EF) = ES + Duration
 * - Backward Pass: Late Finish (LF) = min(LS of successors), Late Start (LS) = LF - Duration
 * - Total Float: TF = LS - ES = LF - EF
 * - Critical Path: Tasks with TF = 0
 */
export function calculateCPM(tasksInput: GanttTask[]): {
  tasks: GanttTask[];
  totalDurationDays: number;
  criticalPath: string[];
} {
  if (!tasksInput || tasksInput.length === 0) {
    return { tasks: [], totalDurationDays: 0, criticalPath: [] };
  }

  const tasks: GanttTask[] = JSON.parse(JSON.stringify(tasksInput));
  const taskMap = new Map<string, GanttTask>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  // --- Kahn's Topological Sorting Algorithm & Cycle Detection ---
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const task of tasks) {
    inDegree.set(task.id, 0);
    adj.set(task.id, []);
  }

  for (const task of tasks) {
    const uniquePreds = Array.from(new Set(task.predecessorIds));
    for (const predId of uniquePreds) {
      if (taskMap.has(predId)) {
        adj.get(predId)!.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const task of tasks) {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
    }
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    topoOrder.push(currId);

    const neighbors = adj.get(currId) || [];
    for (const neighborId of neighbors) {
      const remainingInDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, remainingInDegree);
      if (remainingInDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // Cycle detection: If topoOrder does not include all tasks, a cycle exists
  if (topoOrder.length < tasks.length) {
    throw new Error('Cyclic dependency detected in construction schedule');
  }

  // --- Forward Pass: Calculate Early Start (ES) & Early Finish (EF) ---
  for (const taskId of topoOrder) {
    const task = taskMap.get(taskId)!;
    let maxPredecessorEF = 0;
    for (const predId of task.predecessorIds) {
      const pred = taskMap.get(predId);
      if (pred && pred.earlyFinishDay !== undefined) {
        maxPredecessorEF = Math.max(maxPredecessorEF, pred.earlyFinishDay);
      }
    }
    task.earlyStartDay = maxPredecessorEF;
    task.earlyFinishDay = maxPredecessorEF + task.durationDays;
  }

  // Total project duration is max EF
  const totalDurationDays = Math.max(0, ...tasks.map((t) => t.earlyFinishDay ?? 0));

  // --- Backward Pass: Calculate Late Start (LS) & Late Finish (LF) ---
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const taskId = topoOrder[i];
    const task = taskMap.get(taskId)!;
    const successors = adj.get(taskId) || [];

    if (successors.length === 0) {
      task.lateFinishDay = totalDurationDays;
      task.lateStartDay = totalDurationDays - task.durationDays;
    } else {
      let minSuccessorLS = Infinity;
      for (const succId of successors) {
        const succ = taskMap.get(succId);
        if (succ && succ.lateStartDay !== undefined) {
          minSuccessorLS = Math.min(minSuccessorLS, succ.lateStartDay);
        }
      }
      task.lateFinishDay = minSuccessorLS;
      task.lateStartDay = minSuccessorLS - task.durationDays;
    }

    // Total Float (TF) = LS - ES = LF - EF
    task.totalFloatDays = (task.lateStartDay ?? 0) - (task.earlyStartDay ?? 0);
    task.isCritical = task.totalFloatDays === 0;
  }

  const criticalPath = tasks.filter((t) => t.isCritical).map((t) => t.id);

  return {
    tasks,
    totalDurationDays,
    criticalPath,
  };
}

/**
 * Applies Value Engineering Lead-Time Compression.
 * E.g., Italian Marble -> Kota Stone compresses lead time from 16 wks to 2 wks (-14 weeks / -98 days).
 */
export function applyValueEngineeringCompression(
  tasks: GanttTask[],
  swaps: ValueEngineeringSwap[]
): GanttTask[] {
  const updatedTasks: GanttTask[] = JSON.parse(JSON.stringify(tasks));

  for (const swap of swaps) {
    if (swap.tradeId === 'finishes' || swap.tradeId === 'T500' || swap.tradeId === 've_flooring_kajaria_kota') {
      const stoneTask = updatedTasks.find((t) => t.id === 'T500');
      if (stoneTask) {
        stoneTask.name = `Natural Stone Flooring (${swap.proposedMaterial})`;
        stoneTask.leadTimeWeeks = Math.max(2, stoneTask.leadTimeWeeks - swap.leadTimeReductionWeeks);
        stoneTask.isDomesticProcurement = true;
        // Faster procurement eliminates 3 days of international staging
        stoneTask.durationDays = Math.max(14, stoneTask.durationDays - 3);
      }
    }
  }

  return calculateCPM(updatedTasks).tasks;
}

/**
 * Applies the canonical `ve_flooring_kajaria_kota` Value Engineering substitution
 * to the baseline 177-day EPC schedule, collapsing the critical path to 88 days.
 *
 * Mathematical Proof:
 * - Baseline duration: 177 calendar days (critical path via 112d imported marble).
 * - Sourcing collapses from 112 days (16 weeks) to 14 days (2 weeks domestic Rajasthan quarry supply).
 * - Lead time saved = 112 - 14 = 98 calendar days (14 weeks).
 * - Overall project critical path collapses:
 *   Substructure (24d) + MEP (16d) + Drywall (7d) = Day 47.
 *   Domestic Kota stone arrives on Day 38 (Day 24 + 14d), so flooring starts immediately on Day 47!
 *   Day 47 + 18d (Flooring) + 15d (Woodwork) + 8d (Handover) = 88 calendar days (<= 90 days threshold).
 */
export function applyVEFlooringSubstitution(
  customTasks?: GanttTask[]
): {
  tasks: GanttTask[];
  cpm: ReturnType<typeof calculateCPM>;
  weeksSaved: number;
  daysSaved: number;
  totalDurationDays: number;
  criticalPath: string[];
  isTurnkeyHandoverCompliant: boolean; // <= 90 days
} {
  const baseList = customTasks || BASELINE_EPC_177_TASKS;
  const tasks: GanttTask[] = JSON.parse(JSON.stringify(baseList));

  // Find the procurement task
  const procTask = tasks.find(
    (t) => t.id === 'procurement_italian_marble' || t.tradePackage === 'procurement'
  );

  const originalProcDuration = procTask ? procTask.durationDays : 112;
  const newProcDuration = 14; // Domestic Rajasthan Honed Kota Stone / Kajaria PGVT

  if (procTask) {
    procTask.id = 'procurement_domestic_kota';
    procTask.name = 'Domestic Rajasthan Honed Kota Stone / Kajaria PGVT Quarry Delivery';
    procTask.durationDays = newProcDuration; // Collapses from 112 days to 14 days (saving 98 days / 14 weeks)
    procTask.leadTimeWeeks = 2;
    procTask.isDomesticProcurement = true;
  }

  // Update flooring installation dependencies if needed
  const flooringTask = tasks.find((t) => t.id === 'flooring_installation_screed');
  if (flooringTask && procTask) {
    flooringTask.predecessorIds = ['drywall_partitions', procTask.id];
    flooringTask.name = 'Subfloor Screed Curing & Honed Kota Stone / Kajaria Tile Installation';
    flooringTask.isDomesticProcurement = true;
  }

  const cpm = calculateCPM(tasks);
  const daysSaved = procTask ? originalProcDuration - procTask.durationDays : 0;
  const weeksSaved = Math.round(daysSaved / 7);

  return {
    tasks: cpm.tasks,
    cpm,
    weeksSaved,
    daysSaved,
    totalDurationDays: cpm.totalDurationDays, // 88 days
    criticalPath: cpm.criticalPath,
    isTurnkeyHandoverCompliant: cpm.totalDurationDays <= 90,
  };
}

/**
 * Assesses Regional Monsoon Weather Risk for Delhi-NCR (July to September).
 * Preserves backwards compatibility with existing signature.
 */
export function assessMonsoonRisk(
  startMonth: number, // 1 = January, 7 = July
  scheduleDurationDays: number
): MonsoonRiskAssessment {
  const durationMonths = Math.ceil(scheduleDurationDays / 30);
  const endMonth = ((startMonth - 1 + durationMonths) % 12) + 1;

  let monsoonOverlapDays = 0;
  for (let m = 0; m < durationMonths; m++) {
    const curMonth = ((startMonth - 1 + m) % 12) + 1;
    if (curMonth === 7 || curMonth === 8 || curMonth === 9) {
      monsoonOverlapDays += 20; // active heavy rain days
    }
  }

  const isMonsoonImpacted = monsoonOverlapDays > 0;
  const guidelines: string[] = [];

  if (isMonsoonImpacted) {
    guidelines.push(
      `MONSOON ALERT (Delhi-NCR July-Sept): ${monsoonOverlapDays} high-humidity days overlap with construction execution.`
    );
    guidelines.push(
      'IS 287 TIMBER JOINERY RISK: Wood doors/frames must be factory kiln-dried to 8-12% EMC. Apply primer sealant on all 6 sides before on-site delivery to prevent warping/jamming.'
    );
    guidelines.push(
      'SCREED MOISTURE RISK: Measure screed relative humidity (< 75% RH via calcium carbide / hygrometer) prior to laying natural stone or parquet to prevent efflorescence and adhesive debonding.'
    );
    guidelines.push(
      'WEATHER CONTINGENCY: Add an 8-day buffer to civil wet trades and interior plastering drying cycles.'
    );
  } else {
    guidelines.push(
      'Favorable construction window. Dry season allows standard drying cycles and zero moisture delay risk.'
    );
  }

  return {
    scheduledStartMonth: startMonth,
    scheduledEndMonth: endMonth,
    monsoonOverlapDays,
    isMonsoonImpacted,
    joineryEMCRisk: isMonsoonImpacted,
    screedMoistureRisk: isMonsoonImpacted,
    recommendedWeatherBufferDays: isMonsoonImpacted ? 8 : 0,
    mitigationGuidelines: guidelines,
  };
}

/**
 * Detailed Task-Level Monsoon Risk & IS 287 Humidity Audit.
 *
 * Checks scheduled task dates against the Delhi-NCR monsoon window:
 * - Monsoon Window: July 1 (Day 182) to September 15 (Day 258).
 * - Relative humidity in Delhi-NCR during this window reaches >= 95%.
 *
 * Vulnerable Tasks:
 * 1. `flooring_installation_screed`: Screed efflorescence, damp trap, adhesive debonding.
 *    Mitigation: Enforce IS 15477 C2TE S1 polymer adhesive, moisture barrier primer, screed RH < 75%.
 * 2. `woodwork_joinery_is287`: Timber swelling, warping, and mold growth.
 *    Mitigation: Enforce BWP 710 marine plywood backer, 2mm expansion reveals, factory kiln-drying to 8-12% EMC.
 */
export function checkMonsoonTaskAlerts(
  tasks: GanttTask[],
  projectStart: Date | string | { month: number; day: number } = { month: 6, day: 15 } // Default: June 15 start
): MonsoonTaskAlert[] {
  let startDayOfYear: number;

  if (typeof projectStart === 'object' && 'month' in projectStart && 'day' in projectStart) {
    // Approximate day of year
    const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    startDayOfYear = daysBeforeMonth[projectStart.month - 1] + projectStart.day;
  } else {
    const d = typeof projectStart === 'string' ? new Date(projectStart) : projectStart;
    const startOfYr = new Date(d.getFullYear(), 0, 1);
    startDayOfYear = Math.floor((d.getTime() - startOfYr.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  // Delhi-NCR Monsoon Window: July 1 (Day 182) to Sept 15 (Day 258)
  const MONSOON_START_DOY = 182; // July 1
  const MONSOON_END_DOY = 258;   // September 15

  const alerts: MonsoonTaskAlert[] = [];

  for (const task of tasks) {
    const es = task.earlyStartDay ?? 0;
    const ef = task.earlyFinishDay ?? (es + task.durationDays);

    const taskStartDoy = (startDayOfYear + es) % 365;
    const taskEndDoy = (startDayOfYear + ef) % 365;

    // Check overlap with July 1 - Sept 15
    const overlapsMonsoon =
      (taskStartDoy <= MONSOON_END_DOY && taskEndDoy >= MONSOON_START_DOY) ||
      (taskStartDoy >= MONSOON_START_DOY && taskStartDoy <= MONSOON_END_DOY) ||
      (taskEndDoy >= MONSOON_START_DOY && taskEndDoy <= MONSOON_END_DOY);

    if (overlapsMonsoon && task.monsoonSensitive) {
      if (task.id === 'flooring_installation_screed' || task.tradePackage === 'finishes') {
        alerts.push({
          taskId: task.id,
          taskName: task.name,
          riskLevel: 'high',
          relativeStartDay: es,
          relativeEndDay: ef,
          message:
            'IS 15477 Screed & Efflorescence Moisture Alert: 95% RH during Delhi-NCR monsoon prevents subfloor screed moisture dissipation, risking damp traps and marble debonding.',
          statutoryMitigation:
            'Enforce IS 15477 C2TE S1 polymer adhesive, apply liquid moisture-barrier primer, and mandate calcium carbide / relative humidity testing (< 75% RH) before laying stone.',
          codeCitation: 'IS 15477:2019 Type 2 / C2TE S1 | CPWD DSR 11.36.1',
        });
      }

      if (task.id === 'woodwork_joinery_is287' || task.tradePackage === 'millwork') {
        alerts.push({
          taskId: task.id,
          taskName: task.name,
          riskLevel: 'high',
          relativeStartDay: es,
          relativeEndDay: ef,
          message:
            'IS 287 (8–12% Equilibrium Moisture Content) Humidity Alert: 95% ambient RH causes severe timber swelling, jamb jamming, and panel warping during turnkey installation.',
          statutoryMitigation:
            'Enforce BWP 710 marine plywood backer, incorporate 2mm expansion reveals at all architectural joints, and verify factory kiln-drying to 8–12% EMC before site delivery.',
          codeCitation: 'IS 287:1993 Kiln-Drying EMC | IS 710 Marine Grade',
        });
      }
    }
  }

  return alerts;
}

/**
 * Generates Enriched IFC4 LOD 300 & COBie Architectural Schedule records.
 */
export function generateIFC4LOD300Records(roomCount: number = 4): IFCPropertyRecord[] {
  const targetCount = Math.max(4, Math.round(Number(roomCount) || 4));

  const records: IFCPropertyRecord[] = [
    {
      guid: '3a1b4c-ifc-wall-001',
      entityType: 'IfcWall',
      name: 'High-Performance Acoustic Party Wall',
      material: 'Gyproc SoundStop Double Skin with Rockwool 48kg/m³',
      fireRating: 'FD 120 (2-Hour Fire Resistance)',
      acousticSTC: 58,
      uValueW_m2K: 0.35, // Complies with U = 0.35 W/m²K
      cpwdItemCode: 'CPWD 13.48.2',
      cobieStage: 'LOD 300 Turnkey',
    },
    {
      guid: '3a1b4c-ifc-door-001',
      entityType: 'IfcDoor',
      name: 'Emergency Egress Fire Rated Exit Door',
      material: 'Galvanized Steel Core with Mineral Wool Infill',
      fireRating: 'FD 120 (120 Minutes per NBC 2016 Part 4 Table 1)',
      acousticSTC: 44,
      uValueW_m2K: 1.20,
      cpwdItemCode: 'CPWD 9.102',
      cobieStage: 'LOD 300 Turnkey',
    },
    {
      guid: '3a1b4c-ifc-col-001',
      entityType: 'IfcColumn',
      name: 'RC Column 450x600mm Zone IV Earthquake Resistant',
      material: 'M30 Grade Concrete with Fe500D Reinforcement (IS 13920)',
      fireRating: 'FD 180 (3-Hour Structural Resistance)',
      acousticSTC: 62,
      uValueW_m2K: 2.10,
      cpwdItemCode: 'CPWD 5.1.2',
      cobieStage: 'LOD 300 Turnkey',
    },
    {
      guid: '3a1b4c-ifc-slab-001',
      entityType: 'IfcSlab',
      name: 'Two-Way Continuous Floor Slab with 450mm False Ceiling Void',
      material: 'M25 Reinforced Concrete 175mm + Armstrong Acoustic Baffles',
      fireRating: 'FD 120',
      acousticSTC: 56,
      uValueW_m2K: 0.45,
      cpwdItemCode: 'CPWD 5.2.1',
      cobieStage: 'LOD 300 Turnkey',
    },
  ];

  for (let i = 5; i <= targetCount; i++) {
    records.push({
      guid: `3a1b4c-ifc-space-${String(i).padStart(3, '0')}`,
      entityType: 'IfcSpace',
      name: `Habitable Spatial Zone Room ${i}`,
      material: 'IS 287 Timber Joinery & STC 56 Acoustic Decoupled Enclosure',
      fireRating: 'FD 120 (2-Hour Fire Resistance)',
      acousticSTC: 56,
      uValueW_m2K: 0.35,
      cpwdItemCode: 'CPWD 13.48.2',
      cobieStage: 'LOD 300 Turnkey',
    });
  }

  return records;
}

/**
 * Exports IFC4/COBie property data to CSV format.
 */
export function exportCOBieScheduleCSV(records: IFCPropertyRecord[]): string {
  const headers = [
    'IFC GUID',
    'Entity Type',
    'Component Name',
    'Material Specification',
    'Fire Rating (NBC 2016)',
    'Acoustic STC',
    'Thermal U-Value (W/m²K)',
    'CPWD DSR 2024 Code',
    'BIM LOD Stage',
  ];

  const rows = records.map((r) => [
    r.guid,
    r.entityType,
    `"${r.name}"`,
    `"${r.material}"`,
    `"${r.fireRating}"`,
    r.acousticSTC,
    r.uValueW_m2K,
    r.cpwdItemCode || 'N/A',
    r.cobieStage,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

