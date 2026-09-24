import { UserRole, ApprovalActionType, ApprovalEntityType, EscalationTier } from '../types';

export function getRoleTier(role?: UserRole): number {
  if (!role) return 0;
  if (role === 'GENERAL_MANAGER' || role === 'SUPER_ADMIN' || role === 'manager') return 4;
  if (role === 'FACILITY_MANAGER' || role === 'COMPLEX_ADMIN') return 3;
  if (role === 'LINE_SPECIALIST' || role === 'LINE_SUPERVISOR') return 2;
  if (role === 'LINE_OPERATOR' || role === 'STATION_OPERATOR' || role === 'operator') return 1;
  return 0;
}

export function isGeneralManager(role?: UserRole): boolean {
  return getRoleTier(role) >= 4;
}

export function isFacilityManager(role?: UserRole): boolean {
  return getRoleTier(role) >= 3;
}

export function isLineSpecialist(role?: UserRole): boolean {
  return getRoleTier(role) >= 2;
}

export function isLineOperator(role?: UserRole): boolean {
  return getRoleTier(role) === 1;
}

export function getRoleTitle(role?: UserRole, isRtl: boolean = true): string {
  if (!role) return isRtl ? 'کاربر سیستم' : 'User';
  switch (role) {
    case 'GENERAL_MANAGER':
    case 'SUPER_ADMIN':
    case 'manager':
      return isRtl ? 'مدیر کل سیستم (General Manager)' : 'General Manager';
    case 'FACILITY_MANAGER':
    case 'COMPLEX_ADMIN':
      return isRtl ? 'مدیر مجموعه (Facility Manager)' : 'Facility Manager';
    case 'LINE_SPECIALIST':
    case 'LINE_SUPERVISOR':
      return isRtl ? 'کارشناس و سرپرست خط (Line Specialist)' : 'Line Specialist';
    case 'LINE_OPERATOR':
    case 'STATION_OPERATOR':
    case 'operator':
      return isRtl ? 'اپراتور خط و ایستگاه (Line Operator)' : 'Line Operator';
    default:
      return role;
  }
}

/**
 * Returns whether a role has direct authority to execute an action without approval.
 * As specified:
 * - General Manager can directly execute all actions.
 * - Facility Manager can directly execute actions within their complex, but deleting lines/complexes or critical changes require General Manager.
 * - Line Specialists & Line Operators MUST submit approval requests for:
 *   - Element Deletion (Equipment, Station, Line, Task)
 *   - Work order / Task Editing
 */
export function canDirectlyExecute(
  role: UserRole | undefined,
  action: ApprovalActionType,
  entityType: ApprovalEntityType
): boolean {
  const tier = getRoleTier(role);
  if (tier >= 4) return true; // General Manager can directly execute

  // Facility Manager can execute task edits or station actions, but deleting equipment/lines requires General Manager approval
  if (tier === 3) {
    if (action === 'DELETE' && (entityType === 'EQUIPMENT' || entityType === 'LINE')) {
      return false; // Escalate to General Manager
    }
    return true;
  }

  // Tiers 1 and 2 (Line Operator and Line Specialist) must always submit approval for restricted actions
  return false;
}

/**
 * Determines which tier must approve the request based on initiator tier and entity
 */
export function getRequiredEscalationTier(
  initiatorRole: UserRole,
  action: ApprovalActionType,
  entityType: ApprovalEntityType
): EscalationTier {
  const tier = getRoleTier(initiatorRole);
  if (tier === 1) {
    // Operator requests escalate to Specialist (or Facility Manager for deletions)
    return action === 'DELETE' ? 'FACILITY_MANAGER' : 'SPECIALIST';
  }
  if (tier === 2) {
    // Specialist requests escalate to Facility Manager
    return 'FACILITY_MANAGER';
  }
  // Facility Manager requests escalate to General Manager
  return 'GENERAL_MANAGER';
}

/**
 * Checks if a reviewer has sufficient authority to approve/reject a pending request
 */
export function canReviewRequest(
  reviewerRole: UserRole | undefined,
  escalationTier: EscalationTier
): boolean {
  const tier = getRoleTier(reviewerRole);
  if (tier >= 4) return true; // General Manager can approve anything
  if (escalationTier === 'GENERAL_MANAGER') return tier >= 4;
  if (escalationTier === 'FACILITY_MANAGER') return tier >= 3;
  if (escalationTier === 'SPECIALIST') return tier >= 2;
  return false;
}

export function canEditComplexImage(
  role?: UserRole,
  userComplexId?: string,
  targetComplexId?: string
): boolean {
  const tier = getRoleTier(role);
  if (tier >= 4) return true; // General Manager / Super Admin
  if (tier === 3) {
    // Facility Manager
    if (!userComplexId || userComplexId === targetComplexId) return true;
  }
  return false;
}
