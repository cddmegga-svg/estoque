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
import { AlertCircle, CheckCircle2, DollarSign, CreditCard, Wallet, RefreshCw, Lock, Printer, User as UserIcon, ShoppingBag } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
    items?: any[];
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
    const [isFiscalEnabled, setIsFiscalEnabled] = useState(true); // Default to Fiscal? Or User Config? Default True for now as requested skeleton.
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
                    employee:employee_id(name, pin), 
                    sale_items(quantity, unit_price, product_name)
                `)
                .eq('filial_id', user?.filialId)
                .eq('payment_status', 'pending')
                .eq('status', 'open')
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map((item: any) => ({
                id: item.id,
                customer_name: item.customer_name || 'Consumidor Final',
                total_value: item.total_value,
                discount_value: item.discount_value,
                final_value: item.final_value,
                created_at: item.created_at,
                salesperson_name: item.employee?.name || 'Sistema',
                salesperson_code: item.employee?.pin || '-',
                items_count: item.sale_items?.length || 0,
                items: item.sale_items
            }));
        },
    });

    // Fetch History (Completed Sales - Full Day)
    const { data: history = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['pos_history', user?.filialId],
        queryFn: async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id, customer_name, total_value, discount_value, final_value, created_at, payment_method,
                    employee:employee_id(name),
                    sale_items(quantity, unit_price, product_name)
                `)
                .eq('filial_id', user?.filialId)
                .eq('status', 'completed')
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user?.filialId,
        refetchInterval: 30000
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

    // Cashier Identity State
    const [cashierPin, setCashierPin] = useState('');
    const [isCashierDialogOpen, setIsCashierDialogOpen] = useState(false);

    // Opening Session State
    const [openingPin, setOpeningPin] = useState('');

    // Actions - Close Register
    const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
    const [closingValues, setClosingValues] = useState({ money: 0, card: 0, pix: 0 });
    const [calculatedTotals, setCalculatedTotals] = useState({ money: 0, card: 0, pix: 0, total: 0 });

    const handleOpenRegister = async () => {
        if (!openingPin) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Informe o PIN.' });
            return;
        }

        try {
            // Validate PIN
            const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('id, name, role')
                .eq('pin', openingPin)
                .single();

            if (empError || !employee) {
                toast({ variant: 'destructive', title: 'PIN Inválido', description: 'Funcionário não encontrado.' });
                return;
            }

            const { error } = await supabase
                .from('cash_registers')
                .insert({
                    user_id: user?.id,
                    filial_id: user?.filialId,
                    opening_balance: openingBalance,
                    status: 'open',
                    opening_employee_id: employee.id // Set Session Owner
                });

            if (error) throw error;

            toast({ title: 'Caixa Aberto', description: `Sessão iniciada por ${employee.name}` });
            queryClient.invalidateQueries({ queryKey: ['cash_register'] });
            setIsRegisterOpenDialog(false);
            setOpeningPin('');
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao abrir caixa.' });
        }
    };

    const handlePreCloseRegister = async () => {
        // Calculate Totals from History (or DB Query for safety)
        // Using 'history' from state since it covers "Today". 
        // Ideally we filter by 'cash_register_id' if multiple registers per day, but 'history' query above is by Filial/Day.
        // Better: Fetch aggregate from DB for THIS register session.
        if (!currentRegister) return;

        const { data, error } = await supabase
            .from('sales')
            .select('payment_method, final_value')
            .eq('cash_register_id', currentRegister.id)
            .eq('status', 'completed');

        if (!error && data) {
            const totals = data.reduce((acc: any, curr: any) => {
                acc[curr.payment_method] = (acc[curr.payment_method] || 0) + curr.final_value;
                acc.total += curr.final_value;
                return acc;
            }, { money: 0, card: 0, pix: 0, total: 0 });
            setClosingValues({ money: totals.money, card: totals.card, pix: totals.pix }); // Pre-fill with expected
            setCalculatedTotals(totals);
        }

        setIsCloseRegisterOpen(true);
    };

    const handleCloseRegister = async () => {
        if (!currentRegister) return;

        const totalReported = closingValues.money + closingValues.card + closingValues.pix;
        const diff = totalReported - calculatedTotals.total; // Simple diff

        try {
            const { error } = await supabase
                .from('cash_registers')
                .update({
                    status: 'closed',
                    closing_balance: totalReported, // Stores the user input total
                    closed_at: new Date().toISOString(),
                    notes: `Fechamento. Esperado: ${formatCurrency(calculatedTotals.total)}. Informado: ${formatCurrency(totalReported)}. Diff: ${formatCurrency(diff)}`
                })
                .eq('id', currentRegister.id);

            if (error) throw error;

            toast({ title: 'Caixa Fechado', description: `Sessão encerrada.` });
            queryClient.invalidateQueries({ queryKey: ['cash_register'] });
            setIsCloseRegisterOpen(false);

        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao fechar caixa.' });
        }
    };

    const initiatePayment = () => {
        if (!selectedSale || !currentRegister) return;

        // Check if Session has Owner
        // We need to type 'currentRegister' to include 'opening_employee_id' if we fetched it.
        // Assuming the hook query fetches it. We might need to check 'useCashRegister'.
        // If we don't have it in the type yet, we might need to cast or update type.
        // Let's assume we can access it (will check type def later).
        const sessionOwnerId = currentRegister.opening_employee_id;

        if (sessionOwnerId) {
            // Skip PIN, valid immediately.
            handleProcessPayment(sessionOwnerId);
        } else {
            // Ask for PIN (Legacy mode or if opened without owner)
            setCashierPin('');
            setIsCashierDialogOpen(true);
        }
    };

    const handleProcessPayment = async (overrideEmployeeId?: string) => {
        if (!selectedSale || !currentRegister) return;

        setIsProcessing(true);
        try {
            let employeeId = overrideEmployeeId;

            if (!employeeId) {
                // Validate Cashier PIN (Dialog Mode)
                const { data: cashier, error: cashierError } = await supabase
                    .from('employees')
                    .select('id, name, role')
                    .eq('pin', cashierPin)
                    .in('role', ['cashier', 'manager', 'admin'])
                    .eq('active', true)
                    .single();

                if (cashierError || !cashier) {
                    toast({ variant: 'destructive', title: 'PIN Inválido', description: 'Permissão insuficiente.' });
                    setIsProcessing(false);
                    return;
                }
                employeeId = cashier.id;
            }

            // Update Sale
            const { error } = await supabase
                .from('sales')
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    payment_method: paymentMethod,
                    cashier_id: user?.id, // System User
                    // The salesperson isn't changing, but we record WHO recieved it (Cashier Employee)
                    cashier_employee_id: employeeId,
                    cash_register_id: currentRegister.id,
                })
                .eq('id', selectedSale.id);

            if (error) throw error;

            // ... (Rest of logic: Toast, Refresh, Close Dialog)
            toast({ title: 'Venda Finalizada!', description: `Recebimento de ${formatCurrency(selectedSale.final_value)} registrado.` });
            queryClient.invalidateQueries({ queryKey: ['pos_queue'] });
            queryClient.invalidateQueries({ queryKey: ['pos_history'] }); // Refresh History

            setSelectedSale(null);
            setAmountPaid(0);
            setIsCashierDialogOpen(false);
            if (isFiscalEnabled) {
                // Trigger Fiscal (Mock)
                setTimeout(() => toast({ title: 'NFC-e', description: 'Emitida em Contingência (Simulação)' }), 1000);
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao processar pagamento.' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoadingRegister) return <div className="p-8">Carregando Frente de Caixa...</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-4">
            <Tabs defaultValue="queue" className="flex-1 flex flex-col">
                <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm mb-4">
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="queue" className="px-8">Fila de Atendimento</TabsTrigger>
                        <TabsTrigger value="history" className="px-8">Histórico de Vendas</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-4 pr-4">
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground font-bold uppercase">Sessão Atual</div>
                            <div className="text-sm font-mono font-bold text-slate-700">{currentRegister?.id.slice(0, 8) || 'FECHADO'}</div>
                        </div>
                        <Button variant={currentRegister ? "destructive" : "default"} size="sm" onClick={() => currentRegister ? handlePreCloseRegister() : setIsRegisterOpenDialog(true)}>
                            {currentRegister ? 'Fechar Caixa' : 'Abrir Caixa'}
                        </Button>
                    </div>
                </div>

                <TabsContent value="queue" className="flex-1 mt-0">
                    <div className="flex h-full gap-4">
                        {/* LEFT: Queue */}
                        <Card className="w-1/3 flex flex-col">
                            <CardHeader className="bg-slate-50 pb-4 py-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2 items-center">
                                        <div className="bg-emerald-100 p-2 rounded-full">
                                            <AlertCircle className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <CardTitle className="text-base">Aguardando Pagamento</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => refetchQueue()}><RefreshCw className="w-4 h-4" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto bg-white/50">
                                {queue.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                        <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                                        <p>Nenhum pedido na fila.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y relative">
                                        {queue.map((sale: SaleQueueItem) => (
                                            <div
                                                key={sale.id}
                                                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors group ${selectedSale?.id === sale.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'border-l-4 border-transparent'}`}
                                                onClick={() => {
                                                    setSelectedSale(sale);
                                                    setAmountPaid(sale.final_value);
                                                }}
                                            >
                                                <div className="flex justify-between mb-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{sale.customer_name}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 bg-white border-slate-200 text-slate-500">
                                                                {sale.salesperson_name}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {formatDate(sale.created_at) && formatDate(sale.created_at).includes(' ') ? formatDate(sale.created_at).split(' ')[1].substring(0, 5) : '--:--'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-sm text-muted-foreground mt-3 border-t pt-2 border-slate-100">
                                                    <span>{sale.items_count} volumes</span>
                                                    <span className="font-mono text-emerald-700 font-bold text-lg">{formatCurrency(sale.final_value)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="border-t p-4 bg-slate-100 flex justify-between text-xs text-muted-foreground items-center">
                                <div>
                                    <div className="font-bold text-slate-700">Sessão: {currentRegister?.id.slice(0, 8)}</div>
                                    <div>Aberto em: {currentRegister && formatDate(currentRegister.opened_at)}</div>
                                </div>
                                <Button variant="destructive" size="sm" onClick={() => handlePreCloseRegister()}>
                                    Fechar Caixa
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* RIGHT: Payment Area */}
                        <div className="flex-1 flex flex-col gap-4">
                            {selectedSale ? (
                                <Card className="flex-1 flex flex-col border-emerald-500/20 shadow-lg ring-1 ring-emerald-100">
                                    <CardHeader className="border-b pb-6 bg-emerald-50/10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-2xl text-slate-700">Pagamento</CardTitle>
                                                <CardDescription className="mt-1 flex items-center gap-2">
                                                    <UserIcon className="w-4 h-4" /> {selectedSale.customer_name}
                                                </CardDescription>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Total a Pagar</div>
                                                <div className="text-emerald-600 font-black text-4xl tracking-tighter">{formatCurrency(selectedSale.final_value)}</div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex-1 p-0 flex flex-col">
                                        {/* Product List */}
                                        <div className="bg-slate-50/50 border-b p-4 max-h-48 overflow-y-auto">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                                                <ShoppingBag className="w-4 h-4" /> Resumo do Pedido
                                            </div>
                                            <div className="space-y-1">
                                                {selectedSale.items?.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-sm py-2 px-3 bg-white rounded border border-slate-100 shadow-sm">
                                                        <span className="flex-1 truncate pr-4 font-medium text-slate-700">{item.product_name}</span>
                                                        <div className="flex gap-6 text-slate-600 font-mono">
                                                            <span>{item.quantity}x</span>
                                                            <span className="font-bold">{formatCurrency(item.unit_price)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6 flex-1 bg-white">
                                            <div className="grid grid-cols-3 gap-4">
                                                <Button
                                                    variant={paymentMethod === 'money' ? 'default' : 'outline'}
                                                    className={`h-24 flex flex-col gap-2 rounded-xl transition-all ${paymentMethod === 'money' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 shadow-lg scale-[1.02]' : 'hover:bg-slate-50'}`}
                                                    onClick={() => setPaymentMethod('money')}
                                                >
                                                    <DollarSign className="w-8 h-8" />
                                                    <span className="font-bold">Dinheiro (F1)</span>
                                                </Button>
                                                <Button
                                                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                                    className={`h-24 flex flex-col gap-2 rounded-xl transition-all ${paymentMethod === 'card' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg scale-[1.02]' : 'hover:bg-slate-50'}`}
                                                    onClick={() => setPaymentMethod('card')}
                                                >
                                                    <CreditCard className="w-8 h-8" />
                                                    <span className="font-bold">Cartão (F2)</span>
                                                </Button>
                                                <Button
                                                    variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                                                    className={`h-24 flex flex-col gap-2 rounded-xl transition-all ${paymentMethod === 'pix' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-200 shadow-lg scale-[1.02]' : 'hover:bg-slate-50'}`}
                                                    onClick={() => setPaymentMethod('pix')}
                                                >
                                                    <Wallet className="w-8 h-8" />
                                                    <span className="font-bold">PIX (F3)</span>
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8 pt-2">
                                                <div className="space-y-2">
                                                    <Label className="text-lg text-slate-600 font-bold">Valor Recebido</Label>
                                                    <MoneyInput
                                                        value={amountPaid}
                                                        onChange={setAmountPaid}
                                                        className="h-16 text-3xl font-bold font-mono border-slate-300 focus:ring-emerald-500"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-lg text-slate-600 font-bold">Troco</Label>
                                                    <div className={`h-16 flex items-center px-4 rounded-md border text-3xl font-bold font-mono transition-colors ${change > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-400'}`}>
                                                        {formatCurrency(change)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="p-4 bg-slate-50 border-t flex flex-col gap-4">

                                        {/* Fiscal Toggle */}
                                        <div className="w-full flex justify-between items-center px-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <Printer className={`w-5 h-5 ${isFiscalEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">Nota Fiscal (NFC-e)</span>
                                                    <span className="text-xs text-muted-foreground">{isFiscalEnabled ? 'Será emitida ao finalizar' : 'Apenas controle interno'}</span>
                                                </div>
                                            </div>
                                            <Switch checked={isFiscalEnabled} onCheckedChange={setIsFiscalEnabled} />
                                        </div>

                                        <div className="w-full flex gap-4">
                                            <Button variant="outline" size="lg" className="flex-1 h-14 text-lg border-slate-300 hover:bg-slate-100 text-slate-600" onClick={() => setSelectedSale(null)}>
                                                Cancelar
                                            </Button>
                                            <Button
                                                size="lg"
                                                className={`flex-[2] h-14 text-xl font-bold shadow-lg transition-all ${isFiscalEnabled ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'}`}
                                                disabled={!canPay || isProcessing}
                                                onClick={initiatePayment}
                                            >
                                                {isProcessing ? 'Processando...' : (
                                                    <div className="flex flex-col items-center leading-none gap-1">
                                                        <span>{isFiscalEnabled ? 'EMITIR NFC-e' : 'RECEBER'}</span>
                                                        <span className="text-xs opacity-80 font-normal">{formatCurrency(selectedSale.final_value)}</span>
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ) : (
                                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-4 bg-slate-50/30">
                                    <div className="bg-slate-100 p-6 rounded-full">
                                        <DollarSign className="w-16 h-16 opacity-20" />
                                    </div>
                                    <p className="text-xl font-medium text-slate-400">Selecione uma venda para iniciar o recebimento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="flex-1 mt-0">
                    <Card className="h-full flex flex-col border-none shadow-sm bg-white">
                        <CardHeader className="border-b pb-4">
                            <CardTitle>Histórico de Vendas (Últimas 50)</CardTitle>
                            <CardDescription>Vendas concluídas recentemente nesta filial.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto p-0">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                    <ShoppingBag className="w-12 h-12 opacity-20 mb-4" />
                                    <p>Nenhuma venda registrada no histórico recente.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0">
                                        <TableRow>
                                            <TableHead>Horário</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Vendedor</TableHead>
                                            <TableHead>Pagamento</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((sale: any) => (
                                            <TableRow key={sale.id} className="hover:bg-slate-50">
                                                <TableCell className="font-mono text-xs">
                                                    {formatDate(sale.created_at)}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700">
                                                    {sale.customer_name || 'Consumidor Final'}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {sale.employee?.name || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase text-[10px]">
                                                        {sale.payment_method === 'money' ? 'Dinheiro' :
                                                            sale.payment_method === 'card' ? 'Cartão' :
                                                                sale.payment_method === 'pix' ? 'PIX' : sale.payment_method}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-emerald-700">
                                                    {formatCurrency(sale.final_value)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <Printer className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
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

            {/* Close Register Dialog */}
            <Dialog open={isCloseRegisterOpen} onOpenChange={setIsCloseRegisterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fechar Caixa</DialogTitle>
                        <DialogDescription>
                            Realize a conferência dos valores antes de encerrar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-amber-50 text-amber-800 rounded-md text-sm mb-4">
                            <strong>Atenção:</strong> Ao fechar o caixa, você não poderá realizar mais recebimentos nesta sessão.
                        </div>
                        <div className="space-y-2">
                            <Label>Dinheiro em Gaveta (R$)</Label>
                            <MoneyInput
                                value={closingValues.money}
                                onChange={(v) => setClosingValues(prev => ({ ...prev, money: v }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCloseRegisterOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleCloseRegister}>
                            Encerrar Sessão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cashier Identification Dialog - Used explicitly for sensitive ops, but regular flow is PIN-free per request */}
            <Dialog open={isCashierDialogOpen} onOpenChange={setIsCashierDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmação de Caixa</DialogTitle>
                        <DialogDescription>
                            Digite seu PIN para validar esta operação.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="c-pin" className="text-right w-20">PIN</Label>
                            <Input
                                id="c-pin"
                                type="password"
                                inputMode="numeric"
                                className="col-span-3 text-center text-2xl tracking-widest"
                                placeholder="____"
                                maxLength={6}
                                value={cashierPin}
                                onChange={(e) => setCashierPin(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleProcessPayment();
                                }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsCashierDialogOpen(false)}>Cancelar</Button>
                        <Button type="button" onClick={() => handleProcessPayment()} disabled={!cashierPin || isProcessing}>
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </div >
    );
};
