export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'COMPLEX_ADMIN' 
  | 'LINE_SUPERVISOR' 
  | 'STATION_OPERATOR' 
  | 'manager' 
  | 'operator'
  | 'GENERAL_MANAGER'
  | 'FACILITY_MANAGER'
  | 'LINE_SPECIALIST'
  | 'LINE_OPERATOR';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  complexId?: string;
  lineId?: string;
  stationId?: string;
  phone?: string;
  position?: string;
}

export interface Complex {
  id: string;
  name: string;
  nameEn?: string;
  location: string;
  locationEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl?: string;
  createdAt: string;
  password?: string;
  linesCount?: number;
  pendingApprovalCount?: number;
  lastInspectionDate?: string;
  lastVisitDate?: string;
}

export type ApprovalEntityType = 'EQUIPMENT' | 'TASK' | 'LINE' | 'STATION' | 'INSPECTION';
export type ApprovalActionType = 'DELETE' | 'EDIT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EscalationTier = 'SPECIALIST' | 'FACILITY_MANAGER' | 'GENERAL_MANAGER';

export interface PendingApprovalRequest {
  id: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: UserRole;
  targetEntityType: ApprovalEntityType;
  targetEntityId: string;
  targetEntityName: string;
  actionType: ApprovalActionType;
  proposedDiff?: {
    before?: any;
    after?: any;
  };
  rationale: string;
  complexId?: string;
  lineId?: string;
  stationId?: string;
  escalationTier: EscalationTier;
  status: ApprovalStatus;
  reviewedBy?: {
    id: string;
    name: string;
    role: UserRole;
  };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Line {
  id: string;
  complexId: string;
  name: string;
  nameEn?: string;
  type: string;
  createdAt: string;
}

export interface Station {
  id: string;
  lineId: string;
  name: string;
  nameEn?: string;
  sequenceNumber: number;
  createdAt: string;
}

export interface Settings {
  companyName: string;
  logoUrl: string;
  complexPortalTitle?: string;
  complexPortalTitleEn?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  complexId?: string;
  lineId?: string;
  stationId?: string;
}

export interface Equipment {
  id: string;
  stationId?: string;
  lineId?: string;
  complexId?: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
  imageUrl?: string;
}

export interface Task {
  id: string;
  equipmentId: string;
  taskCode?: string;
  subject: string;
  frequency: string;
  nextDate: string;
  lastDate: string;
  instructions?: string;
  criteria?: string;
  partName?: string;
  warning?: string;
  standard?: 'Bartholet' | 'Doppelmayr' | 'ISO' | 'General' | string;
}

export interface LubricationRecord {
  id: string;
  equipmentType: 'motor' | 'gearbox' | 'diesel_generator' | 'return_wheel';
  equipmentName: string;
  component: string;
  lubricantType: string;
  lastDate: string;
  nextDate: string;
  interval: string;
  volume: string;
  technician?: string;
  status: 'normal' | 'due_soon' | 'overdue';
  notes?: string;
}

export interface Inspection {
  id: string;
  taskId: string;
  comment: string;
  status: string;
  date: string;
  operatingHours?: number;
}

export interface Downtime {
  id: string;
  equipmentId?: string;
  reason: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  notes: string;
}

export interface ConditionLog {
  id: string;
  equipmentId: string;
  component: string;
  lastServiceDate: string;
  technician: string;
  operatingHours: number;
  temperature: number;
  thermographyImage?: string;
  notes: string;
}

export interface CriticalComponent {
  id: string;
  equipmentId: string;
  componentType: string;
  renewalDate: string;
  status: string;
  defectLog: string;
  inspectionDetails: string;
}
