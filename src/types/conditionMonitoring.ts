// TypeScript interfaces for Industrial Condition Monitoring (CM) Modules
// Covering: Thermography, Vibration Analysis, Oil Analysis, Lubrication, MFL Cable Testing, NDT

export type CMSubDomain = 
  | 'vibration'
  | 'thermography'
  | 'oil_analysis'
  | 'lubrication'
  | 'mfl_cable'
  | 'ndt';

export type KeyEquipmentType = 'motor' | 'gearbox' | 'diesel_generator' | 'return_wheel' | string;

export interface CMBaseRecord {
  id: string;
  subDomain: CMSubDomain;
  equipmentId: string;
  equipmentName: string;
  customComponentName?: string; // Custom name of the component entered by user
  partName?: string; // Custom part/component name
  inspector: string; // Mandatory authority tracking who conducted test
  dateJalali: string;
  dateGregorian: string;
  time: string;
  reportPdfUrl?: string;
  reportPdfName?: string;
  reportPdfSize?: number;
  notes?: string;
  createdAt: string;
}

// ----------------------------------------------------
// 1. VIBRATION ANALYSIS
// ----------------------------------------------------
export type VibrationAxis = 'A' | 'H' | 'V'; // Axial, Horizontal, Vertical
export type BearingLocation = 'DE' | 'NDE'; // Drive End, Non-Drive End
export type AccMetricMode = 'Peak' | 'RMS';

export interface FrequencyBandThresholds {
  fMin: number; // Hz (e.g. 10 Hz)
  fMax: number; // Hz (e.g. 1000 Hz)
  zoneAB: number; // Transition limit A -> B
  zoneBC: number; // Transition limit B -> C
  zoneCD: number; // Transition limit C -> D
}

export interface VibrationGridMatrix {
  // DE (Drive End)
  de_velocity_a: number;
  de_velocity_h: number;
  de_velocity_v: number;
  de_acc_a: number;
  de_acc_h: number;
  de_acc_v: number;
  // NDE (Non-Drive End)
  nde_velocity_a: number;
  nde_velocity_h: number;
  nde_velocity_v: number;
  nde_acc_a: number;
  nde_acc_h: number;
  nde_acc_v: number;
}

export interface VibrationRecord extends CMBaseRecord {
  subDomain: 'vibration';
  targetEquipment: 'motor' | 'gearbox' | 'diesel_generator' | 'return_wheel' | string;
  rpm?: number;
  powerKw?: number;
  accMode: AccMetricMode; // Toggleable selector: Peak vs RMS
  velocityMetric: 'RMS'; // Locked permanently to RMS (mm/s)
  lfBand: FrequencyBandThresholds;
  hfBand: FrequencyBandThresholds;
  matrix: VibrationGridMatrix;
  overallZone: 'A' | 'B' | 'C' | 'D';
}

// ----------------------------------------------------
// 2. THERMOGRAPHY
// ----------------------------------------------------
export type ThermographyComponent = 
  | 'PLC Electrical Panel' 
  | 'Drive Electrical Panel' 
  | 'Rubber Liners / Sheave Liners' 
  | string;

export interface ThermographyRecord extends CMBaseRecord {
  subDomain: 'thermography';
  targetComponent: ThermographyComponent;
  maxTemperature: number; // °C
  ambientTemperature: number; // °C
  deltaT: number; // °C = max - ambient
  hotspotLocation?: string;
  operatingLoad?: string; // e.g. "75% load, 140A"
  thermalImageUrl?: string;
  severity: 'normal' | 'warning' | 'critical';
}

// ----------------------------------------------------
// 3. OIL ANALYSIS
// ----------------------------------------------------
export interface OilElementalGrid {
  fe: number; // Iron (Fe) in PPM
  na: number; // Sodium (Na) in PPM
  pq: number; // Particle Quantifier Index
  cu: number; // Copper (Cu) in PPM
  pb: number; // Lead (Pb) in PPM
}

export interface OilAnalysisRecord extends CMBaseRecord {
  subDomain: 'oil_analysis';
  lubricantName: string; // Commercial name e.g. "Mobil SHC 630"
  operatingHours: number; // Service life in hours
  elements: OilElementalGrid;
  viscosity40?: number; // cSt @ 40°C
  tan?: number; // Total Acid Number (mg KOH/g)
  waterPpm?: number; // Water content in PPM
  isoCleanliness?: string; // e.g. "18/16/13"
  oilCondition: 'normal' | 'warning' | 'critical';
}

// ----------------------------------------------------
// 4. MFL CABLE TESTING
// ----------------------------------------------------
export type MflDefectType = 'LF' | 'LMA' | 'Comp';
export type MflCriticalityAlert = 'NORMAL' | 'SERIOUS' | 'SEVERE' | 'OVER_LIMIT';

export interface MflCableRecord extends CMBaseRecord {
  subDomain: 'mfl_cable';
  cableName: string; // e.g. "Haul Rope / کابل کششی اصلی"
  cableDiameter: number; // mm
  cableLength: number; // meters
  defectPosition: number; // exact distance in meters along cable
  defectType: MflDefectType;
  lmaPercentage: number; // % LMA
  criticality: MflCriticalityAlert;
  brokenWiresCount?: number;
  recommendedAction?: string;
}

// ----------------------------------------------------
// 5. LUBRICATION MANAGEMENT
// ----------------------------------------------------
export interface LubricationCMRecord extends CMBaseRecord {
  subDomain: 'lubrication';
  component: string;
  lubricantName: string;
  lubricantType: 'گریس (Grease)' | 'روغن (Oil)' | string;
  interval: string; // e.g. "ماهانه", "۳ ماهه", "۶ ماهه", "سالانه"
  volume: string; // e.g. "60 gr", "28 Liters"
  nextDueDateJalali?: string;
  status: 'normal' | 'due_soon' | 'overdue';
  operatingHours?: number;
}

export type LubricationRecord = any;

// ----------------------------------------------------
// 6. NON-DESTRUCTIVE TESTING (NDT)
// ----------------------------------------------------
export type NdtMethod = 'MT' | 'PT' | 'UT' | 'VT' | 'ET' | 'RT';
export type NdtResult = 'Accepted' | 'Conditional' | 'Rejected';

export interface NdtRecord extends CMBaseRecord {
  subDomain: 'ndt';
  componentName: string;
  ndtMethod: NdtMethod;
  standardCriteria: string; // e.g. "EN 12927 / ISO 9712"
  indicationsFound: string; // defect localization / description
  result: NdtResult;
  nextDueJalali?: string;
}
