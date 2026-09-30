"use client";

import React from "react";
import type { FloorPlan } from "@/components/floor-plan-editor/types";
import { FireStairTower, type FireStairTowerProps } from "./fire-stair-tower";

export interface EgressFireSafety3DProps {
  visible?: boolean;
  floorPlan?: FloorPlan;
  stairWidthM?: number; // 1.50m per NBC Part 4 Table 8
  towerHeightM?: number; // 3.4m
}

/**
 * Pillar 3: Multi-Floor Egress & Fire Engineering 3D WebGL Visualization
 * Backed by the statutory FireStairTower component.
 */
export function EgressFireSafety3D({
  visible = true,
  floorPlan,
  stairWidthM = 1.50,
  towerHeightM = 3.40,
}: EgressFireSafety3DProps) {
  return (
    <FireStairTower
      visible={visible}
      floorPlan={floorPlan}
      flightWidthM={stairWidthM}
      towerHeightM={towerHeightM}
    />
  );
}

export { FireStairTower };
export default EgressFireSafety3D;
