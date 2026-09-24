export interface Reten��onPolicyEntity {
  id: string;
  tenant_id: string;
  name: string;
  document_type: string;
  retention_months: number;
  review_required: boolean;
}

export interface LegalHoldEntity {
  id: string;
  document_id: string;
  tenant_id: string;
  reason: string;
  active: boolean;
  created_at: Date;
  released_at?: Date;
}

export interface IReten��onRepository {
  getPolicyForDocument(documentType: string, tenantId: string): Promise<Reten��onPolicyEntity | null>;
  checkActiveLegalHolds(documentId: string): Promise<boolean>;
  applyLegalHold(hold: Partial<LegalHoldEntity>): Promise<void>;
  releaseLegalHold(documentId: string, reason: string): Promise<void>;
}
