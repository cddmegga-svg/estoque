import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Server, HardDrive, Network, CheckCircle2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BackupsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Backups (Disaster Recovery)</h2>
          <p className="text-muted-foreground mt-1">
            Monitoramento da Regra 3-2-1. Backups físicos e criptografados para conformidade com RDC 1.028/2026.
          </p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <RefreshCw className="w-4 h-4" />
          Forçar Backup Agora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Camada 1: Rede Local */}
        <Card className="border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Camada 1: Espelho</CardTitle>
              <Server className="w-5 h-5 text-emerald-600" />
            </div>
            <CardDescription>Rede Local (PC Secundário)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-emerald-700">Sincronizado</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Frequência: <span className="text-foreground font-medium">A cada 15 min</span></p>
                <p className="text-xs text-muted-foreground">Último sucesso: <span className="text-foreground font-medium">Hoje, 11:30</span></p>
                <p className="text-xs text-muted-foreground">Destino: <span className="text-foreground font-mono">\\PC-CAIXA-02\Backup</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camada 2: Matriz */}
        <Card className="border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Camada 2: Cofre Matriz</CardTitle>
              <Network className="w-5 h-5 text-emerald-600" />
            </div>
            <CardDescription>VPN Sede Administrativa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-emerald-700">Túnel Estabelecido</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Frequência: <span className="text-foreground font-medium">De hora em hora</span></p>
                <p className="text-xs text-muted-foreground">Último sucesso: <span className="text-foreground font-medium">Hoje, 11:00</span></p>
                <p className="text-xs text-muted-foreground">Criptografia: <span className="text-foreground font-medium flex items-center gap-1 inline-flex"><Lock className="w-3 h-3"/> AES-256</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camada 3: HD Externo (Com Alerta Simulado) */}
        <Card className="border-red-200 bg-red-50/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-red-700">Camada 3: Físico</CardTitle>
              <HardDrive className="w-5 h-5 text-red-600 animate-pulse" />
            </div>
            <CardDescription className="text-red-600/80">HD Externo USB (Cold Storage)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-700">Unidade E:\ Desconectada</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-red-600/80">Frequência: <span className="font-medium text-red-800">Diário (03:00)</span></p>
                <p className="text-xs text-red-600/80">Próximo: <span className="font-medium text-red-800">Amanhã, 03:00</span></p>
                <p className="text-xs mt-2 p-2 bg-red-100 rounded text-red-800 border border-red-200">
                  Por favor, reconecte o HD Externo (Unidade E:) antes do fim do expediente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recuperação (Logs)</CardTitle>
          <CardDescription>Eventos de integridade e falhas de transporte reportados pelo sistema.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="text-sm text-muted-foreground p-4 bg-slate-50 border rounded-lg font-mono">
             [11:00:05] SUCESSO: Snapshot criptografado transferido para matriz (34 MB).<br/>
             [10:45:00] SUCESSO: Sincronização incremental com PC Secundário concluída.<br/>
             [10:30:00] SUCESSO: Sincronização incremental com PC Secundário concluída.<br/>
             <span className="text-red-500 font-bold">[09:12:33] ERRO: HD Externo (E:\) não localizado durante teste de integridade. Alerta disparado.</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};