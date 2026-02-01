import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fetchCustomers, createCustomer, updateCustomer } from '@/services/api';
import { Plus, Search, Edit, User, Phone, MapPin, Mail } from 'lucide-react';
import { Customer } from '@/types';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export const CustomersPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Initial Form State
    const initialFormState = {
        name: '',
        cpf: '',
        phone: '',
        email: '',
        address: '',
        number: '',
        district: '',
        city: '',
        state: '',
        zipCode: '',
        notes: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    // Query
    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers', searchTerm],
        queryFn: () => fetchCustomers(searchTerm)
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: createCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast({ title: 'Sucesso', description: 'Cliente cadastrado com sucesso.' });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (err: any) => toast({ variant: 'destructive', title: 'Erro', description: err.message })
    });

    const updateMutation = useMutation({
        mutationFn: (variables: { id: string; data: any }) => updateCustomer(variables.id, variables.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast({ title: 'Sucesso', description: 'Dados atualizados com sucesso.' });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (err: any) => toast({ variant: 'destructive', title: 'Erro', description: err.message })
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingId(customer.id);
        setFormData({
            name: customer.name,
            cpf: customer.cpf || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            number: customer.number || '',
            district: customer.district || '',
            city: customer.city || '',
            state: customer.state || '',
            zipCode: customer.zipCode || '',
            notes: customer.notes || ''
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <User className="h-6 w-6 text-emerald-600" />
                        Gestão de Clientes (CRM)
                    </h1>
                    <p className="text-slate-500">Cadastre e gerencie seus clientes fieis.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                </Button>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nome, CPF ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 bg-white"
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Localização</TableHead>
                                <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="p-0 border-0">
                                        <div className="w-full">
                                            <TableSkeleton rows={5} columns={4} showHeaders={false} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer: Customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{customer.name}</div>
                                            {customer.cpf && <div className="text-xs text-slate-500">CPF: {customer.cpf}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm">
                                                {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</span>}
                                                {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-slate-600 max-w-[200px] truncate">
                                                {[customer.address, customer.number, customer.district].filter(Boolean).join(', ')}
                                                {customer.city && ` - ${customer.city}`}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados do cliente para o cadastro.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Nome Completo *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <Label>CPF</Label>
                                <Input
                                    value={formData.cpf}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <Label>Telefone/WhatsApp</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="col-span-2 h-px bg-slate-100 my-2" />
                            <div className="col-span-2 md:col-span-1">
                                <Label>CEP</Label>
                                <Input
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <Label>Cidade</Label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Número</Label>
                                <Input
                                    value={formData.number}
                                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Bairro</Label>
                                <Input
                                    value={formData.district}
                                    onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Observações</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
