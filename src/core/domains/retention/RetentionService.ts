import { IReten��onRepository } from '@/core/interfaces/IReten��onRepository';
import { IDocumentRepository, DocumentEntity } from '@/core/interfaces/IDocumentRepository';
import { IAuditRepository } from '@/core/interfaces/IAuditRepository';

export class Reten��onService {
  constructor(
    private retentionRepo: IReten��onRepository,
    private documentRepo: IDocumentRepository,
    private audit: IAuditRepository
  ) {}

  async evaluateDeletionEligibility(documentId: string, userId: string): Promise<{ eligible: boolean, reason: string }> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) return { eligible: false, reason: 'Documento n�o encontrado' };

    // 1. LEGAL HOLD � SOBERANO!
    const hasLegalHold = await this.retentionRepo.checkActiveLegalHolds(documentId);
    if (hasLegalHold) {
      await this.audit.logEvent({ user_id: userId, action: 'DELETION_BLOCKED_BY_LEGAL_HOLD', entity_type: 'document', entity_id: documentId });
      return { eligible: false, reason: 'Bloqueado por Legal Hold Ativo (Ordem de Preserva��o)' };
    }

    // 2. Busca Pol�tica de Reten��o
    const policy = await this.retentionRepo.getPolicyForDocument(doc.document_type, doc.tenant_id);
    if (!policy) {
      return { eligible: false, reason: 'Nenhuma pol�tica de reten��o definida. Exclus�o de seguran�a negada.' };
    }

    // 3. Calcula vencimento da reten��o
    const expiryDate = new Date(doc.created_at);
    expiryDate.setMonth(expiryDate.getMonth() + policy.retention_months);

    if (new Date() < expiryDate) {
      return { eligible: false, reason: `Per�odo de Reten��o Ativo. Vence em ${expiryDate.toLocaleDateString()}` };
    }

    // 4. Se a pol�tica exige revis�o humana (Review Required)
    if (policy.review_required) {
       return { eligible: false, reason: 'Per�odo expirado, mas requer revis�o/aprova��o manual pelo Respons�vel T�cnico.' };
    }

    return { eligible: true, reason: 'Reten��o Expirada. Eleg�vel para exclus�o.' };
  }
}
