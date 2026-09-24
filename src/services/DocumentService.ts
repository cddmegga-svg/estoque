import { IDocumentRepository } from '@/core/interfaces/IDocumentRepository';
import { IStorageProvider } from '@/core/interfaces/IStorageProvider';
import { IAuditRepository } from '@/core/interfaces/IAuditRepository';

export class DocumentService {
  constructor(
    private documentRepo: IDocumentRepository,
    private storage: IStorageProvider,
    private audit: IAuditRepository
  ) {}

  async processIncomingDocument(
    file: File, 
    tenantId: string, 
    pharmacyId: string, 
    userId: string, 
    calculateHash: (file: File) => Promise<string>
  ) {
    // 1. Gera o Hash SHA-256 (Garantia de Integridade)
    const hash = await calculateHash(file);
    
    // 2. Anti-Deduplicação (Idempotência)
    const existing = await this.documentRepo.findByHash(hash);
    if (existing) {
      await this.audit.logEvent({
        user_id: userId,
        action: 'DUPLICATE_DETECTED',
        entity_type: 'document',
        entity_id: existing.id,
        metadata: { original_name: file.name, message: 'Tentativa de reenvio de arquivo já armazenado' }
      });
      return existing; // Retorna o que já está no cofre
    }

    // 3. Storage Isolado
    const storageKey = "tenant_" + tenantId + "/" + Date.now() + "_" + file.name;
    await this.storage.uploadFile(storageKey, file);

    // 4. Salva Metadados
    const newDoc = await this.documentRepo.save({
      tenant_id: tenantId,
      pharmacy_id: pharmacyId,
      document_type: 'GENERIC',
      file_name: file.name,
      hash_sha256: hash,
      storage_key: storageKey,
      status: 'RECEIVED',
      created_at: new Date()
    });

    // 5. Auditoria de Entrada Imutável
    await this.audit.logEvent({
      user_id: userId,
      action: 'DOCUMENT_RECEIVED',
      entity_type: 'document',
      entity_id: newDoc.id,
      metadata: { hash, size: file.size }
    });

    return newDoc;
  }
}
