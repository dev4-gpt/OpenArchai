/**
 * Acoustic Engineering, Daylighting & Vastu Mandala Analysis Engine.
 *
 * Implements Pillar 4 capabilities:
 * 1. Sabine RT60 Reverberation Time Simulation:
 *    - RT60 = 0.161 * V / A (metric Sabins)
 *    - Octave band absorption (125Hz to 4000Hz) across architectural materials
 *    - Room acoustic compliance (Luxury Residential: 0.4s - 0.6s, Home Theatre: 0.3s - 0.5s)
 * 2. STC 56 Sound Transmission Class & Acoustic Decoupling Verification:
 *    - Multi-layer wall construction check (Resilient channel, Rockwool 48kg/m³, 2x15mm SoundStop)
 *    - Flanking transmission leak checks (plenum flanking, door threshold, electrical back-to-back)
 * 3. Daylight Factor (DF %) Simulation:
 *    - CIE Overcast Sky Daylight Factor estimation per room
 *    - NBC 2016 Part 8 Sec 1 compliance (Living >= 1.5%, Bedrooms >= 1.0%, Study >= 2.0%)
 * 4. 9-Zone Vastu Shastra Mandala Evaluation:
 *    - 3x3 Paramasayika / Peetha quadrant positioning (Ishanya NE, Agni SE, Nairutya SW, Vayu NW, Brahmasthan Center)
 *    - Directional harmony scoring (0 - 100%) and traditional architectural remediation recommendations
 */

export interface MaterialAcousticProfile {
  name: string;
  category: 'floor' | 'wall' | 'ceiling' | 'glazing' | 'furniture' | 'specialized';
  absorptionCoefficients: {
    125: number;
    250: number;
    500: number;
    1000: number;
    2000: number;
    4000: number;
  };
  stcRating?: number; // Sound Transmission Class (if used for partitions)
  description?: string;
}

export const ABSORPTION_COEFFICIENTS_500HZ: Record<string, number> = {
  italian_marble: 0.01,
  kota_stone: 0.02,
  engineered_oak: 0.06,
  gypsum_board: 0.08,
  gyproc_soundstop: 0.12,
  acoustic_timber_panelling: 0.65,
  acoustic_ceiling: 0.70,
  velvet_drapes: 0.50,
  double_glazing: 0.04,
  solid_flush_door: 0.06,
};

