"use client";

import React from "react";
import type { FloorPlan } from "@/components/floor-plan-editor/types";
import {
  SunPathAndAcoustics,
  SunPathAndAcousticsProps,
  calculateDelhiNCRSunPosition,
} from "./sun-path-and-acoustics";

export interface DaylightVastu3DProps {
  visible?: boolean;
  floorPlan?: FloorPlan;
  solarHour?: number; // 9 = Morning, 12 = Noon, 15 = Afternoon, 18 = Evening
  showAcousticCutaway?: boolean;
}

/**
 * Pillar 4: Museum Acoustics, Daylighting & Vastu Mandala 3D WebGL Visualization
 * Backwards-compatible wrapper delegating to SunPathAndAcoustics.
 */
export function DaylightVastu3D({
  visible = true,
  floorPlan,
  solarHour = 12,
  showAcousticCutaway = true,
}: DaylightVastu3DProps) {
  return (
    <SunPathAndAcoustics
      visible={visible}
      floorPlan={floorPlan}
      solarHour={solarHour}
      showAcousticCutaway={showAcousticCutaway}
      showVastuGrid={true}
      showSunTrajectory={true}
    />
  );
}

export { SunPathAndAcoustics, calculateDelhiNCRSunPosition };
export type { SunPathAndAcousticsProps };
