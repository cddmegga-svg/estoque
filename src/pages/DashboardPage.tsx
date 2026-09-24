import { ShieldCheck, FileText, AlertTriangle, Lock, Search, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types';

interface DashboardPageProps {
  user: User;
  onNavigate: (page: string, params?: any) => void;
}

export const DashboardPage = ({ user, onNavigate }: DashboardPageProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Vis�o Geral de Compliance</h2>
          <p className="text-muted-foreground mt-1">
            Métricas de proteção, integridade e retenção de documentos do SNCR.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card onClick={() => onNavigate('documents')} className="cursor-pointer hover:bg-slate-50 transition-colors border-emerald-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Documentos Protegidos</CardDescription>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">14.289</div>
            <p className="text-xs text-muted-foreground mt-1">+123 inseridos hoje</p>
          </CardContent>
        </Card>

        <Card onClick={() => onNavigate('retention')} className="cursor-pointer hover:bg-slate-50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Aguardando Revisão</CardDescription>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">45</div>
            <p className="text-xs text-muted-foreground mt-1">Receitas com retenção expirada</p>
          </CardContent>
        </Card>

        <Card onClick={() => onNavigate('legal-holds')} className="cursor-pointer hover:bg-slate-50 transition-colors border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Legal Holds Ativos</CardDescription>
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">3</div>
            <p className="text-xs text-muted-foreground mt-1">Processos de fiscalização</p>
          </CardContent>
        </Card>

        <Card onClick={() => onNavigate('audit')} className="cursor-pointer bg-red-50/30 hover:bg-red-50 transition-colors border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Falhas de Integridade</CardDescription>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">0</div>
            <p className="text-xs text-muted-foreground mt-1">Hashes corrompidos detectados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Atividade dos Conectores Locais</CardTitle>
            <CardDescription>Status das integrações de ingestão de receitas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Impressora Virtual NexFarma</p>
                    <p className="text-sm text-muted-foreground">Spooler do Windows operando</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600">ONLINE</p>
                  <p className="text-xs text-muted-foreground">Última impressão há 5 min</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Printer className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Alpha7 Connector (Local)</p>
                    <p className="text-sm text-muted-foreground">Pasta monitorada</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">ONLINE</p>
                  <p className="text-xs text-muted-foreground">Último arquivo há 1 hora</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">SNCR API Endpoint</p>
                    <p className="text-sm text-muted-foreground">Validação Gov.br / ICP-Brasil</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">AUTENTICADO</p>
                  <p className="text-xs text-muted-foreground">e-CNPJ Válido</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};