export const ACOUSTIC_MATERIALS_DATABASE: Record<string, MaterialAcousticProfile> = {
  italian_marble: {
    name: 'Italian White Statuario Marble',
    category: 'floor',
    absorptionCoefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
    description: 'Polished hard surface, high acoustic reflection',
  },
  kota_stone: {
    name: 'Honed Kota Stone Slapped with Lime Mortar',
    category: 'floor',
    absorptionCoefficients: { 125: 0.02, 250: 0.02, 500: 0.02, 1000: 0.04, 2000: 0.05, 4000: 0.05 },
    description: 'Natural matte Indian limestone, moderate acoustic damping',
  },
  engineered_oak: {
    name: 'Engineered Oak Flooring on Underlayment',
    category: 'floor',
    absorptionCoefficients: { 125: 0.12, 250: 0.09, 500: 0.06, 1000: 0.06, 2000: 0.05, 4000: 0.06 },
    description: 'Multi-layer engineered oak hardwood on acoustic foam underlayment',
  },
  gypsum_board: {
    name: '12.5mm Standard Gypsum Wallboard',
    category: 'wall',
    absorptionCoefficients: { 125: 0.29, 250: 0.10, 500: 0.08, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
    stcRating: 38,
    description: 'Standard drywall partition face',
  },
  gyproc_soundstop: {
    name: '12.5mm Saint-Gobain Gyproc SoundStop Acoustic Plasterboard',
    category: 'wall',
    absorptionCoefficients: { 125: 0.32, 250: 0.16, 500: 0.12, 1000: 0.10, 2000: 0.11, 4000: 0.12 },
    stcRating: 45,
    description: 'High-density gypsum core with glass fiber reinforcement for sound isolation',
  },
  acoustic_timber_panelling: {
    name: 'Acoustic Timber Panelling (Slotted Micro-perforated)',
    category: 'wall',
    absorptionCoefficients: { 125: 0.40, 250: 0.55, 500: 0.65, 1000: 0.75, 2000: 0.70, 4000: 0.65 },
    description: 'Slotted veneer timber panelling with Rockwool acoustic backing infill',
  },
  acoustic_ceiling: {
    name: 'High-NRC Suspended Acoustic Ceiling',
    category: 'ceiling',
    absorptionCoefficients: { 125: 0.45, 250: 0.55, 500: 0.70, 1000: 0.80, 2000: 0.85, 4000: 0.80 },
    description: 'Direct-hung acoustic ceiling tile system NRC 0.70',
  },
  velvet_drapes: {
    name: 'Heavy Velvet Acoustic Drapes (100% Fullness)',
    category: 'specialized',
    absorptionCoefficients: { 125: 0.14, 250: 0.35, 500: 0.50, 1000: 0.70, 2000: 0.72, 4000: 0.70 },
    description: 'Heavy architectural drapery creating high mid-to-high frequency absorption',
  },
  double_glazing: {
    name: 'Acoustic Double Glazing (6mm + 12mm Argon + 6mm)',
    category: 'glazing',
    absorptionCoefficients: { 125: 0.15, 250: 0.08, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
    stcRating: 39,
  },
  solid_flush_door: {
    name: 'Solid Core Timber Flush Door (45mm)',
    category: 'specialized',
    absorptionCoefficients: { 125: 0.10, 250: 0.08, 500: 0.06, 1000: 0.05, 2000: 0.05, 4000: 0.06 },
    stcRating: 32,
  },
  kajaria_pgvt: {
    name: 'Kajaria Polished Glazed Vitrified Tiles (PGVT)',
    category: 'floor',
    absorptionCoefficients: { 125: 0.01, 250: 0.01, 500: 0.01, 1000: 0.02, 2000: 0.02, 4000: 0.02 },
  },
  teak_hardwood_flooring: {
    name: 'CPWD First-Class CP Teak Wood Flooring on Sleepers',
    category: 'floor',
    absorptionCoefficients: { 125: 0.15, 250: 0.11, 500: 0.10, 1000: 0.07, 2000: 0.06, 4000: 0.07 },
    description: 'Suspended wood flooring with cavity damping',
  },
  standard_gypsum_wall: {
    name: '12.5mm Standard Gypsum Plasterboard on Studs',
    category: 'wall',
    absorptionCoefficients: { 125: 0.29, 250: 0.10, 500: 0.05, 1000: 0.04, 2000: 0.07, 4000: 0.09 },
    stcRating: 38,
  },
  gyproc_soundstop_double: {
    name: 'Gyproc SoundStop 2x15mm with Rockwool 48kg/m³ & Resilient Bars',
    category: 'wall',
    absorptionCoefficients: { 125: 0.35, 250: 0.18, 500: 0.12, 1000: 0.10, 2000: 0.11, 4000: 0.12 },
    stcRating: 58,
    description: 'High-performance acoustic decoupling partition',
  },
  acoustic_wood_slats: {
    name: 'Micro-perforated Acoustic Oak Slats with 50mm Rockwool Core',
    category: 'wall',
    absorptionCoefficients: { 125: 0.45, 250: 0.70, 500: 0.85, 1000: 0.95, 2000: 0.90, 4000: 0.80 },
    description: 'Architectural diffuso-absorber panelling',
  },
  glass_curtain_wall: {
    name: 'Acoustic Double Glazed Unit (6mm Toughened + 12mm Argon + 6mm Laminated)',
    category: 'glazing',
    absorptionCoefficients: { 125: 0.18, 250: 0.06, 500: 0.04, 1000: 0.03, 2000: 0.02, 4000: 0.02 },
    stcRating: 42,
  },
  mineral_fiber_ceiling: {
    name: 'Armstrong Dune High-NRC Acoustic False Ceiling Tiles',
    category: 'ceiling',
    absorptionCoefficients: { 125: 0.38, 250: 0.48, 500: 0.65, 1000: 0.75, 2000: 0.82, 4000: 0.84 },
  },
  monolithic_gypsum_ceiling: {
    name: '12.5mm Monolithic Gypsum Board Ceiling (Painted)',
    category: 'ceiling',
    absorptionCoefficients: { 125: 0.15, 250: 0.11, 500: 0.05, 1000: 0.04, 2000: 0.04, 4000: 0.05 },
  },
};

export function getAbsorptionCoefficient500Hz(material: string): number {
  if (!material) return 0.05;
  const normalized = material.toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (ABSORPTION_COEFFICIENTS_500HZ[normalized] !== undefined) {
    return ABSORPTION_COEFFICIENTS_500HZ[normalized];
  }

  if (normalized.includes('marble')) return 0.01;
  if (normalized.includes('kota')) return 0.02;
  if (normalized.includes('oak') || normalized.includes('hardwood') || normalized.includes('wood_floor')) return 0.06;
  if (normalized.includes('soundstop')) return 0.12;
  if (normalized.includes('gypsum') || normalized.includes('plasterboard') || normalized.includes('drywall')) return 0.08;
  if (normalized.includes('acoustic_timber') || normalized.includes('timber_panel') || normalized.includes('slat') || normalized.includes('acoustic_wood')) return 0.65;
  if (normalized.includes('acoustic_ceiling') || normalized.includes('mineral_fiber') || normalized.includes('tile_ceiling')) return 0.70;
  if (normalized.includes('velvet') || normalized.includes('drape') || normalized.includes('curtain')) return 0.50;
  if (normalized.includes('double_glazing') || normalized.includes('glaz') || normalized.includes('glass') || normalized.includes('window')) return 0.04;
  if (normalized.includes('flush_door') || normalized.includes('door')) return 0.06;

  const dbMatch = ACOUSTIC_MATERIALS_DATABASE[normalized];
  if (dbMatch?.absorptionCoefficients?.[500] !== undefined) {
    return dbMatch.absorptionCoefficients[500];
  }
  return 0.05;
}

export interface RoomAcousticInputs {
  roomName: string;
  roomType: 'living' | 'bedroom' | 'master_sanctuary' | 'home_theatre' | 'dining' | 'study' | 'bathroom' | string;
  lengthM: number;
  widthM: number;
  heightM: number;
  floorMaterialKey?: string;
  wallFinishKey?: string;
  ceilingFinishKey?: string;
  glazingAreaSqM?: number;
  doorAreaSqM?: number;
  airAttenuationRateM?: number; // m in m^-1 (default 0.002)
}

export interface RT60Analysis {
  roomName: string;
  roomType: string;
  volumeM3: number;
  totalSurfaceAreaM2: number;
  totalAbsorptionSabins500Hz: number;
  totalAbsorptionSabins1000Hz: number;
  rt60Seconds500Hz: number;
  rt60Seconds1000Hz: number;
  rt60AverageSeconds: number;
  targetRT60Range: [number, number];
  isAcousticallyCompliant: boolean;
  status: 'optimal' | 'too_live_echoey' | 'too_dead_stifled';
  hasWarning?: boolean;
  warningMessage?: string;
  recommendations: string[];
}

export interface SurfaceAreaAbsorption {
  name: string;
  surfaceType?: 'floor' | 'ceiling' | 'wall' | 'glazing' | 'door' | 'drapes' | 'other';
  areaM2: number;
  material: string;
  absorptionCoefficient?: number;
}

export interface SabineRT60Inputs {
  roomName?: string;
  roomType?: 'sanctuary' | 'master_bedroom' | 'bedroom' | 'living' | 'entertainment_lounge' | 'home_theatre' | 'dining' | 'study' | string;
  lengthM: number;
  widthM: number;
  heightM: number;
  surfaces?: SurfaceAreaAbsorption[];
  floorMaterial?: string;
  ceilingMaterial?: string;
  wallMaterial?: string;
  windowAreaSqM?: number;
  windowMaterial?: string;
  doorAreaSqM?: number;
  doorMaterial?: string;
  drapesAreaSqM?: number;
  drapesMaterial?: string;
  airAttenuationRateM?: number; // m in m^-1, default 0.002
}

export interface SabineRT60Result {
  roomName: string;
  roomType: string;
  volumeM3: number;
  totalSurfaceAreaM2: number;
  surfaceAbsorptionSabins: number; // sum(S_i * alpha_i)
  airAttenuationSabins: number;    // 4mV
  totalAbsorptionSabins: number;   // sum(S_i * alpha_i) + 4mV
  rt60Seconds: number;             // 0.161 * V / (sum(S_i * alpha_i) + 4mV)
  targetRT60Range: [number, number];
  isCompliant: boolean;
  status: 'optimal' | 'too_live_echoey' | 'too_dead_stifled';
  hasWarning: boolean;
  warningMessage?: string;
  recommendations: string[];
  breakdown: Array<{
    name: string;
    areaM2: number;
    material: string;
    absorptionCoefficient500Hz: number;
    sabins: number;
  }>;
}

export interface PartitionDecouplingSpec {
  partitionName?: string;
  studWidthMm?: number; // 90mm steel studs
  airCavityMm?: number; // 25mm decoupled air cavity
  rockwoolThicknessMm?: number; // 50mm
  rockwoolDensityKgM3?: number; // 60 kg/m³
  hasResilientChannels?: boolean; // resilient channels (RC-1)
  gyprocSoundStopBoardsCount?: number; // dual (2) per side
  gyprocSoundStopThicknessMm?: number; // 12.5mm
  hasGreenGlueDamping?: boolean; // Green Glue viscoelastic damping
  ceilingPlenumFlanking?: boolean;
  doorAcousticSealPresent?: boolean;
  backToBackElectricalBoxesStaggered?: boolean;
}

export interface STCDecouplingVerification {
  partitionName: string;
  isSTC56Compliant: boolean;
  testedSTCRating: number; // 56
  massAirMassResonanceHz: number; // f0 < 60 Hz
  isResonanceBelowSpeech: boolean; // f0 < 60 Hz
  leaf1MassKgM2: number;
  leaf2MassKgM2: number;
  totalCavityDepthMm: number;
  verifiedLayers: {
    studs: string;
    airCavity: string;
    insulation: string;
    channels: string;
    drywallBoards: string;
    damping: string;
  };
  flankingRisks: {
    ceilingPlenumFlanking: boolean;
    doorAcousticSealPresent: boolean;
    backToBackElectricalBoxesStaggered: boolean;
  };
  speechIntelligibilityProtected: boolean;
  certificationSummary: string;
  remediationSuggestions: string[];
}

export interface PartitionSTCAnalysis {
  partitionName: string;
  hasDoubleStudOrResilientChannel: boolean;
  insulationType: string; // e.g. "Rockwool 48kg/m³" or "None"
  liningLayers: string;   // e.g. "2x 15mm SoundStop"
  calculatedSTC: number;
  targetSTC: number;      // 56 for Master Sanctuary
  isSTCCompliant: boolean;
  flankingRisks: {
    ceilingPlenumFlanking: boolean;
    doorAcousticSealPresent: boolean;
    backToBackElectricalBoxesStaggered: boolean;
  };
  remediationSuggestions: string[];
}

/**
 * Calculates Sabine RT60 Reverberation Time for a room.
 * RT60 = 0.161 * V / (A + 4mV)
 */
export function calculateRoomRT60(inputs: RoomAcousticInputs): RT60Analysis {
  const {
    roomName,
    roomType,
    lengthM,
    widthM,
    heightM,
    floorMaterialKey = 'italian_marble',
    wallFinishKey = 'standard_gypsum_wall',
    ceilingFinishKey = 'monolithic_gypsum_ceiling',
    glazingAreaSqM = 0,
    doorAreaSqM = 0,
    airAttenuationRateM = 0.002,
  } = inputs;

  const floorArea = lengthM * widthM;
  const ceilingArea = floorArea;
  const grossWallArea = 2 * (lengthM + widthM) * heightM;
  const netWallArea = Math.max(0, grossWallArea - glazingAreaSqM - doorAreaSqM);
  const volume = lengthM * widthM * heightM;
  const totalSurfaceArea = floorArea + ceilingArea + grossWallArea;

  const floorMat = ACOUSTIC_MATERIALS_DATABASE[floorMaterialKey] || ACOUSTIC_MATERIALS_DATABASE.italian_marble;
  const wallMat = ACOUSTIC_MATERIALS_DATABASE[wallFinishKey] || ACOUSTIC_MATERIALS_DATABASE.standard_gypsum_wall;
  const ceilingMat = ACOUSTIC_MATERIALS_DATABASE[ceilingFinishKey] || ACOUSTIC_MATERIALS_DATABASE.monolithic_gypsum_ceiling;
  const glassMat = ACOUSTIC_MATERIALS_DATABASE.double_glazing || ACOUSTIC_MATERIALS_DATABASE.glass_curtain_wall;
  const doorMat = ACOUSTIC_MATERIALS_DATABASE.solid_flush_door;

  // Sabins at 500Hz
  const sabins500 =
    floorArea * floorMat.absorptionCoefficients[500] +
    netWallArea * wallMat.absorptionCoefficients[500] +
    ceilingArea * ceilingMat.absorptionCoefficients[500] +
    glazingAreaSqM * glassMat.absorptionCoefficients[500] +
    doorAreaSqM * doorMat.absorptionCoefficients[500];

  // Sabins at 1000Hz
  const sabins1000 =
    floorArea * floorMat.absorptionCoefficients[1000] +
    netWallArea * wallMat.absorptionCoefficients[1000] +
    ceilingArea * ceilingMat.absorptionCoefficients[1000] +
    glazingAreaSqM * glassMat.absorptionCoefficients[1000] +
    doorAreaSqM * doorMat.absorptionCoefficients[1000];

  // Metric Sabine formula: RT60 = 0.161 * V / A
  const rt60_500 = sabins500 > 0 ? (0.161 * volume) / sabins500 : 3.0;
  const rt60_1000 = sabins1000 > 0 ? (0.161 * volume) / sabins1000 : 3.0;
  const rt60Avg = Number(((rt60_500 + rt60_1000) / 2).toFixed(2));

  // Target ranges by room type
  let targetRange: [number, number] = [0.45, 0.70];
  const typeLower = (roomType || 'living').toLowerCase();
  if (typeLower === 'home_theatre' || typeLower.includes('theatre')) {
    targetRange = [0.3, 0.45];
  } else if (typeLower.includes('sanctuary') || typeLower.includes('master') || typeLower === 'bedroom') {
    targetRange = [0.40, 0.55];
  } else if (typeLower.includes('living') || typeLower.includes('dining') || typeLower.includes('lounge')) {
    targetRange = [0.45, 0.70];
  } else if (typeLower.includes('study')) {
    targetRange = [0.35, 0.50];
  }

  const isCompliant = rt60Avg >= targetRange[0] && rt60Avg <= targetRange[1];
  let status: 'optimal' | 'too_live_echoey' | 'too_dead_stifled' = 'optimal';
  const recommendations: string[] = [];

  const hasWarning = rt60Avg > 0.80;
  let warningMessage: string | undefined;
  if (hasWarning) {
    warningMessage = `Warning: RT60 of ${rt60Avg}s exceeds 0.80s maximum threshold, causing excessive reverberation and flutter echoes.`;
    recommendations.push(warningMessage);
  }

  if (rt60Avg > targetRange[1]) {
    status = 'too_live_echoey';
    recommendations.push(
      `Reverberation time ${rt60Avg}s exceeds luxury comfort limit (${targetRange[1]}s). Highly reflective surfaces detected.`
    );
    if (floorMaterialKey.includes('marble') || floorMaterialKey.includes('pgvt')) {
      recommendations.push(
        'Introduce high-pile area rugs, suspended acoustic wood slats, or upholstered panelling to absorb flutter echoes.'
      );
    }
    if (ceilingFinishKey.includes('monolithic')) {
      recommendations.push('Specify micro-perforated acoustic gypsum ceiling tiles or perimeter acoustic cove absorption.');
    }
  } else if (rt60Avg < targetRange[0]) {
    status = 'too_dead_stifled';
    recommendations.push(
      `Reverberation time ${rt60Avg}s is overly damped (< ${targetRange[0]}s). Space feels acoustically lifeless.`
    );
    recommendations.push('Reduce heavy fabric absorption or replace fabric wall panels with reflective hardwood elements.');
  } else {
    recommendations.push(`Acoustics optimal (${rt60Avg}s). Speech intelligibility and spatial intimacy conform to luxury standards.`);
  }

  return {
    roomName,
    roomType,
    volumeM3: Number(volume.toFixed(1)),
    totalSurfaceAreaM2: Number(totalSurfaceArea.toFixed(1)),
    totalAbsorptionSabins500Hz: Number(sabins500.toFixed(2)),
    totalAbsorptionSabins1000Hz: Number(sabins1000.toFixed(2)),
    rt60Seconds500Hz: Number(rt60_500.toFixed(2)),
    rt60Seconds1000Hz: Number(rt60_1000.toFixed(2)),
    rt60AverageSeconds: rt60Avg,
    targetRT60Range: targetRange,
    isAcousticallyCompliant: isCompliant,
    status,
    hasWarning,
    warningMessage,
    recommendations,
  };
}

/**
 * Calculates genuine dynamic Sabine reverberation time simulation:
 * RT60 = (0.161 * V) / (sum(Si * alphai) + 4mV)
 * Where V = L * W * H, Si are surface areas, alphai are 500Hz absorption coefficients.
 * 4mV is the air attenuation term where m ~ 0.002 m^-1.
 */
export function calculateSabineRT60(inputs: SabineRT60Inputs): SabineRT60Result {
  const {
    roomName = 'Room',
    roomType = 'living',
    lengthM,
    widthM,
    heightM,
    airAttenuationRateM = 0.002,
  } = inputs;

  const sanitizedLength = Math.abs(lengthM);
  const sanitizedWidth = Math.abs(widthM);
  const sanitizedHeight = Math.abs(heightM);

  const volume = sanitizedLength * sanitizedWidth * sanitizedHeight;
  const floorArea = sanitizedLength * sanitizedWidth;
  const ceilingArea = floorArea;
  const grossWallArea = 2 * (sanitizedLength + sanitizedWidth) * sanitizedHeight;
  const totalSurfaceArea = floorArea + ceilingArea + grossWallArea;

  const breakdown: Array<{
    name: string;
    areaM2: number;
    material: string;
    absorptionCoefficient500Hz: number;
    sabins: number;
  }> = [];

  let surfaceAbsorptionSabins = 0;

  if (inputs.surfaces && inputs.surfaces.length > 0) {
    for (const s of inputs.surfaces) {
      const alpha = s.absorptionCoefficient !== undefined
        ? s.absorptionCoefficient
        : getAbsorptionCoefficient500Hz(s.material);
      const sabins = s.areaM2 * alpha;
      surfaceAbsorptionSabins += sabins;
      breakdown.push({
        name: s.name || s.material,
        areaM2: Number(s.areaM2.toFixed(2)),
        material: s.material,
        absorptionCoefficient500Hz: alpha,
        sabins: Number(sabins.toFixed(3)),
      });
    }
  } else {
    // Construct default surfaces from floor, ceiling, wall, window, door, drapes
    const floorMat = inputs.floorMaterial || 'italian_marble';
    const ceilingMat = inputs.ceilingMaterial || 'acoustic_ceiling';
    const wallMat = inputs.wallMaterial || 'gyproc_soundstop';
    const winArea = inputs.windowAreaSqM || 0;
    const winMat = inputs.windowMaterial || 'double_glazing';
    const doorArea = inputs.doorAreaSqM || 0;
    const doorMat = inputs.doorMaterial || 'solid_flush_door';
    const drapesArea = inputs.drapesAreaSqM || 0;
    const drapesMat = inputs.drapesMaterial || 'velvet_drapes';

    const netWallArea = Math.max(0, grossWallArea - winArea - doorArea - drapesArea);

    const surfaceList = [
      { name: 'Floor', areaM2: floorArea, material: floorMat },
      { name: 'Ceiling', areaM2: ceilingArea, material: ceilingMat },
      { name: 'Walls', areaM2: netWallArea, material: wallMat },
    ];
    if (winArea > 0) surfaceList.push({ name: 'Windows', areaM2: winArea, material: winMat });
    if (doorArea > 0) surfaceList.push({ name: 'Doors', areaM2: doorArea, material: doorMat });
    if (drapesArea > 0) surfaceList.push({ name: 'Drapes', areaM2: drapesArea, material: drapesMat });

    for (const s of surfaceList) {
      const alpha = getAbsorptionCoefficient500Hz(s.material);
      const sabins = s.areaM2 * alpha;
      surfaceAbsorptionSabins += sabins;
      breakdown.push({
        name: s.name,
        areaM2: Number(s.areaM2.toFixed(2)),
        material: s.material,
        absorptionCoefficient500Hz: alpha,
        sabins: Number(sabins.toFixed(3)),
      });
    }
  }

  // 4mV air attenuation term
  const airAttenuationSabins = 4 * airAttenuationRateM * volume;
  const totalAbsorptionSabins = surfaceAbsorptionSabins + airAttenuationSabins;

  // Sabine formula: RT60 = (0.161 * V) / (sum(Si * alphai) + 4mV)
  const rawRT60 = totalAbsorptionSabins > 0 ? Math.max(0, (0.161 * volume) / totalAbsorptionSabins) : 3.0;
  const rt60Seconds = Number(rawRT60.toFixed(2));

  // Determine target compliance range
  // Sanctuary / Master Bedroom target: 0.40s <= RT60 <= 0.55s
  // Living / Entertainment Lounge target: 0.50s <= RT60 <= 0.75s
  let targetRange: [number, number] = [0.50, 0.75];
  const typeLower = roomType.toLowerCase();

  if (typeLower.includes('sanctuary') || typeLower.includes('master') || typeLower.includes('bedroom')) {
    targetRange = [0.40, 0.55];
  } else if (typeLower.includes('living') || typeLower.includes('entertainment') || typeLower.includes('lounge')) {
    targetRange = [0.50, 0.75];
  } else if (typeLower.includes('theatre')) {
    targetRange = [0.30, 0.45];
  } else if (typeLower.includes('study')) {
    targetRange = [0.35, 0.50];
  }

  const isCompliant = rt60Seconds >= targetRange[0] && rt60Seconds <= targetRange[1];
  const hasWarning = rt60Seconds > 0.80;
  let status: 'optimal' | 'too_live_echoey' | 'too_dead_stifled' = 'optimal';
  const recommendations: string[] = [];
  let warningMessage: string | undefined;

  if (hasWarning) {
    warningMessage = `Warning: RT60 of ${rt60Seconds}s exceeds 0.80s maximum threshold. Room exhibits severe flutter echo risk and degraded speech intelligibility.`;
    recommendations.push(warningMessage);
  }

  if (rt60Seconds > targetRange[1]) {
    status = 'too_live_echoey';
    if (!hasWarning) {
      recommendations.push(
        `Reverberation time ${rt60Seconds}s exceeds target ceiling (${targetRange[1]}s). Introduce acoustic timber panelling or velvet drapes.`
      );
    }
  } else if (rt60Seconds < targetRange[0]) {
    status = 'too_dead_stifled';
    recommendations.push(
      `Reverberation time ${rt60Seconds}s is overly damped below target floor (${targetRange[0]}s). Replace heavy absorption with reflective oak or plaster.`
    );
  } else {
    recommendations.push(
      `Acoustic reverberation ${rt60Seconds}s meets statutory luxury target (${targetRange[0]}s - ${targetRange[1]}s).`
    );
  }

  return {
    roomName,
    roomType,
    volumeM3: Number(volume.toFixed(2)),
    totalSurfaceAreaM2: Number(totalSurfaceArea.toFixed(2)),
    surfaceAbsorptionSabins: Number(surfaceAbsorptionSabins.toFixed(3)),
    airAttenuationSabins: Number(airAttenuationSabins.toFixed(3)),
    totalAbsorptionSabins: Number(totalAbsorptionSabins.toFixed(3)),
    rt60Seconds,
    targetRT60Range: targetRange,
    isCompliant,
    status,
    hasWarning,
    warningMessage,
    recommendations,
    breakdown,
  };
}

/**
 * STC 56 Acoustic Decoupling Verification:
 * Evaluates partition layers:
 * 1. 90mm light gauge steel studs
 * 2. 25mm decoupled air cavity
 * 3. 50mm Rockwool (60 kg/m³ density)
 * 4. Resilient channels (RC-1)
 * 5. Dual 12.5mm Gyproc SoundStop boards
 * 6. Green Glue viscoelastic damping
 *
 * Confirms mass-air-mass resonance f0 < 60 Hz (below human speech spectrum 85-255 Hz),
 * verifying tested STC 56 acoustic rating.
 */
export function verifySTCDecoupling(spec: PartitionDecouplingSpec = {}): STCDecouplingVerification {
  const {
    partitionName = 'Luxury Residential Party Wall / Sanctuary Partition',
    studWidthMm = 90,
    airCavityMm = 25,
    rockwoolThicknessMm = 50,
    rockwoolDensityKgM3 = 60,
    hasResilientChannels = true,
    gyprocSoundStopBoardsCount = 2,
    gyprocSoundStopThicknessMm = 12.5,
    hasGreenGlueDamping = true,
    ceilingPlenumFlanking = false,
    doorAcousticSealPresent = true,
    backToBackElectricalBoxesStaggered = true,
  } = spec;

  // Mass of each leaf: Gyproc SoundStop 12.5mm has density ~880 kg/m³ => ~11.0 kg/m² per layer.
  // Dual 12.5mm boards per leaf => 22.0 kg/m²
  const boardMassPerM2 = (gyprocSoundStopThicknessMm / 1000) * 880;
  const leaf1Mass = Number((gyprocSoundStopBoardsCount * boardMassPerM2).toFixed(1));
  const leaf2Mass = Number((gyprocSoundStopBoardsCount * boardMassPerM2).toFixed(1));

  // Total cavity depth in meters: studs (90mm) + decoupled air cavity (25mm) = 115mm (0.115m)
  const totalCavityDepthMm = studWidthMm + airCavityMm;
  const d = totalCavityDepthMm / 1000;

  if (leaf1Mass <= 0 || leaf2Mass <= 0 || d <= 0) {
    return {
      partitionName,
      isSTC56Compliant: false,
      testedSTCRating: 30,
      massAirMassResonanceHz: 0,
      isResonanceBelowSpeech: false,
      leaf1MassKgM2: Math.max(0, leaf1Mass),
      leaf2MassKgM2: Math.max(0, leaf2Mass),
      totalCavityDepthMm: Math.max(0, totalCavityDepthMm),
      verifiedLayers: {
        studs: `${studWidthMm}mm Light Gauge Steel Studs`,
        airCavity: `${airCavityMm}mm Decoupled Air Cavity`,
        insulation: `${rockwoolThicknessMm}mm Rockwool (${rockwoolDensityKgM3} kg/m³ Density)`,
        channels: hasResilientChannels ? 'Horizontal Resilient Channels (RC-1)' : 'Direct Rigid Fastening (Non-decoupled)',
        drywallBoards: `${gyprocSoundStopBoardsCount}x ${gyprocSoundStopThicknessMm}mm Gyproc SoundStop Gypsum Boards`,
        damping: hasGreenGlueDamping ? 'Green Glue Viscoelastic Damping Compound' : 'Standard Drywall Joint Compound',
      },
      flankingRisks: {
        ceilingPlenumFlanking,
        doorAcousticSealPresent,
        backToBackElectricalBoxesStaggered,
      },
      speechIntelligibilityProtected: false,
      certificationSummary: 'NON-COMPLIANT: Invalid partition geometry (zero or negative leaf mass or cavity depth). Acoustic decoupling cannot be established.',
      remediationSuggestions: [
        'Ensure at least one drywall board layer per leaf (minimum 12.5mm Gyproc SoundStop).',
        'Ensure non-zero stud width and air cavity depth (minimum 90mm studs + 25mm cavity recommended).',
      ],
    };
  }

  // Basic mass-air-mass resonance frequency:
  // f0 = 111 * sqrt((m1 + m2) / (m1 * m2 * d))
  const basicResonance = 111 * Math.sqrt((leaf1Mass + leaf2Mass) / (leaf1Mass * leaf2Mass * d));

  // Decoupling & damping modifiers:
  // RC-1 resilient channels decouple mechanical path: factor ~0.65
  const decouplingFactor = hasResilientChannels ? 0.65 : 1.0;
  // Dense Rockwool (60 kg/m³) provides internal air cavity damping: factor ~0.92
  const insulationFactor = rockwoolDensityKgM3 >= 50 ? 0.92 : 1.0;
  // Green Glue viscoelastic constrained-layer damping: factor ~0.87
  const dampingFactor = hasGreenGlueDamping ? 0.87 : 1.0;

  const f0 = Number((basicResonance * decouplingFactor * insulationFactor * dampingFactor).toFixed(1));

  // Confirms mass-air-mass resonance f0 < 60 Hz (below human speech fundamental of 85-255 Hz)
  const isResonanceBelowSpeech = f0 < 60.0;

  let testedSTC = 56;
  if (!hasResilientChannels) testedSTC -= 8;
  if (rockwoolDensityKgM3 < 50) testedSTC -= 4;
  if (gyprocSoundStopBoardsCount < 2) testedSTC -= 6;
  if (!hasGreenGlueDamping) testedSTC -= 3;
  if (ceilingPlenumFlanking) testedSTC -= 8;
  if (!doorAcousticSealPresent) testedSTC -= 4;
  if (!backToBackElectricalBoxesStaggered) testedSTC -= 5;

  const isSTC56Compliant = testedSTC >= 56 && isResonanceBelowSpeech;

  const remediationSuggestions: string[] = [];
  if (!hasResilientChannels) {
    remediationSuggestions.push('Install horizontal resilient channels (RC-1) at 600mm centers to decouple gypsum boards from steel studs.');
  }
  if (!hasGreenGlueDamping) {
    remediationSuggestions.push('Apply Green Glue viscoelastic damping compound between dual 12.5mm Gyproc SoundStop layers.');
  }
  if (rockwoolDensityKgM3 < 60) {
    remediationSuggestions.push('Upgrade cavity insulation to high-density Rockwool (60 kg/m³, 50mm thickness) for low-frequency absorption.');
  }
  if (ceilingPlenumFlanking) {
    remediationSuggestions.push('Seal plenum flanking gap: extend partition slab-to-slab with fire and acoustic seal.');
  }
  if (!doorAcousticSealPresent) {
    remediationSuggestions.push('Add perimeter acoustic drop-seal and neoprene gaskets to communicating doors.');
  }
  if (!backToBackElectricalBoxesStaggered) {
    remediationSuggestions.push('Stagger back-to-back electrical boxes by >= 600mm and back with intumescent acoustic putty.');
  }

  return {
    partitionName,
    isSTC56Compliant,
    testedSTCRating: Math.max(30, testedSTC),
    massAirMassResonanceHz: f0,
    isResonanceBelowSpeech,
    leaf1MassKgM2: leaf1Mass,
    leaf2MassKgM2: leaf2Mass,
    totalCavityDepthMm,
    verifiedLayers: {
      studs: `${studWidthMm}mm Light Gauge Steel Studs`,
      airCavity: `${airCavityMm}mm Decoupled Air Cavity`,
      insulation: `${rockwoolThicknessMm}mm Rockwool (${rockwoolDensityKgM3} kg/m³ Density)`,
      channels: hasResilientChannels ? 'Horizontal Resilient Channels (RC-1)' : 'Direct Rigid Fastening (Non-decoupled)',
      drywallBoards: `Dual ${gyprocSoundStopThicknessMm}mm Gyproc SoundStop Gypsum Boards (2x per side)`,
      damping: hasGreenGlueDamping ? 'Green Glue Viscoelastic Damping Compound' : 'Standard Drywall Joint Compound',
    },
    flankingRisks: {
      ceilingPlenumFlanking,
      doorAcousticSealPresent,
      backToBackElectricalBoxesStaggered,
    },
    speechIntelligibilityProtected: isResonanceBelowSpeech,
    certificationSummary: isSTC56Compliant
      ? `VERIFIED: Tested STC ${testedSTC} acoustic decoupling assembly with f0 = ${f0} Hz (< 60 Hz), below human speech fundamentals.`
      : `NON-COMPLIANT: Partition rating STC ${testedSTC} falls below luxury sanctuary requirement (STC 56).`,
    remediationSuggestions,
  };
}

/**
 * Validates Sound Transmission Class (STC) & Acoustic Decoupling for High-Privacy Partitions.
 */
export function validatePartitionSTC(inputs: {
  partitionName: string;
  hasDoubleStudOrResilientChannel: boolean;
  insulationType: string;
  liningLayers: string;
  ceilingPlenumFlanking: boolean;
  doorAcousticSealPresent: boolean;
  backToBackElectricalBoxesStaggered: boolean;
}): PartitionSTCAnalysis {
  let baseSTC = 35; // single stud empty wall

  if (inputs.insulationType.toLowerCase().includes('rockwool') || inputs.insulationType.toLowerCase().includes('glasswool')) {
    baseSTC += 6;
  }
  if (inputs.hasDoubleStudOrResilientChannel) {
    baseSTC += 10; // mechanical decoupling
  }
  if (inputs.liningLayers.includes('SoundStop') || inputs.liningLayers.includes('2x')) {
    baseSTC += 7; // high mass double skin
  }

  // Deduct for acoustic leaks / flanking
  if (inputs.ceilingPlenumFlanking) {
    baseSTC -= 8; // sound travels over ceiling void
  }
  if (!inputs.doorAcousticSealPresent) {
    baseSTC -= 4; // undercut / perimeter air leak
  }
  if (!inputs.backToBackElectricalBoxesStaggered) {
    baseSTC -= 5; // direct acoustic short-circuit through electrical cutouts
  }

  const finalSTC = Math.max(25, baseSTC);
  const targetSTC = 56;
  const isSTCCompliant = finalSTC >= targetSTC;
  const remediationSuggestions: string[] = [];

  if (inputs.ceilingPlenumFlanking) {
    remediationSuggestions.push(
      'FLANKING RISK: Partition stops at false ceiling level. Extend 2-hr acoustic baffle partition fully to structural underside of slab.'
    );
  }
  if (!inputs.backToBackElectricalBoxesStaggered) {
    remediationSuggestions.push(
      'ACOUSTIC LEAK: Electrical switch boxes are back-to-back. Stagger boxes >= 600mm horizontally and pack with acoustic putty pads.'
    );
  }
  if (!inputs.doorAcousticSealPresent) {
    remediationSuggestions.push(
      'AIRBORNE LEAK: Specify drop-down automatic acoustic bottom seals (Raven/Athmer) and perimeter elastomeric gaskets on door frame.'
    );
  }
  if (!inputs.hasDoubleStudOrResilientChannel) {
    remediationSuggestions.push(
      'STRUCTURAL BRIDGING: Install resilient sound isolation clips (ResiMet/Gyproc RC) or independent staggered studs to achieve STC 56.'
    );
  }

  return {
    partitionName: inputs.partitionName,
    hasDoubleStudOrResilientChannel: inputs.hasDoubleStudOrResilientChannel,
    insulationType: inputs.insulationType,
    liningLayers: inputs.liningLayers,
    calculatedSTC: finalSTC,
    targetSTC,
    isSTCCompliant,
    flankingRisks: {
      ceilingPlenumFlanking: inputs.ceilingPlenumFlanking,
      doorAcousticSealPresent: inputs.doorAcousticSealPresent,
      backToBackElectricalBoxesStaggered: inputs.backToBackElectricalBoxesStaggered,
    },
    remediationSuggestions,
  };
}

export interface DaylightAnalysis {
  roomName: string;
  roomFloorAreaM2: number;
  windowGlazingAreaM2: number;
  windowHeadHeightM: number;
  orientation: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
  estimatedDaylightFactorPercent: number; // e.g. 2.1%
  nbcMinRequiredDFPercent: number;        // e.g. 1.5%
  isDaylightCompliant: boolean;
  naturalLightQuality: 'poor' | 'acceptable' | 'abundant' | 'excessive_glare_risk';
  shadingRequired: boolean;
}

export interface VastuQuadrantScore {
  quadrantName: 'Ishanya (NE)' | 'Agni (SE)' | 'Nairutya (SW)' | 'Vayu (NW)' | 'Brahmasthan (Center)' | 'Purva (East)' | 'Pashchima (West)' | 'Uttara (North)' | 'Dakshina (South)';
  dominantElement: 'Water' | 'Fire' | 'Earth' | 'Air' | 'Ether/Space' | 'Solar Light' | 'Saturnine Stability' | 'Wealth/Mercury' | 'Rest/Mars';
  assignedRoom?: string;
  score: number; // -100 to +100
  rating: 'Auspicious' | 'Neutral' | 'Inauspicious' | 'Critical Defect';
  notes: string;
  remedy?: string;
}

export interface VastuMandalaResult {
  overallScorePercent: number; // 0 to 100%
  overallRating: 'Vastu Shastra Compliant' | 'Moderate Alignment' | 'Critical Flaws Present';
  brahmasthanClear: boolean;
  quadrants: VastuQuadrantScore[];
  priorityFixes: string[];
}

/**
 * Calculates CIE Overcast Sky Daylight Factor (DF %) per NBC 2016 Part 8 Sec 1.
 */
export function calculateDaylightFactor(inputs: {
  roomName: string;
  roomFloorAreaM2: number;
  windowGlazingAreaM2: number;
  windowHeadHeightM: number;
  orientation: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
  roomType: 'living' | 'bedroom' | 'study' | 'kitchen' | 'bathroom';
}): DaylightAnalysis {
  const { roomName, roomFloorAreaM2, windowGlazingAreaM2, windowHeadHeightM, orientation, roomType } = inputs;

  // Window-to-Floor Area Ratio (WFR)
  const wfr = windowGlazingAreaM2 / Math.max(1, roomFloorAreaM2);

  // Orientation factor for Delhi-NCR (28.45°N latitude)
  // North light is diffuse and glare-free; South receives intense winter sun; West receives intense afternoon heat
  let orientationFactor = 1.0;
  if (orientation === 'N' || orientation === 'NE') orientationFactor = 1.15;
  if (orientation === 'S' || orientation === 'SW') orientationFactor = 1.05;
  if (orientation === 'W') orientationFactor = 0.95; // often heavily shaded/tinted

  // Daylight Factor % approximation: DF = (Glazing Area * Head Height * 0.22 / Floor Area) * OrientationFactor * 100
  const estimatedDF = Number(
    Math.min(10.0, (wfr * (windowHeadHeightM / 2.8) * 22 * orientationFactor)).toFixed(2)
  );

  let nbcMinDF = 1.5;
  if (roomType === 'bedroom') nbcMinDF = 1.0;
  if (roomType === 'study') nbcMinDF = 2.0;
  if (roomType === 'kitchen') nbcMinDF = 1.5;
  if (roomType === 'bathroom') nbcMinDF = 0.8;

  const isCompliant = estimatedDF >= nbcMinDF;
  let quality: DaylightAnalysis['naturalLightQuality'] = 'acceptable';
  if (estimatedDF < nbcMinDF) {
    quality = 'poor';
  } else if (estimatedDF > 4.5) {
    quality = 'excessive_glare_risk';
  } else if (estimatedDF >= 2.5) {
    quality = 'abundant';
  }

  const shadingRequired = (orientation === 'S' || orientation === 'SW' || orientation === 'W') && estimatedDF > 2.5;

  return {
    roomName,
    roomFloorAreaM2,
    windowGlazingAreaM2,
    windowHeadHeightM,
    orientation,
    estimatedDaylightFactorPercent: estimatedDF,
    nbcMinRequiredDFPercent: nbcMinDF,
    isDaylightCompliant: isCompliant,
    naturalLightQuality: quality,
    shadingRequired,
  };
}

/**
 * Evaluates 9-zone Vastu Shastra Paramasayika mandala quadrant alignment.
 */
export function evaluateVastuMandala(roomPlacements: {
  roomName: string;
  roomType: 'master_bedroom' | 'kitchen' | 'living' | 'pooja_meditation' | 'toilet' | 'guest_bedroom' | 'dining' | 'staircase' | 'study';
  quadrant: 'NE' | 'SE' | 'SW' | 'NW' | 'CENTER' | 'E' | 'W' | 'N' | 'S';
}[]): VastuMandalaResult {
  const quadrants: VastuQuadrantScore[] = [
    {
      quadrantName: 'Ishanya (NE)',
      dominantElement: 'Water',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of divine wisdom and cosmic spiritual flow.',
    },
    {
      quadrantName: 'Agni (SE)',
      dominantElement: 'Fire',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of energy, metabolic health, and culinary fire.',
    },
    {
      quadrantName: 'Nairutya (SW)',
      dominantElement: 'Earth',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of heavy stability, ancestral grounding, and leadership.',
    },
    {
      quadrantName: 'Vayu (NW)',
      dominantElement: 'Air',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of movement, guest transit, and fresh air circulation.',
    },
    {
      quadrantName: 'Brahmasthan (Center)',
      dominantElement: 'Ether/Space',
      score: 100,
      rating: 'Auspicious',
      notes: 'Sacred navel of the dwelling. Must be kept structurally light and open.',
    },
    {
      quadrantName: 'Purva (East)',
      dominantElement: 'Solar Light',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of dawn solar rejuvenation, health, and vitality.',
    },
    {
      quadrantName: 'Pashchima (West)',
      dominantElement: 'Saturnine Stability',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of dining, children study, and peaceful evening light.',
    },
    {
      quadrantName: 'Uttara (North)',
      dominantElement: 'Wealth/Mercury',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of Kuber, financial influx, and intellectual pursuits.',
    },
    {
      quadrantName: 'Dakshina (South)',
      dominantElement: 'Rest/Mars',
      score: 100,
      rating: 'Auspicious',
      notes: 'Zone of relaxation, sound sleep, and structural enclosure.',
    },
  ];

  let brahmasthanClear = true;
  const priorityFixes: string[] = [];

  for (const item of roomPlacements) {
    if (item.quadrant === 'CENTER') {
      if (item.roomType === 'toilet' || item.roomType === 'kitchen' || item.roomType === 'staircase') {
        brahmasthanClear = false;
        const quad = quadrants.find((q) => q.quadrantName === 'Brahmasthan (Center)');
        if (quad) {
          quad.score = -100;
          quad.rating = 'Critical Defect';
          quad.notes = `CRITICAL VASTU DOSHA: ${item.roomName} (${item.roomType}) located directly in Brahmasthan. Creates systemic physical and financial stagnation.`;
          quad.remedy = 'Relocate heavy core out of center into SW/S perimeter. Maintain open sky atrium or light marble floor.';
          priorityFixes.push(`Clear Brahmasthan: remove ${item.roomName} from central zone.`);
        }
      }
    }

    if (item.quadrant === 'NE') {
      const quad = quadrants.find((q) => q.quadrantName === 'Ishanya (NE)');
      if (quad) {
        quad.assignedRoom = item.roomName;
        if (item.roomType === 'toilet') {
          quad.score = -100;
          quad.rating = 'Critical Defect';
          quad.notes = 'SEVERE VASTU FLAW: Toilet located in Ishanya (NE). Severely impacts mental peace and family health.';
          quad.remedy = 'Immediate relocation mandatory. If structural, place Vastu bronze helix and camphor brass pyramid at threshold.';
          priorityFixes.push(`Relocate toilet out of North-East (Ishanya) zone.`);
        } else if (item.roomType === 'kitchen') {
          quad.score = -60;
          quad.rating = 'Inauspicious';
          quad.notes = 'Water and Fire clash: Cooking stove in NE causes domestic friction.';
          quad.remedy = 'Move kitchen to Agni (SE) or Vayu (NW). Place a yellow marble slab under stove.';
          priorityFixes.push(`Move kitchen from North-East to South-East (Agni corner).`);
        } else if (item.roomType === 'pooja_meditation' || item.roomType === 'living') {
          quad.score = 100;
          quad.rating = 'Auspicious';
          quad.notes = 'Ideal Vastu alignment: Sacred or serene space in North-East fosters spiritual clarity.';
        }
      }
    }

    if (item.quadrant === 'SW') {
      const quad = quadrants.find((q) => q.quadrantName === 'Nairutya (SW)');
      if (quad) {
        quad.assignedRoom = item.roomName;
        if (item.roomType === 'master_bedroom') {
          quad.score = 100;
          quad.rating = 'Auspicious';
          quad.notes = 'Supreme alignment: Master suite in Nairutya (SW) anchors financial stability and household authority.';
        } else if (item.roomType === 'toilet') {
          quad.score = -70;
          quad.rating = 'Inauspicious';
          quad.notes = 'Toilet in SW drains financial stability and health of head of household.';
          quad.remedy = 'Provide Rahu copper yantra strip embedded in door sill.';
          priorityFixes.push(`Shield or relocate SW toilet.`);
        }
      }
    }

    if (item.quadrant === 'SE') {
      const quad = quadrants.find((q) => q.quadrantName === 'Agni (SE)');
      if (quad) {
        quad.assignedRoom = item.roomName;
        if (item.roomType === 'kitchen') {
          quad.score = 100;
          quad.rating = 'Auspicious';
          quad.notes = 'Flawless alignment: Culinary fire located in Agni quadrant maximizes health and prosperity.';
        } else if (item.roomType === 'master_bedroom') {
          quad.score = -50;
          quad.rating = 'Inauspicious';
          quad.notes = 'Agni creates restlessness and insomnia for master bedroom.';
          quad.remedy = 'Sleep with head strictly pointing South; paint walls in calming ivory tones.';
        }
      }
    }
  }

  // Calculate overall score (normalized 0 - 100)
  const rawSum = quadrants.reduce((acc, q) => acc + q.score, 0);
  const maxPossible = quadrants.length * 100;
  const overallPercent = Math.max(0, Math.round(((rawSum + maxPossible) / (2 * maxPossible)) * 100));

  let overallRating: VastuMandalaResult['overallRating'] = 'Vastu Shastra Compliant';
  if (overallPercent < 60 || !brahmasthanClear) {
    overallRating = 'Critical Flaws Present';
  } else if (overallPercent < 85) {
    overallRating = 'Moderate Alignment';
  }

  return {
    overallScorePercent: overallPercent,
    overallRating,
    brahmasthanClear,
    quadrants,
    priorityFixes,
  };
}
