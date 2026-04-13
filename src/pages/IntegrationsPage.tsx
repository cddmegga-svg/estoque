import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Activity, Webhook, Code, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function IntegrationsPage() {
    const { user } = useAuth();
    
    // In a real scenario, this would be fetched from the actual project URL env
    const apiUrl = import.meta.env.VITE_SUPABASE_URL + '/rest/v1/rpc/api_register_external_sale';
    
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-800">Integrações (API)</h2>
                <p className="text-muted-foreground mt-2">
                    Gerencie a comunicação do nosso sistema com o banco de dados da sua farmácia (Alpha7 / Lothus PDV).
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status do Serviço Receptivo</CardTitle>
                        <Activity className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">Online</div>
                        <p className="text-xs text-muted-foreground">Ouvindo baixas de estoque 24/7</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Sincronizações Hoje</CardTitle>
                        <Webhook className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Aguardando a primeira conexão</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-blue-100 shadow-sm">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 rounded-t-xl pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                        <Code className="h-5 w-5 text-blue-600" /> 
                        Manual de Integração (Para o suporte do PDV)
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                        Envie estas instruções para o suporte do seu PDV (Alpha7/Lothus) ou para a nossa equipe configurar o Sincronizador Local.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">1. Endpoint da API (POST)</h4>
                        <code className="bg-slate-100 px-3 py-2 rounded-md border text-sm text-pink-600 break-all w-full block">
                            {apiUrl}
                        </code>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2 mt-4">2. Autenticação (Headers)</h4>
                        <div className="bg-slate-900 p-4 rounded-md text-slate-300 text-sm font-mono overflow-x-auto">
                            apikey: "A chave anônima ou de serviço do projeto"<br/>
                            Authorization: "Bearer SEU_TOKEN_JWT"
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2 mt-4">3. Formato do Corpo (JSON Payload)</h4>
                        <p className="text-sm text-muted-foreground mb-2">Este é o formato que o PDV deve enviar a cada venda (ou em lotes a cada minuto):</p>
                        <pre className="bg-slate-900 p-4 rounded-md text-green-400 text-sm overflow-x-auto">
{`{
  "p_pdv_source": "Lothus",
  "p_items": [
    {
      "barcode": "789102030",
      "quantity": 2
    },
    {
      "barcode": "789405060",
      "quantity": 1
    }
  ]
}`}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
