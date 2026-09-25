import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, UserPlus, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminPage = ({ currentUser }: { currentUser?: any }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Configurações & Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Gestão de acesso ao Cofre Digital e certificados (e-CNPJ).
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Autorizados</CardTitle>
              <CardDescription>Colaboradores com acesso à infraestrutura de preservação.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-xs text-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3">Nome</th>
                      <th className="px-6 py-3">Papel</th>
                      <th className="px-6 py-3">Permissões de Cofre</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">JD</div>
                          <span>João Dono</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">Administrador</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">ACESSO TOTAL</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Editar</Button>
                      </td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">MF</div>
                          <span>Maria (Farmacêutica RT)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">Técnico</td>
                      <td className="px-6 py-4 flex flex-wrap gap-1">
                        <span className="bg-slate-100 text-slate-800 text-xs font-medium px-2 py-0.5 rounded">Consultar Cofre</span>
                        <span className="bg-slate-100 text-slate-800 text-xs font-medium px-2 py-0.5 rounded">Legal Holds</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Editar</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Certificado e-CNPJ
              </CardTitle>
              <CardDescription>Credencial usada para comunicação oficial com o SNCR.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-emerald-800">FARMACIA SAUDE LTDA</span>
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-emerald-700 mb-4">Válido até: 15/12/2026</p>
                <Button variant="outline" className="w-full text-xs" size="sm">Substituir Certificado A1</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
