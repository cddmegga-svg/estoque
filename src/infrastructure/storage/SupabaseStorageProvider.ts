import { IStorageProvider } from '@/core/interfaces/IStorageProvider';
import { supabase } from '@/lib/supabase';

export class SupabaseStorageProvider implements IStorageProvider {
  private bucket = 'documents_vault';

  async uploadFile(path: string, file: File | Blob): Promise<string> {
    const { data, error } = await supabase.storage.from(this.bucket).upload(path, file);
    if (error) throw error;
    return data.path;
  }

  async downloadFile(path: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(this.bucket).download(path);
    if (error) throw error;
    return data;
  }

  async verifyIntegrity(path: string, expectedHash: string): Promise<boolean> {
    // Futura implementação real de integridade criptográfica
    return true; 
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from(this.bucket).remove([path]);
    if (error) throw error;
  }
}
