// Ukes Immutable Audit Trail Engine — Universal BAPETEN Radiology Platform v2

export interface UkesAuditLogEntry {
  id: string;
  entityType: 'ASSESSMENT' | 'LHU' | 'CERTIFICATE' | 'SCOPE' | 'REGULATION' | 'SUB_SYSTEM' | 'BAPETEN_REPORT';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'SUBMIT' | 'REVIEW_APPROVE' | 'REVIEW_REJECT' | 'ISSUE_CERTIFICATE' | 'CANCEL';
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  userId: string;
  userRole: string;
  timestamp: string;
  reason?: string;
  ipAddress?: string;
}

const auditMemoryStore: UkesAuditLogEntry[] = [];

export function recordUkesAuditEntry(entry: Omit<UkesAuditLogEntry, 'id' | 'timestamp'>): UkesAuditLogEntry {
  const fullEntry: UkesAuditLogEntry = {
    ...entry,
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  auditMemoryStore.unshift(fullEntry);
  return fullEntry;
}

export function getAuditLogsForEntity(entityType: string, entityId: string): UkesAuditLogEntry[] {
  return auditMemoryStore.filter(log => log.entityType === entityType && log.entityId === entityId);
}
