import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, DollarSign, CreditCard, Wallet, RefreshCw, Lock, Printer } from 'lucide-react';
import { MoneyInput } from '@/components/ui/money-input';

interface SaleQueueItem {
    id: string;
    customer_name: string;
    total_value: number;
    discount_value: number;
    final_value: number;
    created_at: string;
    salesperson_name: string; // From join
    salesperson_code: string; // From join
    items_count: number;
}

interface CashRegister {
    id: string;
    status: 'open' | 'closed';
    opening_balance: number;
    closing_balance?: number;
    opened_at: string;
}

export const POSPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State
    const [selectedSale, setSelectedSale] = useState<SaleQueueItem | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'money' | 'card' | 'pix'>('money');
    const [amountPaid, setAmountPaid] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Register State
    const [isRegisterOpenDialog, setIsRegisterOpenDialog] = useState(false);
    const [openingBalance, setOpeningBalance] = useState(0);

    // Fetch Cash Register Status for Current User
    const { data: currentRegister, isLoading: isLoadingRegister } = useQuery({
        queryKey: ['cash_register', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('user_id', user?.id)
                .eq('status', 'open')
                .maybeSingle();

            if (error) throw error;
            return data as CashRegister | null;
        }
    });

    // Fetch Queue (Pending Sales)
    const { data: queue = [], refetch: refetchQueue } = useQuery({
        queryKey: ['pos_queue', user?.filialId],
        queryFn: async () => {
            // Join with users to get salesperson name
            // Note: Supabase join syntax: `users!sales_salesperson_id_fkey(name, employee_code)`
            // Depending on relationship name.
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id, customer_name, total_value, discount_value, final_value, created_at,
                    salesperson:salesperson_id(name, employee_code),
                    sale_items(count)
                `)
                .eq('filial_id', user?.filialId)
                .eq('payment_status', 'pending')
                .eq('status', 'open') // or 'completed' if using our previous logic, but we changed to 'open' in SalesPage
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                customer_name: item.customer_name || 'Consumidor Final',
                total_value: item.total_value,
                discount_value: item.discount_value,
                final_value: item.final_value,
                created_at: item.created_at,
                salesperson_name: item.salesperson?.name || 'Sistema',
                salesperson_code: item.salesperson?.employee_code || '-',
                items_count: item.sale_items?.[0]?.count || 0
            }));
        },
        enabled: !!user?.filialId,
        refetchInterval: 10000 // Auto-refresh every 10s
    });

    // Validations
    useEffect(() => {
        if (!isLoadingRegister && !currentRegister) {
            setIsRegisterOpenDialog(true);
        }
    }, [currentRegister, isLoadingRegister]);

    const change = Math.max(0, amountPaid - (selectedSale?.final_value || 0));
    const pending = Math.max(0, (selectedSale?.final_value || 0) - amountPaid);
    const canPay = amountPaid >= (selectedSale?.final_value || 0);

    // Actions
    const handleOpenRegister = async () => {
        try {
            const { error } = await supabase
                .from('cash_registers')
                .insert({
                    user_id: user?.id,
                    filial_id: user?.filialId,
                    opening_balance: openingBalance,
                    status: 'open'
                });

            if (error) throw error;

            toast({ title: 'Caixa Aberto', description: 'Sessão iniciada com sucesso.' });
            queryClient.invalidateQueries({ queryKey: ['cash_register'] });
            setIsRegisterOpenDialog(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível abrir o caixa.' });
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedSale || !currentRegister) return;

        setIsProcessing(true);
        try {
            // Update Sale
            const { error } = await supabase
                .from('sales')
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    payment_method: paymentMethod,
                    cashier_id: user?.id,
                    cash_register_id: currentRegister.id,
                    // Store change?
                })
                .eq('id', selectedSale.id);

            if (error) throw error;

            // Add movement to cash register? Usually we track summary, but detailed movements are good.
            // But 'cash_movements' table we designed for Bleed/Supply, not every sale. 
            // Sales are linked via cash_register_id, so we can sum them up later.

            toast({ title: 'Venda Finalizada!', description: `Troco: ${formatCurrency(change)}`, className: 'bg-emerald-600 text-white' });

            setSelectedSale(null);
            setAmountPaid(0);
            refetchQueue();

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao processar pagamento.' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoadingRegister) return <div className="p-8">Carregando Frente de Caixa...</div>;

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4">
            {/* LEFT: Queue */}
            <Card className="w-1/3 flex flex-col">
                <CardHeader className="bg-slate-50 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Fila de Atendimento</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => refetchQueue()}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                    {queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                            <p>Nenhum pedido pendente.</p>
                        </div>
                    ) : (
                        <div className="divide-y relative">
                            {queue.map((sale: SaleQueueItem) => (
                                <div
                                    key={sale.id}
                                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedSale?.id === sale.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}`}
                                    onClick={() => {
                                        setSelectedSale(sale);
                                        setAmountPaid(sale.final_value); // Auto-fill exact amount for convenience
                                    }}
                                >
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-slate-800">{sale.customer_name}</span>
                                        <Badge variant="outline" className="text-xs">{sale.salesperson_code}</Badge>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>{sale.items_count} itens</span>
                                        <span className="font-mono text-emerald-700 font-bold">{formatCurrency(sale.final_value)}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        {formatDate(sale.created_at)} • Vend: {sale.salesperson_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t p-2 bg-slate-100 flex justify-between text-xs text-muted-foreground">
                    <span>Sessão: {currentRegister?.id.slice(0, 8)}</span>
                    <span>Aberto em: {currentRegister && formatDate(currentRegister.opened_at)}</span>
                </CardFooter>
            </Card>

            {/* RIGHT: Payment Area */}
            <div className="flex-1 flex flex-col gap-4">
                {selectedSale ? (
                    <Card className="flex-1 flex flex-col border-emerald-500/20 shadow-lg">
                        <CardHeader className="border-b pb-6">
                            <CardTitle className="flex justify-between items-center text-2xl">
                                <span>Pagamento</span>
                                <span className="text-emerald-600 font-bold text-3xl">{formatCurrency(selectedSale.final_value)}</span>
                            </CardTitle>
                            <CardDescription>
                                Cliente: {selectedSale.customer_name}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 p-8 space-y-8">
                            <div className="grid grid-cols-3 gap-4">
                                <Button
                                    variant={paymentMethod === 'money' ? 'default' : 'outline'}
                                    className={`h-24 flex flex-col gap-2 ${paymentMethod === 'money' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                    onClick={() => setPaymentMethod('money')}
                                >
                                    <DollarSign className="w-8 h-8" />
                                    Dinheiro (F1)
                                </Button>
                                <Button
                                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                    className={`h-24 flex flex-col gap-2 ${paymentMethod === 'card' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                    onClick={() => setPaymentMethod('card')}
                                >
                                    <CreditCard className="w-8 h-8" />
                                    Cartão (F2)
                                </Button>
                                <Button
                                    variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                                    className={`h-24 flex flex-col gap-2 ${paymentMethod === 'pix' ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                                    onClick={() => setPaymentMethod('pix')}
                                >
                                    <Wallet className="w-8 h-8" />
                                    PIX (F3)
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-lg">Valor Recebido</Label>
                                    <MoneyInput
                                        value={amountPaid}
                                        onChange={setAmountPaid}
                                        className="h-16 text-3xl font-bold font-mono"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-lg">Troco</Label>
                                    <div className={`h-16 flex items-center px-4 rounded-md border text-3xl font-bold font-mono ${change > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400'}`}>
                                        {formatCurrency(change)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="p-4 bg-slate-50 border-t flex gap-4">
                            <Button variant="outline" size="lg" className="flex-1" onClick={() => setSelectedSale(null)}>
                                Cancelar
                            </Button>
                            <Button
                                size="lg"
                                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 h-14 text-xl"
                                disabled={!canPay || isProcessing}
                                onClick={handleProcessPayment}
                            >
                                {isProcessing ? 'Processando...' : `Confirmar Pagamento (${formatCurrency(selectedSale.final_value)})`}
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-4 bg-slate-50/50">
                        <DollarSign className="w-16 h-16 opacity-20" />
                        <p className="text-xl">Selecione uma venda na fila para receber.</p>
                    </div>
                )}
            </div>

            {/* Open Register Dialog */}
            <Dialog open={isRegisterOpenDialog} onOpenChange={(open) => {
                // Prevent closing if no register (must open to work)
                if (currentRegister) setIsRegisterOpenDialog(open);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Abrir Caixa</DialogTitle>
                        <DialogDescription>
                            Informe o fundo de troco inicial para iniciar as operações.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Saldo Inicial (R$)</Label>
                            <MoneyInput value={openingBalance} onChange={setOpeningBalance} autoFocus />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleOpenRegister}>
                            Abrir Caixa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
