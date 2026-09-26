/**
 * Automated Statutory NBC 2016 Canvas Geometry Linter.
 *
 * Implements architectural pre-check linting for 2D CAD floor plans against:
 * 1. NBC 2016 Part 4 Table 2:
 *    - Doorway clear width pinch-points (<0.90m for internal residential passage / egress, <1.20m for common).
 *    - Corridor clear width pinch-points (<0.90m private spine, <1.20m common corridor).
 * 2. NBC 2016 Part 4 Clause 4.6:
 *    - Dead-end corridor circulation pockets (>6.0m absolute maximum statutory limit).
 */

import type { FloorPlan, Point, Door, Wall, Room } from "@/components/floor-plan-editor/types";
import { NBC, verifyDeadEnd } from "./nbc-egress";

// ---------------------------------------------------------------------------
// Interface Contracts (PROJECT.md §Interface Contracts & Survey Report §6)
// ---------------------------------------------------------------------------

export type LinterIssueType = "door_pinch" | "corridor_pinch" | "dead_end";
export type LinterSeverity = "error" | "warning";

export interface LinterIssue {
  id: string;
  type: LinterIssueType;
  severity: LinterSeverity;
  location: Point;
  position: Point; // alias for location
  elementId?: string;
  actualWidthM?: number;
  requiredWidthM?: number;
  deadEndLengthM?: number;
  currentValue: number;
  requiredValue: number;
  unit: string;
  title: string;
  clause: string; // e.g. "NBC 2016 Part 4 Table 2" | "NBC 2016 Part 4 Cl. 4.6"
  message: string;
  remediation: string;
}

export type GeometryLintIssue = LinterIssue;

export interface LinterOptions {
  isCommonCorridor?: boolean;
  minDoorWidthM?: number;
  minCorridorWidthM?: number;
  maxDeadEndM?: number;
}

export interface LinterSummary {
  total: number;
  errors: number;
  warnings: number;
  isCompliant: boolean;
  issues: LinterIssue[];
}

// ---------------------------------------------------------------------------
// Statutory Constants
// ---------------------------------------------------------------------------

export const STATUTORY_THRESHOLDS = {
  MIN_INTERNAL_DOOR_WIDTH_M: NBC.MIN_INTERNAL_PASSAGE_WIDTH_M, // 0.90m (NBC Part 4 Table 2)
  MIN_COMMON_CORRIDOR_WIDTH_M: NBC.MIN_CORRIDOR_CLEAR_WIDTH_M, // 1.20m (NBC Part 4 Table 2)
  MIN_INTERNAL_CORRIDOR_WIDTH_M: NBC.MIN_INTERNAL_PASSAGE_WIDTH_M, // 0.90m (NBC Part 4 Table 2)
  MIN_BATH_DOOR_CLEAR_WIDTH_M: 0.75, // Absolute minimum for bath/WC threshold
  MAX_DEAD_END_CORRIDOR_M: NBC.MAX_DEAD_END_M, // 6.0m (NBC Part 4 Cl. 4.6)
} as const;

// ---------------------------------------------------------------------------
// Helper Geometric Functions
// ---------------------------------------------------------------------------

