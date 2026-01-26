import { useState } from 'react';
import { User } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, FileText, ClipboardList, RefreshCw, Truck } from 'lucide-react';

// Import sub-pages
import { ImportPage } from './ImportPage';
import { TransfersPage } from './TransfersPage';
import { MovementsPage } from './MovementsPage'; // Ensure this matches actual export
import { ConferencePage } from './ConferencePage';

interface LogisticsPageProps {
    user: User;
}

export const LogisticsPage = ({ user }: LogisticsPageProps) => {
    const [activeTab, setActiveTab] = useState('movements');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Truck className="w-8 h-8 text-emerald-600" />
                        Logística & Estoque
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Central de operações: Movimentações, Importação e Conferência.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-lg grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
                    <TabsTrigger value="movements" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <RefreshCw className="w-4 h-4 mr-2" /> Movimentação
                    </TabsTrigger>
                    <TabsTrigger value="import" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4 mr-2" /> Importar XML
                    </TabsTrigger>
                    <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ArrowLeftRight className="w-4 h-4 mr-2" /> Transferências
                    </TabsTrigger>
                    <TabsTrigger value="conference" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ClipboardList className="w-4 h-4 mr-2" /> Conferência
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="movements" className="focus-visible:ring-0">
                    <MovementsPage user={user} />
                </TabsContent>

                <TabsContent value="import" className="focus-visible:ring-0">
                    <ImportPage user={user} />
                </TabsContent>

                <TabsContent value="transfers" className="focus-visible:ring-0">
                    <TransfersPage user={user} />
                </TabsContent>

                <TabsContent value="conference" className="focus-visible:ring-0">
                    <ConferencePage user={user} />
                </TabsContent>
            </Tabs>
        </div>
    );
};
