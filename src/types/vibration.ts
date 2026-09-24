export type IsoZone = 'A' | 'B' | 'C' | 'D' | '';
export type MeasurementDirection = 'H' | 'V' | 'Ax';
export type AccelerationMode = 'RMS' | 'Peak';

export type KeyVibrationEquipment = 'motor' | 'gearbox' | 'diesel_generator' | 'return_wheel';

export interface SpectralPeak {
  frequency: number;
  amplitude: number;
}
export interface TrendPoint {
  time: number;
  value: number;
}
export interface DirectionalReading {
  id?: string;
  date?: string;
  direction: MeasurementDirection;
  velocityRMS: number;
  velocityPrev?: number;
  velocityAvg?: number;
  velocityZone: IsoZone;
  velocityTrend: TrendPoint[];
  accelerationVal: number; // can be RMS or Peak
  accelerationMode?: AccelerationMode;
  accelerationRMS?: number; // backwards compatibility
  accelerationPrev?: number;
  accelerationAvg?: number;
  accelerationZone: IsoZone;
  accelerationTrend: TrendPoint[];
  peaks: SpectralPeak[];
}
export interface VibrationPoint {
  id: string;
  pointName: string;
  equipmentType?: KeyVibrationEquipment;
  bearings?: string;
  inspector?: string;
  date?: string;
  accelerationMode?: AccelerationMode;
  readings: DirectionalReading[];
  currentStatus?: string;
  previousStatus?: string;
  observations?: string;
  probableDefects?: string;
  recommendedActions?: string;
  velocityZoneLimits?: string;
  accelerationZoneLimits?: string;
  standard?: string; // default 'ISO 20816'
}
export interface VibrationAssetMetadata {
  reportCode: string;
  date: string;
  client: string;
  inspector: string;
  projectName?: string;
  unitName: string;
  machineName: string;
  equipmentType?: KeyVibrationEquipment;
  driveChain: string;
  rpm: number;
  powerKw: number;
  bearings: string;
  currentStatus: string;
  previousStatus: string;
  observations: string;
  probableDefects: string;
  recommendedActions: string;
  standard?: string; // 'ISO 20816'
  accelerationMode?: AccelerationMode;
  points: VibrationPoint[];
}
