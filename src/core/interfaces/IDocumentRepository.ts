export interface DocumentEntity {
  id: string;
  tenant_id: string;
  pharmacy_id: string;
  document_type: string;
  file_name: string;
  hash_sha256: string;
  storage_key: string;
  status: 'RECEIVED' | 'INDEXED' | 'ARCHIVED' | 'DELETED';
  retention_policy_id?: string;
  created_at: Date;
}

export interface IDocumentRepository {
  findById(id: string): Promise<DocumentEntity | null>;
  save(document: Partial<DocumentEntity>): Promise<DocumentEntity>;
  updateStatus(id: string, status: string): Promise<void>;
  findByHash(hash: string): Promise<DocumentEntity | null>;
}
