import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, FileText, Search, Lock } from 'lucide-react';

export const DocumentsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Cofre Digital</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie e audite receitas, notificações e documentos preservados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquivos Preservados</CardTitle>
          <CardDescription>Listagem imutável de registros.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs text-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3">Documento (ID / Arquivo)</th>
                  <th className="px-6 py-3">Origem</th>
                  <th className="px-6 py-3">Tipo / Reten��o</th>
                  <th className="px-6 py-3">Status SNCR</th>
                  <th className="px-6 py-3">Integridade</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500"/>
                      <span>REC-2026-9921.pdf</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">Impressora Virtual</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">ANTIMICROBIANO</span>
                  </td>
                  <td className="px-6 py-4 text-emerald-600 font-semibold">BAIXA REALIZADA</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-4 h-4"/> <span>Válido</span>
                    </div>
                  </td>
                </tr>
                <tr className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500"/>
                      <span>NOTIF-AMARELA-112.pdf</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">Alpha7 Connector</td>
                  <td className="px-6 py-4">
                    <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded">AMARELA (A)</span>
                  </td>
                  <td className="px-6 py-4 text-emerald-600 font-semibold">VALIDADO ICP-BRASIL</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-4 h-4"/> <span>Válido</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};