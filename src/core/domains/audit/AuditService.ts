import { IAuditRepository, AuditLogEntity } from '@/core/interfaces/IAuditRepository';

export class AuditService {
  constructor(private auditRepo: IAuditRepository) {}

  async logEvent(
    userId: string, 
    action: string, 
    entityType: string, 
    entityId: string, 
    metadata?: any
  ): Promise<AuditLogEntity> {
    return this.auditRepo.logEvent({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata
    });
  }

  async verifySystemIntegrity(): Promise<boolean> {
    return this.auditRepo.verifyChainIntegrity();
  }
}
