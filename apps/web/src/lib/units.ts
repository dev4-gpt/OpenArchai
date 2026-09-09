// Canonical storage is always meters (matches services/ml/reconstruct.py's
// math) -- this is purely an input/display convenience for the two markets
// PDCO cares about: India (metric) and the US (imperial).

export type UnitSystem = "metric" | "imperial";

const METERS_PER_FOOT = 0.3048;

export function feetInchesToMeters(feet: number, inches: number): number {
  return (feet + inches / 12) * METERS_PER_FOOT;
}

export function metersToFeetInches(meters: number): { feet: number; inches: number } {
  const totalFeet = meters / METERS_PER_FOOT;
  const feet = Math.floor(totalFeet);
  const inches = Math.round((totalFeet - feet) * 12);
  return inches === 12 ? { feet: feet + 1, inches: 0 } : { feet, inches };
}

export function formatLength(meters: number, unitSystem: UnitSystem): string {
  if (unitSystem === "metric") return `${meters.toFixed(2)} m`;
  const { feet, inches } = metersToFeetInches(meters);
  return `${feet}' ${inches}"`;
}

// Decimal (not feet+inches-pair) conversions -- for editing many numeric
// fields at once (e.g. a review UI's wall coordinates), a single decimal
// number per field is far more usable than a feet+inches pair per field.
// Decimal feet is also the standard convention for CAD/civil coordinate
// entry in imperial contexts, so this isn't a shortcut, just the right unit
// for this kind of value (as opposed to a callout like a door width, where
// feet+inches is the norm -- see feetInchesToMeters above).
export function metersToUnit(meters: number, unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? meters : meters / METERS_PER_FOOT;
}

export function unitToMeters(value: number, unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? value : value * METERS_PER_FOOT;
}

export function unitLabel(unitSystem: UnitSystem): string {
  return unitSystem === "metric" ? "m" : "ft";
}
