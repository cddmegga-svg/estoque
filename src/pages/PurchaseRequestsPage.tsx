import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Clock, CheckCircle, Package, AlertTriangle, User, Phone, Edit, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { fetchPurchaseRequests, addPurchaseRequest, updatePurchaseRequest, deletePurchaseRequest } from '@/services/api';
import { PurchaseRequest, User as AppUser } from '@/types';
import { formatDate } from '@/lib/utils'; // Create if needed or just use toLocaleDateString locally

interface PurchaseRequestsPageProps {
    user: AppUser;
}

export const PurchaseRequestsPage = ({ user }: PurchaseRequestsPageProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
    const [formData, setFormData] = useState<Partial<PurchaseRequest>>({
        priority: 'normal',
        status: 'pending'
    });

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['purchase_requests'],
        queryFn: fetchPurchaseRequests
    });

    const createMutation = useMutation({
        mutationFn: addPurchaseRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
            toast({ title: 'Encomenda registrada!' });
            handleCloseDialog();
        },
        onError: () => toast({ variant: 'destructive', title: 'Erro ao salvar' })
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseRequest> }) => updatePurchaseRequest(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
            toast({ title: 'Encomenda atualizada!' });
            handleCloseDialog();
        },
        onError: () => toast({ variant: 'destructive', title: 'Erro ao atualizar' })
    });

    const deleteMutation = useMutation({
        mutationFn: deletePurchaseRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
            toast({ title: 'Encomenda removida' });
        }
    });

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingRequest(null);
        setFormData({ priority: 'normal', status: 'pending' });
    };

    const handleOpenDialog = (req?: PurchaseRequest) => {
        if (req) {
            setEditingRequest(req);
            setFormData(req);
        } else {
            setEditingRequest(null);
            setFormData({
                priority: 'normal',
                status: 'pending',
                user_id: user.id,
                user_name: user.name
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.client_name || !formData.item_description) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha Nome do Cliente e Item.' });
            return;
        }

        const dataToSave = {
            ...formData,
            user_id: user.id,
            user_name: user.name // Ensure current user is recorded if new
        };

        if (editingRequest) {
            // Keep original user if editing? Usually yes.
            updateMutation.mutate({ id: editingRequest.id, data: formData });
        } else {
            createMutation.mutate(dataToSave as any);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Solicitado (Pendente)</Badge>;
            case 'ordered': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Em Produção / Pedido</Badge>;
            case 'arrived': return <Badge className="bg-green-600 hover:bg-green-700">Chegou / Estoque</Badge>;
            case 'picked_up': return <Badge variant="outline" className="text-gray-500">Entregue / Finalizado</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelado</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'urgent') return <AlertTriangle className="w-4 h-4 text-red-500" />;
        return null;
    };

    const filteredRequests = requests.filter((req: PurchaseRequest) => {
        const matchesSearch = req.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.item_description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : req.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Livro de Encomendas</h2>
                    <p className="text-muted-foreground">Gerencie pedidos especiais de clientes e medicamentos sob encomenda.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} size="lg" className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" /> Nova Encomenda
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente ou item..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>Todos</Button>
                    <Button variant={statusFilter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('pending')} className={statusFilter === 'pending' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : ''}>Pendentes</Button>
                    <Button variant={statusFilter === 'ordered' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('ordered')} className={statusFilter === 'ordered' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}>Em Produção</Button>
                    <Button variant={statusFilter === 'arrived' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('arrived')} className={statusFilter === 'arrived' ? 'bg-green-600 text-white hover:bg-green-700' : ''}>No Estoque</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        Nenhuma encomenda encontrada.
                    </div>
                ) : (
                    filteredRequests.map((req: PurchaseRequest) => (
                        <Card key={req.id} className={`transition-all hover:shadow-md ${req.priority === 'urgent' && req.status !== 'picked_up' ? 'border-l-4 border-l-red-500' : ''}`}>
                            <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {getStatusBadge(req.status)}
                                        {req.priority === 'urgent' && <Badge variant="destructive" className="flex gap-1"><AlertTriangle className="w-3 h-3" /> Urgente</Badge>}
                                        <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {req.created_at ? new Date(req.created_at).toLocaleDateString() : '-'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg">{req.item_description}</h3>
                                    <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1 text-foreground font-medium">
                                            <User className="w-4 h-4" /> {req.client_name}
                                        </span>
                                        {req.client_contact && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-4 h-4" /> {req.client_contact}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 italic">
                                            Solicitado por: {req.user_name || 'Sistema'}
                                        </span>
                                    </div>
                                    {req.notes && (
                                        <p className="text-sm bg-slate-50 p-2 rounded border mt-2">
                                            Obs: {req.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0">
                                    {/* Action Buttons based on Status */}
                                    {req.status === 'pending' && (
                                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => updateMutation.mutate({ id: req.id, data: { status: 'ordered' } })}>
                                            Marcar "Em Produção" <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    )}
                                    {req.status === 'ordered' && (
                                        <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => updateMutation.mutate({ id: req.id, data: { status: 'arrived' } })}>
                                            Marcar "Chegou" <CheckCircle className="w-3 h-3 ml-1" />
                                        </Button>
                                    )}
                                    {req.status === 'arrived' && (
                                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: req.id, data: { status: 'picked_up' } })}>
                                            Finalizar (Entregue)
                                        </Button>
                                    )}

                                    <div className="flex gap-1 ml-auto md:ml-2">
                                        <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(req)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => {
                                            if (confirm('Excluir encomenda?')) deleteMutation.mutate(req.id)
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRequest ? 'Editar Encomenda' : 'Nova Encomenda'}</DialogTitle>
                        <DialogDescription>Registre o pedido especial do cliente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nome do Cliente *</Label>
                            <Input
                                value={formData.client_name || ''}
                                onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                placeholder="Nome completo"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Contato (Tel/Whats)</Label>
                            <Input
                                value={formData.client_contact || ''}
                                onChange={e => setFormData({ ...formData, client_contact: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Item Solicitado / Fórmula *</Label>
                            <Textarea
                                value={formData.item_description || ''}
                                onChange={e => setFormData({ ...formData, item_description: e.target.value })}
                                placeholder="Descreva o medicamento ou fórmula..."
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Prioridade</Label>
                                <Select value={formData.priority} onValueChange={(val: any) => setFormData({ ...formData, priority: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Status Inicial</Label>
                                <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Solicitado (Pendente)</SelectItem>
                                        <SelectItem value="ordered">Em Produção / Compra</SelectItem>
                                        <SelectItem value="arrived">Já Chegou (Estoque)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Observações</Label>
                            <Input
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Ex: Marca específica, dosagem..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                        <Button onClick={handleSubmit}>Salvar Encomenda</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