function dist(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Formats a measurement with adaptive precision to prevent contradictory
 * rounded strings like "0.90m < 0.90m min" or "1.20m < 1.20m min".
 */
function formatMeasurement(value: number, threshold: number): string {
  const formatted2 = value.toFixed(2);
  const thresh2 = threshold.toFixed(2);
  if (value < threshold && formatted2 >= thresh2) {
    return value.toFixed(3);
  }
  if (Math.abs(value - threshold) < 0.01 && (value.toString().split('.')[1]?.length ?? 0) >= 3) {
    return value.toFixed(3);
  }
  return formatted2;
}

/**
 * Formats an upper-bound length with adaptive precision to prevent contradictory
 * strings like "6.0m > 6.0m max".
 */
function formatLength(value: number, threshold: number): string {
  const formatted1 = value.toFixed(1);
  const thresh1 = threshold.toFixed(1);
  if (value > threshold && formatted1 <= thresh1) {
    return value.toFixed(2);
  }
  return formatted1;
}

// ---------------------------------------------------------------------------
// Rule Check 1: Doorway Clear Width Pinch-Points (NBC 2016 Part 4 Table 2)
// ---------------------------------------------------------------------------

export function checkDoorClearances(
  doors: Door[] = [],
  options: LinterOptions = {},
): LinterIssue[] {
  const issues: LinterIssue[] = [];
  const requiredWidth = options.minDoorWidthM ?? (
    options.isCommonCorridor
      ? STATUTORY_THRESHOLDS.MIN_COMMON_CORRIDOR_WIDTH_M
      : STATUTORY_THRESHOLDS.MIN_INTERNAL_DOOR_WIDTH_M
  );

  for (const door of doors) {
    if (door.width < requiredWidth) {
      const isCritical = door.width < STATUTORY_THRESHOLDS.MIN_BATH_DOOR_CLEAR_WIDTH_M;
      const severity: LinterSeverity = isCritical ? "error" : "warning";
      const clause = "NBC 2016 Part 4 Table 2";
      const actualFormatted = formatMeasurement(door.width, requiredWidth);
      const message = `NBC 2016 Part 4 Table 2: Clear width ${actualFormatted}m < ${requiredWidth.toFixed(2)}m min`;
      const remediation = `Widen doorway opening to ≥ ${requiredWidth.toFixed(2)}m (currently ${actualFormatted}m) to comply with NBC 2016 Part 4 Table 2 egress width standards.`;

      issues.push({
        id: `pinch_${door.id}`,
        type: "door_pinch",
        severity,
        location: { x: door.position.x, y: door.position.y },
        position: { x: door.position.x, y: door.position.y },
        elementId: door.id,
        actualWidthM: door.width,
        requiredWidthM: requiredWidth,
        currentValue: door.width,
        requiredValue: requiredWidth,
        unit: "m",
        title: "Doorway Clearance Pinch-Point",
        clause,
        message,
        remediation,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule Check 2: Corridor Clearance Pinch-Points (NBC 2016 Part 4 Table 2)
// ---------------------------------------------------------------------------

export function checkCorridorClearances(
  walls: Wall[] = [],
  options: LinterOptions = {},
): LinterIssue[] {
  const issues: LinterIssue[] = [];
  const requiredCorridorWidth = options.minCorridorWidthM ?? (
    options.isCommonCorridor
      ? STATUTORY_THRESHOLDS.MIN_COMMON_CORRIDOR_WIDTH_M
      : STATUTORY_THRESHOLDS.MIN_INTERNAL_CORRIDOR_WIDTH_M
  );

  // Analyze pairs of walls to detect narrow circulation corridors (orthogonal and diagonal)
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const w1 = walls[i];
      const w2 = walls[j];

      const dx1 = w1.end.x - w1.start.x;
      const dy1 = w1.end.y - w1.start.y;
      const len1 = Math.hypot(dx1, dy1);

      const dx2 = w2.end.x - w2.start.x;
      const dy2 = w2.end.y - w2.start.y;
      const len2 = Math.hypot(dx2, dy2);

      if (len1 < 0.1 || len2 < 0.1) continue;

      const u1x = dx1 / len1;
      const u1y = dy1 / len1;
      const u2x = dx2 / len2;
      const u2y = dy2 / len2;

      // Parallelism check: |u1 · u2| > 0.95
      const dot = u1x * u2x + u1y * u2y;
      if (Math.abs(dot) < 0.95) continue;

      // Normal unit vector to wall 1
      const nx = -u1y;
      const ny = u1x;

      // Perpendicular center-to-center distance from w2 to line of w1
      const perpDist = Math.abs((w2.start.x - w1.start.x) * nx + (w2.start.y - w1.start.y) * ny);
      const clearWidth = perpDist - (w1.thickness / 2 + w2.thickness / 2);

      // Check longitudinal overlap along wall 1 axis
      const p1Start = 0;
      const p1End = len1;

      const p2Start = (w2.start.x - w1.start.x) * u1x + (w2.start.y - w1.start.y) * u1y;
      const p2End = (w2.end.x - w1.start.x) * u1x + (w2.end.y - w1.start.y) * u1y;

      const min2 = Math.min(p2Start, p2End);
      const max2 = Math.max(p2Start, p2End);

      const overlapStart = Math.max(p1Start, min2);
      const overlapEnd = Math.min(p1End, max2);
      const overlapLen = overlapEnd - overlapStart;

      // Detect corridor passage segment (clearWidth >= 0.05m to capture severe pinches < 0.25m)
      if (overlapLen >= 0.5 && clearWidth >= 0.05 && clearWidth < requiredCorridorWidth) {
        const midParam = (overlapStart + overlapEnd) / 2;
        const pt1x = w1.start.x + midParam * u1x;
        const pt1y = w1.start.y + midParam * u1y;

        const signedDist = (w2.start.x - w1.start.x) * nx + (w2.start.y - w1.start.y) * ny;
        const pt2x = pt1x + signedDist * nx;
        const pt2y = pt1y + signedDist * ny;

        const locX = Math.round(((pt1x + pt2x) / 2) * 100) / 100;
        const locY = Math.round(((pt1y + pt2y) / 2) * 100) / 100;

        const actualW = Math.round(clearWidth * 1000) / 1000;
        const actualFormatted = formatMeasurement(clearWidth, requiredCorridorWidth);

        issues.push({
          id: `corridor_pinch_${w1.id}_${w2.id}`,
          type: "corridor_pinch",
          severity: actualW < 0.75 ? "error" : "warning",
          location: { x: locX, y: locY },
          position: { x: locX, y: locY },
          elementId: w1.id,
          actualWidthM: actualW,
          requiredWidthM: requiredCorridorWidth,
          currentValue: actualW,
          requiredValue: requiredCorridorWidth,
          unit: "m",
          title: "Corridor Clearance Pinch-Point",
          clause: "NBC 2016 Part 4 Table 2",
          message: `NBC 2016 Part 4 Table 2: Corridor clear width ${actualFormatted}m < ${requiredCorridorWidth.toFixed(2)}m min`,
          remediation: `Increase clearance between walls ${w1.id} and ${w2.id} to ≥ ${requiredCorridorWidth.toFixed(2)}m.`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Rule Check 3: Dead-End Corridor Pockets (NBC 2016 Part 4 Cl. 4.6)
// ---------------------------------------------------------------------------

export function checkDeadEndCorridors(
  plan: FloorPlan,
  options: LinterOptions = {},
): LinterIssue[] {
  const issues: LinterIssue[] = [];
  const maxDeadEnd = options.maxDeadEndM ?? STATUTORY_THRESHOLDS.MAX_DEAD_END_CORRIDOR_M; // 6.0m
  const rooms = plan.rooms || [];
  const doors = plan.doors || [];

  for (const room of rooms) {
    if (!room.vertices || room.vertices.length < 3) continue;

    // Check if room represents a corridor, passage, aisle, or long circulation pocket
    const isCorridorLabel = /corridor|hall|passage|spine|circulation|aisle/i.test(room.label);

    // Compute bounding box dimensions and aspect ratio
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of room.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const length = Math.max(spanX, spanY);
    const width = Math.min(spanX, spanY);
    const aspectRatio = width > 0 ? length / width : 1;

    // A space qualifies as an egress circulation passage if labeled as such or has long narrow geometry
    if (isCorridorLabel || (aspectRatio >= 2.5 && room.area < 40)) {
      // Find doors accessing this room
      const roomDoors = doors.filter((d) => {
        // Within 0.4m of room bounding box
        return (
          d.position.x >= minX - 0.4 &&
          d.position.x <= maxX + 0.4 &&
          d.position.y >= minY - 0.4 &&
          d.position.y <= maxY + 0.4
        );
      });

      // Case A: 0 doors -> Trapped circulation / Disconnected corridor
      if (roomDoors.length === 0) {
        const center = {
          x: Math.round(((minX + maxX) / 2) * 100) / 100,
          y: Math.round(((minY + maxY) / 2) * 100) / 100,
        };
        const actualLen = Math.round(length * 10) / 10;
        issues.push({
          id: `trapped_circulation_${room.id}`,
          type: "dead_end",
          severity: "error",
          location: center,
          position: center,
          elementId: room.id,
          deadEndLengthM: actualLen,
          currentValue: actualLen,
          requiredValue: 0,
          unit: "m",
          title: "Trapped Circulation / Disconnected Corridor",
          clause: "NBC 2016 Part 4 Cl. 4.6",
          message: `NBC 2016 Part 4 Cl. 4.6: Corridor "${room.label}" has 0 access doors (trapped circulation).`,
          remediation: `Provide egress access doors connecting corridor ${room.id} to adjacent rooms or building exits.`,
        });
      } else if (roomDoors.length === 1) {
        // Case B: Exactly 1 door -> Dead-end corridor
        const exitDoor = roomDoors[0];
        // Calculate max retreat distance from any point in the corridor to the only exit
        let maxRetreatDist = 0;
        let furthestVertex: Point = room.vertices[0];

        for (const v of room.vertices) {
          const d = dist(v, exitDoor.position);
          if (d > maxRetreatDist) {
            maxRetreatDist = d;
            furthestVertex = v;
          }
        }

        if (maxRetreatDist > maxDeadEnd) {
          const actualLen = Math.round(maxRetreatDist * 100) / 100;
          const formattedLen = formatLength(actualLen, maxDeadEnd);
          issues.push({
            id: `dead_end_${room.id}`,
            type: "dead_end",
            severity: actualLen > 7.5 ? "error" : "warning",
            location: { x: furthestVertex.x, y: furthestVertex.y },
            position: { x: furthestVertex.x, y: furthestVertex.y },
            elementId: room.id,
            deadEndLengthM: actualLen,
            currentValue: actualLen,
            requiredValue: maxDeadEnd,
            unit: "m",
            title: "Dead-End Corridor Exceeds Statutory Limit",
            clause: "NBC 2016 Part 4 Cl. 4.6",
            message: `NBC 2016 Part 4 Cl. 4.6: Dead-end corridor ${formattedLen}m > ${maxDeadEnd.toFixed(1)}m max`,
            remediation: `Provide a secondary exit or reduce dead-end circulation depth from ${formattedLen}m to ≤ ${maxDeadEnd.toFixed(1)}m.`,
          });
        }
      } else {
        // Case C: Multiple doors -> Check for dead-end pockets along corridor axis
        const isLongY = spanY >= spanX;
        const doorCoords = roomDoors.map((d) => (isLongY ? d.position.y : d.position.x));
        const minDoorCoord = Math.min(...doorCoords);
        const maxDoorCoord = Math.max(...doorCoords);

        const pocketLow = isLongY ? minDoorCoord - minY : minDoorCoord - minX;
        const pocketHigh = isLongY ? maxY - maxDoorCoord : maxX - maxDoorCoord;

        const maxPocket = Math.max(pocketLow, pocketHigh);
        if (maxPocket > maxDeadEnd) {
          let furthestVertex: Point = room.vertices[0];
          let maxDistToNearestDoor = 0;
          for (const v of room.vertices) {
            let minD = Infinity;
            for (const d of roomDoors) {
              const distance = dist(v, d.position);
              if (distance < minD) minD = distance;
            }
            if (minD > maxDistToNearestDoor) {
              maxDistToNearestDoor = minD;
              furthestVertex = v;
            }
          }

          const actualLen = Math.round(maxDistToNearestDoor * 100) / 100;
          const formattedLen = formatLength(actualLen, maxDeadEnd);
          issues.push({
            id: `dead_end_${room.id}_pocket`,
            type: "dead_end",
            severity: actualLen > 7.5 ? "error" : "warning",
            location: { x: furthestVertex.x, y: furthestVertex.y },
            position: { x: furthestVertex.x, y: furthestVertex.y },
            elementId: room.id,
            deadEndLengthM: actualLen,
            currentValue: actualLen,
            requiredValue: maxDeadEnd,
            unit: "m",
            title: "Dead-End Corridor Exceeds Statutory Limit",
            clause: "NBC 2016 Part 4 Cl. 4.6",
            message: `NBC 2016 Part 4 Cl. 4.6: Dead-end corridor pocket ${formattedLen}m > ${maxDeadEnd.toFixed(1)}m max`,
            remediation: `Provide a secondary exit or reduce dead-end circulation depth from ${formattedLen}m to ≤ ${maxDeadEnd.toFixed(1)}m.`,
          });
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main Composite Linter Function
// ---------------------------------------------------------------------------

/**
 * Executes full statutory NBC 2016 geometric linting on a 2D floor plan.
 *
 * @param plan Floor plan data structure containing walls, doors, windows, and rooms
 * @param optionsOrCommonCorridor Linter options object or boolean flag for common corridor mode
 * @returns Array of structured compliance linter issues
 */
export function lintFloorPlanGeometry(
  plan: FloorPlan,
  optionsOrCommonCorridor?: LinterOptions | boolean,
): LinterIssue[] {
  if (!plan) return [];

  const options: LinterOptions =
    typeof optionsOrCommonCorridor === "boolean"
      ? { isCommonCorridor: optionsOrCommonCorridor }
      : optionsOrCommonCorridor || {};

  const doorIssues = checkDoorClearances(plan.doors || [], options);
  const corridorIssues = checkCorridorClearances(plan.walls || [], options);
  const deadEndIssues = checkDeadEndCorridors(plan, options);

  return [...doorIssues, ...corridorIssues, ...deadEndIssues];
}

/** Alias for compatibility with e2e test suite */
export const lintPlanGeometry = lintFloorPlanGeometry;

/** Returns aggregate summary of linter issues */
export function getLinterSummary(issues: LinterIssue[]): LinterSummary {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return {
    total: issues.length,
    errors,
    warnings,
    isCompliant: issues.length === 0,
    issues,
  };
}

/** Formats a clean statutory tooltip description for UI popovers */
export function formatLinterTooltip(issue: LinterIssue): string {
  return `${issue.clause}: ${issue.message}`;
}
