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
    opening_employee_id?: string;
}

export const POSPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State
    const [selectedSale, setSelectedSale] = useState<SaleQueueItem | null>(null);
    const [isFiscalEnabled, setIsFiscalEnabled] = useState(true); // Default to Fiscal? Or User Config? Default True for now as requested skeleton.
    const [paymentMethod, setPaymentMethod] = useState<'money' | 'credit_card' | 'debit_card' | 'pix'>('money');
    const [installments, setInstallments] = useState(1); // For Credit Card
    // const [amountPaid, setAmountPaid] = useState(0); // Removed in Split Logic
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
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching register:', error);
                throw error;
            }
            return data as CashRegister | null;
        },
        retry: 1, // Don't retry indefinitely if there's a logic error
        refetchOnWindowFocus: false // Prevent flashing on focus
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

    // Split Payment State
    const [payments, setPayments] = useState<{ method: string, amount: number }[]>([]);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState(0);

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const remainingToPay = Math.max(0, (selectedSale?.final_value || 0) - totalPaid);
    const change = Math.max(0, totalPaid - (selectedSale?.final_value || 0));
    const canFinalize = totalPaid >= (selectedSale?.final_value || 0);

    // Initial load when selecting sale
    useEffect(() => {
        if (selectedSale) {
            setPayments([]);
            setCurrentPaymentAmount(selectedSale.final_value);
        }
    }, [selectedSale]);

    const addPayment = (method: string) => {
        if (currentPaymentAmount <= 0) return;

        const amountToAdd = method === 'money' ? currentPaymentAmount : Math.min(currentPaymentAmount, remainingToPay);

        setPayments([...payments, { method, amount: amountToAdd }]);

        // Auto-adjust next amount
        const newTotal = totalPaid + amountToAdd;
        const newRemaining = Math.max(0, (selectedSale?.final_value || 0) - newTotal);
        setCurrentPaymentAmount(newRemaining);
    };

    const removePayment = (index: number) => {
        const newPayments = [...payments];
        newPayments.splice(index, 1);
        setPayments(newPayments);

        // Recalculate remaining to update input suggestion
        const currentTotal = newPayments.reduce((acc, p) => acc + p.amount, 0);
        setCurrentPaymentAmount(Math.max(0, (selectedSale?.final_value || 0) - currentTotal));
    };

    // Cashier Identity State
    const [cashierPin, setCashierPin] = useState('');
    const [isCashierDialogOpen, setIsCashierDialogOpen] = useState(false);

    // Opening Session State
    const [openingPin, setOpeningPin] = useState('');

    // Actions - Close Register
    const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
    const [closingValues, setClosingValues] = useState({ money: 0, credit_card: 0, debit_card: 0, pix: 0 });
    const [calculatedTotals, setCalculatedTotals] = useState({ money: 0, credit_card: 0, debit_card: 0, pix: 0, total: 0 });
    const [closingPin, setClosingPin] = useState('');

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

            // Clean up Zombies: Close ANY existing open registers for this user/filial
            // This prevents "Stacking" of open registers if one was not closed properly.
            await supabase
                .from('cash_registers')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    notes: 'Fechamento Automático (Limpeza de Sessão Anterior)'
                })
                .eq('user_id', user?.id)
                .eq('status', 'open');

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
        if (!currentRegister) return;

        // 1. Get Completed Sales IDs for this Register
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('id')
            .eq('cash_register_id', currentRegister.id)
            .eq('status', 'completed');

        if (salesError || !sales) {
            console.error(salesError);
            return;
        }

        const saleIds = sales.map(s => s.id);

        let totals = { money: 0, credit_card: 0, debit_card: 0, pix: 0, total: 0 };

        if (saleIds.length > 0) {
            // 2. Fetch Payments for these Sales
            const { data: payments, error: payError } = await supabase
                .from('sale_payments')
                .select('amount, method')
                .in('sale_id', saleIds);

            if (!payError && payments) {
                totals = payments.reduce((acc: any, curr: any) => {
                    const method = curr.method;
                    acc[method] = (acc[method] || 0) + curr.amount;
                    acc.total += curr.amount;
                    return acc;
                }, { money: 0, credit_card: 0, debit_card: 0, pix: 0, total: 0 });
            }
        }

        // Do NOT pre-fill closingValues (User must count drawer)
        setClosingValues({ money: 0, credit_card: 0, debit_card: 0, pix: 0 });
        setCalculatedTotals(totals);
        setIsCloseRegisterOpen(true);
    };

    const handleCloseRegister = async () => {
        if (!currentRegister) return;
        if (!closingPin) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Informe o PIN do responsável.' });
            return;
        }

        const totalReported = closingValues.money + closingValues.credit_card + closingValues.debit_card + closingValues.pix;
        const diff = totalReported - calculatedTotals.total;

        try {
            // Validate PIN
            const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('id, name, role')
                .eq('pin', closingPin)
                .single();

            if (empError || !employee) {
                toast({ variant: 'destructive', title: 'PIN Inválido', description: 'Funcionário não encontrado.' });
                return;
            }

            // Enforce "Who opens must close" OR Manager/Admin Override
            if (currentRegister.opening_employee_id && employee.id !== currentRegister.opening_employee_id) {
                if (!['admin', 'manager'].includes(employee.role)) {
                    toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Apenas quem abriu o caixa pode fechá-lo.' });
                    return;
                }
            }

            const { error } = await supabase
                .from('cash_registers')
                .update({
                    status: 'closed',
                    closing_balance: totalReported,
                    closed_at: new Date().toISOString(),
                    notes: `Fechado por ${employee.name}. Esp: ${formatCurrency(calculatedTotals.total)}. Inf: ${formatCurrency(totalReported)}.`
                })
                .eq('id', currentRegister.id);

            if (error) throw error;

            toast({ title: 'Caixa Fechado', description: `Sessão encerrada por ${employee.name}.` });

            setIsCloseRegisterOpen(false);
            setClosingPin('');

            // Invalidate and Refetch to ensure UI updates (Fix Zombie State)
            await queryClient.invalidateQueries({ queryKey: ['cash_register'] });
            await queryClient.refetchQueries({ queryKey: ['cash_register'] });

        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao fechar caixa.' });
        }
    };

    const initiatePayment = () => {
        if (!selectedSale || !currentRegister) return;

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

            // 1. Insert Payment Records
            if (payments.length > 0) {
                const paymentRecords = payments.map(p => ({
                    sale_id: selectedSale.id,
                    method: p.method,
                    amount: p.amount
                }));
                const { error: payError } = await supabase.from('sale_payments').insert(paymentRecords);
                if (payError) throw payError;
            }

            // 2. Update Sale
            const { error } = await supabase
                .from('sales')
                .update({
                    status: 'completed',
                    payment_status: 'paid',
                    // If multiple, mark as split. If single, use that method.
                    payment_method: payments.length > 1 ? 'split' : (payments[0]?.method || 'money'),
                    cashier_id: user?.id, // System User
                    cashier_employee_id: employeeId,
                    cash_register_id: currentRegister.id,
                    final_value: selectedSale.final_value // Ensure no tampering
                })
                .eq('id', selectedSale.id);

            if (error) throw error;

            // ... (Rest of logic: Toast, Refresh, Close Dialog)
            toast({ title: 'Venda Finalizada!', description: `Recebimento de ${formatCurrency(selectedSale.final_value)} registrado.` });
            queryClient.invalidateQueries({ queryKey: ['pos_queue'] });
            queryClient.invalidateQueries({ queryKey: ['pos_history'] }); // Refresh History

            setSelectedSale(null);
            setPayments([]);
            setIsCashierDialogOpen(false);
            if (isFiscalEnabled) {
                // Trigger Fiscal (Mock)
                setTimeout(() => toast({ title: 'NFC-e', description: 'Emitida em Contingência (Simulação)' }), 1000);
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Falha ao processar pagamento.' });
        } finally {
            setIsProcessing(false);
        }
    };

    // ... Render Section
    /* Replace the Payment Buttons and Total area with Split UI */


    // if (isLoadingRegister) return <div className="p-8">Carregando Frente de Caixa...</div>; // Removed blocking load to prevent loop flash

    return (
        <div className="flex flex-col h-full gap-4">
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
                                            <AlertCircle className="w-4 h-4 text-primary" />
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
                                                onClick={() => setSelectedSale(sale)}
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
                                                <div className="text-primary font-black text-4xl tracking-tighter">{formatCurrency(selectedSale.final_value)}</div>
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
                                            <div className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-lg text-slate-600 font-bold">Valor a Lançar</Label>
                                                        {remainingToPay > 0 && remainingToPay !== currentPaymentAmount && (
                                                            <Button
                                                                variant="link"
                                                                className="h-auto p-0 text-primary font-bold"
                                                                onClick={() => setCurrentPaymentAmount(remainingToPay)}
                                                            >
                                                                Usar Restante ({formatCurrency(remainingToPay)})
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <MoneyInput
                                                        value={currentPaymentAmount}
                                                        onChange={setCurrentPaymentAmount}
                                                        className="h-16 text-3xl font-bold font-mono border-slate-300 focus:ring-emerald-500 bg-white shadow-inner"
                                                        autoFocus
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <Button
                                                        variant="outline"
                                                        className="h-20 flex flex-col gap-1 rounded-xl hover:bg-emerald-50 border-slate-200 active:scale-95 transition-all"
                                                        onClick={() => addPayment('money')}
                                                        disabled={currentPaymentAmount <= 0}
                                                    >
                                                        <DollarSign className="w-6 h-6 text-primary" />
                                                        <span className="font-bold text-emerald-700">Lançar Dinheiro</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-20 flex flex-col gap-1 rounded-xl hover:bg-teal-50 border-slate-200 active:scale-95 transition-all"
                                                        onClick={() => addPayment('pix')}
                                                        disabled={currentPaymentAmount <= 0}
                                                    >
                                                        <Wallet className="w-6 h-6 text-teal-600" />
                                                        <span className="font-bold text-teal-700">Lançar PIX</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-20 flex flex-col gap-1 rounded-xl hover:bg-blue-50 border-slate-200 active:scale-95 transition-all"
                                                        onClick={() => addPayment('debit_card')}
                                                        disabled={currentPaymentAmount <= 0}
                                                    >
                                                        <CreditCard className="w-6 h-6 text-blue-600" />
                                                        <span className="font-bold text-blue-700">Lançar Débito</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-20 flex flex-col gap-1 rounded-xl hover:bg-indigo-50 border-slate-200 active:scale-95 transition-all"
                                                        onClick={() => addPayment('credit_card')}
                                                        disabled={currentPaymentAmount <= 0}
                                                    >
                                                        <CreditCard className="w-6 h-6 text-indigo-600" />
                                                        <span className="font-bold text-indigo-700">Lançar Crédito</span>
                                                    </Button>
                                                </div>

                                                {/* Partial Payments List */}
                                                {(payments.length > 0 || remainingToPay > 0) && (
                                                    <div className="space-y-2 mt-4 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Resumo de Pagamentos</Label>

                                                        {payments.length === 0 && (
                                                            <div className="text-center text-sm text-muted-foreground italic py-2">Nenhum pagamento lançado.</div>
                                                        )}

                                                        <div className="space-y-2">
                                                            {payments.map((p, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{p.method.replace('_', ' ')}</Badge>
                                                                        <span className="font-mono font-bold text-slate-700">{formatCurrency(p.amount)}</span>
                                                                    </div>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removePayment(idx)}>
                                                                        X
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex justify-between pt-3 border-t border-slate-200 mt-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-slate-500 font-bold">Total Pago</span>
                                                                <span className="text-lg font-bold text-slate-700">{formatCurrency(totalPaid)}</span>
                                                            </div>
                                                            <div className="flex flex-col text-right">
                                                                <span className="text-xs text-slate-500 font-bold">
                                                                    {remainingToPay > 0 ? 'Restante a Pagar' : 'Troco'}
                                                                </span>
                                                                <span className={`text-2xl font-black ${remainingToPay > 0 ? 'text-red-500' : 'text-primary'}`}>
                                                                    {remainingToPay > 0 ? formatCurrency(remainingToPay) : formatCurrency(change)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                                className={`flex-[2] h-14 text-xl font-bold shadow-lg transition-all ${isFiscalEnabled ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                                                disabled={!canFinalize || isProcessing}
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
                                                            sale.payment_method === 'credit_card' ? 'Crédito' :
                                                                sale.payment_method === 'debit_card' ? 'Débito' :
                                                                    sale.payment_method === 'pix' ? 'PIX' :
                                                                        sale.payment_method === 'card' ? 'Cartão (Antigo)' : sale.payment_method}
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
            <Dialog open={isRegisterOpenDialog} onOpenChange={setIsRegisterOpenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Abrir Caixa</DialogTitle>
                        <DialogDescription>
                            Informe o fundo de troco inicial para iniciar as operações.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Funcionário (PIN)</Label>
                            <Input
                                type="password"
                                inputMode="numeric"
                                placeholder="Seu PIN de Acesso"
                                className="text-center tracking-widest text-lg"
                                value={openingPin}
                                onChange={(e) => setOpeningPin(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Saldo Inicial (R$)</Label>
                            <MoneyInput value={openingBalance} onChange={setOpeningBalance} />
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Conferência de Fechamento</DialogTitle>
                        <DialogDescription>
                            Confira os valores computados vs valores em gaveta.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-4">

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-lg border mb-4">
                            <div className="col-span-2 text-sm font-bold text-slate-500 uppercase tracking-wider text-center border-b pb-2 mb-2">
                                Valores Computados
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Dinheiro:</span>
                                <span className="font-mono font-bold text-slate-700">{formatCurrency(calculatedTotals.money)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Débito:</span>
                                <span className="font-mono font-bold text-slate-700">{formatCurrency(calculatedTotals.debit_card)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Crédito:</span>
                                <span className="font-mono font-bold text-slate-700">{formatCurrency(calculatedTotals.credit_card)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>PIX:</span>
                                <span className="font-mono font-bold text-slate-700">{formatCurrency(calculatedTotals.pix)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-1 font-bold text-primary mt-2">
                                <span>Total:</span>
                                <span className="font-mono text-lg">{formatCurrency(calculatedTotals.total)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-base font-bold text-slate-800">Valores em Gaveta/Filipeta</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Dinheiro</Label>
                                    <MoneyInput
                                        value={closingValues.money}
                                        onChange={(v) => setClosingValues(prev => ({ ...prev, money: v }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">PIX</Label>
                                    <MoneyInput
                                        value={closingValues.pix}
                                        onChange={(v) => setClosingValues(prev => ({ ...prev, pix: v }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Débito</Label>
                                    <MoneyInput
                                        value={closingValues.debit_card}
                                        onChange={(v) => setClosingValues(prev => ({ ...prev, debit_card: v }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Crédito</Label>
                                    <MoneyInput
                                        value={closingValues.credit_card}
                                        onChange={(v) => setClosingValues(prev => ({ ...prev, credit_card: v }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <Label className="font-bold text-slate-700">Assinatura Digital (PIN)</Label>
                        <Input
                            type="password"
                            placeholder="Digite seu PIN para fechar"
                            className="text-center tracking-widest text-lg font-bold"
                            value={closingPin}
                            onChange={(e) => setClosingPin(e.target.value)}
                            autoComplete="off"
                        />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsCloseRegisterOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleCloseRegister}>
                            Conferir e Fechar Sessão
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
