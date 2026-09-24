import { IAuditRepository, AuditLogEntity } from '@/core/interfaces/IAuditRepository';
import { supabase } from '@/lib/supabase';
import CryptoJS from 'crypto-js';

export class SupabaseAuditRepository implements IAuditRepository {
  
  async logEvent(log: Omit<AuditLogEntity, 'id' | 'timestamp' | 'current_hash'>): Promise<AuditLogEntity> {
    // 1. Busca a ponta da cadeia (último log)
    const { data: lastLog } = await supabase
      .from('audit_logs')
      .select('current_hash')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = lastLog?.current_hash || 'GENESIS_BLOCK';
    
    // 2. Concatena os dados + hash anterior para formar a assinatura encadeada
    const payloadForHash = `${previousHash}|${log.user_id}|${log.action}|${log.entity_type}|${log.entity_id}|${JSON.stringify(log.metadata || {})}`;
    const currentHash = CryptoJS.SHA256(payloadForHash).toString();

    const newLog = {
      ...log,
      previous_hash: previousHash,
      current_hash: currentHash,
    };

    // 3. Persiste no banco de forma atômica
    const { data, error } = await supabase.from('audit_logs').insert([newLog]).select().single();
    if (error) throw error;
    
    return data as AuditLogEntity;
  }

  async verifyChainIntegrity(): Promise<boolean> {
    // 1. Puxa toda a cadeia de auditoria ordenadamente
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: true });
      
    if (error) throw error;
    if (!data || data.length === 0) return true;

    // 2. Valida cada elo da corrente (Tamper-Evident)
    let previous = 'GENESIS_BLOCK';
    for (const row of data) {
      const payload = `${previous}|${row.user_id}|${row.action}|${row.entity_type}|${row.entity_id}|${JSON.stringify(row.metadata || {})}`;
      const calculatedHash = CryptoJS.SHA256(payload).toString();
      
      if (calculatedHash !== row.current_hash) {
        console.error('ALERTA CRÍTICO: Quebra de integridade no registro', row.id);
        return false; // Alguém mexeu no banco diretamente!
      }
      previous = calculatedHash;
    }

    return true;
  }
}
