import { IDocumentRepository, DocumentEntity } from '@/core/interfaces/IDocumentRepository';
import { supabase } from '@/lib/supabase';

export class SupabaseDocumentRepository implements IDocumentRepository {
  async findById(id: string): Promise<DocumentEntity | null> {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as DocumentEntity;
  }

  async save(document: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const { data, error } = await supabase.from('documents').upsert([document]).select().single();
    if (error) throw error;
    return data as DocumentEntity;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('documents').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async findByHash(hash: string): Promise<DocumentEntity | null> {
    // Usando maybeSingle para lidar com deduplicação nativa
    const { data, error } = await supabase.from('documents').select('*').eq('hash_sha256', hash).maybeSingle();
    if (error || !data) return null;
    return data as DocumentEntity;
  }
}
