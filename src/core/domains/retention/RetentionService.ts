import { IRetentionRepository } from '@/core/interfaces/IRetentionRepository';
import { IDocumentRepository, DocumentEntity } from '@/core/interfaces/IDocumentRepository';
import { IAuditRepository } from '@/core/interfaces/IAuditRepository';

export class RetentionService {
  constructor(
    private retentionRepo: IRetentionRepository,
    private documentRepo: IDocumentRepository,
    private audit: IAuditRepository
  ) {}

  async evaluateDeletionEligibility(documentId: string, userId: string): Promise<{ eligible: boolean, reason: string }> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return { eligible: false, reason: 'Documento não encontrado' };

    // 1. LEGAL HOLD É SOBERANO!
    const hasLegalHold = await this.retentionRepo.checkActiveLegalHolds(documentId);
    if (hasLegalHold) {
      await this.audit.logEvent({ user_id: userId, action: 'DELETION_BLOCKED_BY_LEGAL_HOLD', entity_type: 'document', entity_id: documentId });
      return { eligible: false, reason: 'Bloqueado por Legal Hold Ativo (Ordem de Preservação)' };
    }

    // 2. Busca Política de Retenção
    const policy = await this.retentionRepo.getPolicyForDocument(doc.document_type, doc.tenant_id);
    if (!policy) {
      return { eligible: false, reason: 'Nenhuma política de retenção definida. Exclusão de segurança negada.' };
    }

    // 3. Calcula vencimento da retenção
    const expiryDate = new Date(doc.created_at);
    expiryDate.setMonth(expiryDate.getMonth() + policy.retention_months);

    if (new Date() < expiryDate) {
      return { eligible: false, reason: `Período de Retenção Ativo. Vence em ${expiryDate.toLocaleDateString()}` };
    }

    // 4. Se a política exige revisão humana (Review Required)
    if (policy.review_required) {
       return { eligible: false, reason: 'Período expirado, mas requer revisão/aprovação manual pelo Responsável Técnico.' };
    }

    return { eligible: true, reason: 'Retenção Expirada. Elegível para exclusão.' };
  }
}
