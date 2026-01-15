import { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, CheckCircle, AlertCircle, Clock, Calendar, DollarSign, Barcode, FileText, Filter, Copy } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fetchPayables, addPayable, updatePayable, deletePayable, fetchSuppliers, fetchFiliais } from '@/services/api';
import { AccountPayable, Supplier, User } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { parseBoleto } from '@/lib/boletoParser';
import { SupplierFormDialog } from '@/components/forms/SupplierFormDialog';

interface FinancialPageProps {
    user?: User; // Optional mostly for TS if used standalone, but usually present
}

export const FinancialPage = ({ user }: FinancialPageProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBill, setEditingBill] = useState<AccountPayable | null>(null);
    const [formData, setFormData] = useState<Partial<AccountPayable>>({ status: 'pending' });
    const [boletoCode, setBoletoCode] = useState('');
    const [isProcessingBoleto, setIsProcessingBoleto] = useState(false);
    const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
    const [viewingBill, setViewingBill] = useState<AccountPayable | null>(null);

    const handleCopyBarcode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copiado!', description: 'Código de barras copiado para a área de transferência.' });
    };

    // Queries
    const { data: bills = [], isLoading } = useQuery({ queryKey: ['payables'], queryFn: fetchPayables });
    const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
    const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => addPayable(data, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payables'] });
            toast({ title: 'Conta lançada com sucesso!' });
            handleCloseDialog();
        },
        onError: () => toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar conta.' })
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AccountPayable> }) => updatePayable(id, data, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payables'] });
            toast({ title: 'Conta atualizada com sucesso!' });
            handleCloseDialog();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deletePayable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payables'] });
            toast({ title: 'Conta removida.' });
        }
    });

    // Handlers
    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingBill(null);
        setFormData({ status: 'pending' });
        setBoletoCode('');
    };

    const handleOpenDialog = (bill?: AccountPayable) => {
        if (bill) {
            setEditingBill(bill);
            setFormData(bill);
            setBoletoCode(bill.barcode || '');
        } else {
            setEditingBill(null);
            setFormData({ status: 'pending', filialId: filiais[0]?.id }); // Default to first filial
            setBoletoCode('');
        }
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja remover esta conta?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleProcessBoleto = () => {
        if (!boletoCode) return;
        setIsProcessingBoleto(true);
        try {
            const info = parseBoleto(boletoCode);
            if (info.type === 'unknown' && !info.amount) {
                toast({ variant: 'destructive', title: 'Leitura Inválida', description: 'Não foi possível ler os dados deste código.' });
            } else {
                setFormData(prev => ({
                    ...prev,
                    amount: info.amount || prev.amount,
                    dueDate: info.dueDate ? info.dueDate.toISOString().split('T')[0] : prev.dueDate,
                    barcode: boletoCode,
                    description: prev.description || (info.bank ? `Boleto Banco ${info.bank}` : 'Conta de Consumo')
                }));
                toast({ title: 'Código Lido!', description: 'Valor e Vencimento preenchidos.' });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao processar código de barras.' });
        } finally {
            setIsProcessingBoleto(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount || !formData.dueDate || !formData.filialId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha Descrição, Valor, Vencimento e Filial.' });
            return;
        }

        // Se selecionou fornecedor, preenche entityName com o nome dele pra backup/display rápido
        if (formData.supplierId) {
            const supp = suppliers.find(s => s.id === formData.supplierId);
            if (supp) formData.entityName = supp.name;
        }

        if (editingBill) {
            updateMutation.mutate({ id: editingBill.id, data: formData });
        } else {
            createMutation.mutate(formData as any);
        }
    };

    const getStatusBadge = (status: string, dueDate: string) => {
        const isOverdue = status === 'pending' && new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

        if (status === 'paid') return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Pago</Badge>;
        if (isOverdue) return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
        return <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    };

    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            const matchesSearch = bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bill.entityName?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            const isOverdue = bill.status === 'pending' && new Date(bill.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

            if (statusFilter === 'paid') matchesStatus = bill.status === 'paid';
            if (statusFilter === 'pending') matchesStatus = bill.status === 'pending' && !isOverdue;
            if (statusFilter === 'overdue') matchesStatus = isOverdue || bill.status === 'overdue'; // Handle explicit or implicit overdue

            return matchesSearch && matchesStatus;
        });
    }, [bills, searchTerm, statusFilter]);

    const totalFiltered = filteredBills.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Contas a Pagar</h2>
                    <p className="text-muted-foreground">Gerencie seus boletos e pagamentos</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Conta
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar (Filtrado)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatCurrency(totalFiltered)}</div>
                    </CardContent>
                </Card>
                {/* Add more KPIs if needed */}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar conta ou fornecedor..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('all')}
                                size="sm"
                            >
                                Todas
                            </Button>
                            <Button
                                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('pending')}
                                size="sm"
                                className={statusFilter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                            >
                                Pendentes
                            </Button>
                            <Button
                                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('paid')}
                                size="sm"
                                className={statusFilter === 'paid' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                            >
                                Pagas
                            </Button>
                            <Button
                                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('overdue')}
                                size="sm"
                                className={statusFilter === 'overdue' ? 'bg-destructive hover:bg-destructive text-white' : ''}
                            >
                                Vencidas
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredBills.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada.</div>
                        ) : (
                            filteredBills.map(bill => (
                                <div key={bill.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors gap-4 cursor-pointer" onClick={(e) => {
                                    // Open view if not clicking buttons
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    setViewingBill(bill);
                                }}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <DollarSign className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">{bill.description}</span>
                                                {getStatusBadge(bill.status, bill.dueDate)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {bill.entityName || 'Fornecedor não informado'}
                                                {bill.invoiceNumber && <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">NF: {bill.invoiceNumber}</span>}
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-4">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Vence: {formatDate(bill.dueDate)}</span>
                                                {bill.filialId && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {filiais.find(f => f.id === bill.filialId)?.name || 'Filial'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-right mr-4">
                                            <div className="font-bold text-lg">{formatCurrency(bill.amount)}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            {bill.status !== 'paid' && (
                                                <Button size="icon" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" title="Marcar como Pago" onClick={() => updateMutation.mutate({ id: bill.id, data: { status: 'paid' } })}>
                                                    <CheckCircle className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(bill)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(bill.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* EDIT/CREATE DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingBill ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
                        <DialogDescription>Preencha os detalhes da conta a pagar.</DialogDescription>
                    </DialogHeader>

                    <FormContent
                        formData={formData}
                        setFormData={setFormData}
                        boletoCode={boletoCode}
                        setBoletoCode={setBoletoCode}
                        handleProcessBoleto={handleProcessBoleto}
                        isProcessingBoleto={isProcessingBoleto}
                        suppliers={suppliers}
                        filiais={filiais}
                        setIsSupplierDialogOpen={setIsSupplierDialogOpen}
                    />

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                        <Button onClick={handleSubmit}>Salvar Conta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* VIEW DETAILS DIALOG */}
            <Dialog open={!!viewingBill} onOpenChange={(open) => !open && setViewingBill(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Pagamento</DialogTitle>
                    </DialogHeader>
                    {viewingBill && (
                        <div className="space-y-6 py-4">
                            <div className="text-center space-y-2">
                                <p className="text-sm text-muted-foreground">Valor a Pagar</p>
                                <p className="text-4xl font-bold text-emerald-600">{formatCurrency(viewingBill.amount)}</p>
                                {getStatusBadge(viewingBill.status, viewingBill.dueDate)}
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Beneficiário</Label>
                                    <p className="font-medium">{viewingBill.entityName || viewingBill.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Vencimento</Label>
                                        <p className="font-medium">{formatDate(viewingBill.dueDate)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Nota Fiscal</Label>
                                        <p className="font-medium">{viewingBill.invoiceNumber || '-'}</p>
                                    </div>
                                </div>

                                {viewingBill.barcode ? (
                                    <div className="bg-slate-100 p-3 rounded-md space-y-2">
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Barcode className="w-3 h-3" /> Código de Barras / Linha Digitável
                                        </Label>
                                        <div className="font-mono text-sm break-all font-medium select-all">
                                            {viewingBill.barcode}
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={() => handleCopyBarcode(viewingBill.barcode!)}
                                        >
                                            <Copy className="w-3 h-3 mr-2" /> Copiar Código
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-3 rounded-md text-center text-sm text-muted-foreground italic">
                                        Sem código de barras cadastrado
                                    </div>
                                )}
                            </div>

                            {viewingBill.status === 'pending' && (
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                                    updateMutation.mutate({ id: viewingBill.id, data: { status: 'paid' } });
                                    setViewingBill(null);
                                }}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Pagamento Realizado
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <SupplierFormDialog
                isOpen={isSupplierDialogOpen}
                onClose={() => setIsSupplierDialogOpen(false)}
                onSuccess={(newSupplier) => {
                    setFormData(prev => ({
                        ...prev,
                        supplierId: newSupplier.id,
                        entityName: newSupplier.name
                    }));
                }}
            />
        </div>
    );
};

// Extracted Form Content to cleaner component structure (internal)
const FormContent = ({ formData, setFormData, boletoCode, setBoletoCode, handleProcessBoleto, isProcessingBoleto, suppliers, filiais, setIsSupplierDialogOpen }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        {/* LEFT COL: Boleto & Basic Info */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Ler Código de Barras / Linha Digitável</Label>
                <div className="flex gap-2">
                    <Input
                        placeholder="Cole aqui o código..."
                        value={boletoCode}
                        onChange={(e) => setBoletoCode(e.target.value)}
                    />
                    <Button size="icon" variant="secondary" onClick={handleProcessBoleto} title="Processar Boleto" disabled={isProcessingBoleto}>
                        <Barcode className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">Preenche Valor e Vencimento automaticamente.</p>
            </div>

            <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Aluguel, Conta de Luz"
                />
            </div>

            <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                    type="number"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
            </div>

            <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
            </div>
        </div>

        {/* RIGHT COL: Supplier & Details */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Fornecedor</Label>
                <div className="flex gap-2">
                    <Select
                        value={formData.supplierId || 'manual'}
                        onValueChange={(val) => {
                            if (val === 'manual') setFormData({ ...formData, supplierId: undefined, entityName: '' });
                            else {
                                const s = suppliers.find((sup: any) => sup.id === val);
                                setFormData({ ...formData, supplierId: val, entityName: s?.name });
                            }
                        }}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um fornecedor..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">-- Digitar Manualmente --</SelectItem>
                            {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="icon"
                        variant="outline"
                        title="Cadastrar Novo Fornecedor"
                        onClick={() => setIsSupplierDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {(!formData.supplierId || formData.supplierId === 'manual') && (
                <div className="space-y-2">
                    <Label>Nome do Cedente (Manual)</Label>
                    <Input
                        value={formData.entityName || ''}
                        onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                        placeholder="Nome de quem vai receber"
                    />
                </div>
            )}

            <div className="space-y-2">
                <Label>Número da Nota Fiscal (opcional)</Label>
                <div className="flex items-center relative">
                    <FileText className="absolute left-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        value={formData.invoiceNumber || ''}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        placeholder="Número da NF"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Filial Pagadora *</Label>
                <Select
                    value={formData.filialId}
                    onValueChange={(val) => setFormData({ ...formData, filialId: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a filial..." />
                    </SelectTrigger>
                    <SelectContent>
                        {filiais.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Status</Label>
                <Select
                    value={formData.status}
                    onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    </div>
);

// Simple helper icon for building
const Building2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
);
