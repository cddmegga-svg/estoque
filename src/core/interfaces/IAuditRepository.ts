export interface AuditLogEntity {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: Date;
  metadata?: any;
  previous_hash?: string;
  current_hash: string;
}

export interface IAuditRepository {
  logEvent(log: Omit<AuditLogEntity, 'id' | 'timestamp' | 'current_hash'>): Promise<AuditLogEntity>;
  verifyChainIntegrity(): Promise<boolean>;
}
