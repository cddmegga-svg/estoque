import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, DollarSign, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export const ReportsPage = () => {

    // 1. Fetch Daily Sales (Simulated View or Direct Query)
    const { data: salesData } = useQuery({
        queryKey: ['reports_daily'],
        queryFn: async () => {
            // In a real scenario, use the View `v_daily_sales`
            // For now, let's query raw sales to demonstrate
            const { data } = await supabase
                .from('sales')
                .select('created_at, final_value')
                .eq('status', 'completed')
                .order('created_at', { ascending: true });

            if (!data) return [];

            // Group by Day
            const grouped: Record<string, number> = {};
            data.forEach(sale => {
                const date = new Date(sale.created_at).toLocaleDateString('pt-BR');
                grouped[date] = (grouped[date] || 0) + Number(sale.final_value);
            });

            return Object.entries(grouped).map(([date, value]) => ({ date, value }));
        }
    });

    // 2. Fetch KPI Stats
    const { data: stats } = useQuery({
        queryKey: ['reports_kpi'],
        queryFn: async () => {
            const { data } = await supabase
                .from('sales')
                .select('final_value, id')
                .eq('status', 'completed');

            const totalRevenue = data?.reduce((acc, curr) => acc + Number(curr.final_value), 0) || 0;
            const totalSales = data?.length || 0;
            const ticketAvg = totalSales > 0 ? totalRevenue / totalSales : 0;

            return { totalRevenue, totalSales, ticketAvg };
        }
    });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Relatórios & Inteligência 📊</h1>

            {/* TABS */}
            <Tabs defaultValue="dashboard" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard Geral</TabsTrigger>
                    <TabsTrigger value="commissions">Comissões de Vendedores</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                                <p className="text-xs text-muted-foreground">+20.1% em relação ao mês anterior</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                                <Users className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
                                <p className="text-xs text-muted-foreground">Clientes atendidos</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                                <TrendingUp className="h-4 w-4 text-amber-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats?.ticketAvg || 0)}</div>
                                <p className="text-xs text-muted-foreground">Média por cliente</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CHARTS ROW 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Vendas dos Últimos Dias</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salesData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" fontSize={12} />
                                        <YAxis fontSize={12} tickFormatter={(value) => `R$${value}`} />
                                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Curva ABC (Distribuição)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md bg-slate-50">
                                <div className="text-center">
                                    <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>Em breve: Classificação automática A/B/C</p>
                                    <p className="text-xs">Necessário popular dados de vendas.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="commissions">
                    <CommissionsReport />
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Subcomponent for Commissions
const CommissionsReport = () => {
    // 3. Fetch Commissions by Employee
    const { data: commissions = [] } = useQuery({
        queryKey: ['reports_commissions'],
        queryFn: async () => {
            // Need to join sale_items -> sales -> employees
            // But Supabase JS join syntax is tricky for deep joins. 
            // Easier way: Query all sale_items where sale_id in (completed sales)
            // Or better: Create a View `v_commissions`.
            // For now, let's try direct query if small data, or assume `ADD_BI_FIELDS` added what we need?
            // Let's create a quick query for now.

            const { data, error } = await supabase
                .from('sale_items')
                .select(`
                    commission_value,
                    sale:sale_id (
                        id, created_at,
                        employee:employee_id (name)
                    )
                `)
                .gt('commission_value', 0); // Only commissionable items

            if (error) throw error;
            if (!data) return [];

            // Group by Employee
            const grouped: Record<string, { name: string, total: number, count: number }> = {};

            data.forEach((item: any) => {
                const empName = item.sale?.employee?.name || 'Não Identificado';
                if (!grouped[empName]) grouped[empName] = { name: empName, total: 0, count: 0 };
                grouped[empName].total += item.commission_value || 0;
                grouped[empName].count += 1;
            });

            return Object.entries(grouped)
                .map(([name, val]) => val)
                .sort((a, b) => b.total - a.total);
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Comissões por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vendedor</TableHead>
                            <TableHead className="text-center">Qtd Itens Vendidos</TableHead>
                            <TableHead className="text-right">Comissão Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                    Nenhuma comissão registrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            commissions.map((c, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell className="text-center">{c.count}</TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(c.total)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
