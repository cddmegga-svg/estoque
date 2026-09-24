import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fetchSuppliers, addSupplier, updateSupplier, deleteSupplier } from '@/services/api';
import { Supplier } from '@/types';
import { formatCNPJ } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export const SuppliersPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>({});

    // Queries
    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: fetchSuppliers
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: addSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: 'Fornecedor adicionado com sucesso!' });
            setIsDialogOpen(false);
            setFormData({});
        },
        onError: (err) => {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar fornecedor.' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => updateSupplier(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: 'Fornecedor atualizado com sucesso!' });
            setIsDialogOpen(false);
            setEditingSupplier(null);
            setFormData({});
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: 'Fornecedor removido.' });
        }
    });

    const handleOpenDialog = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            setFormData({});
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editingSupplier) {
            updateMutation.mutate({ id: editingSupplier.id, data: formData });
        } else {
            createMutation.mutate(formData as any); // Type assertion for simplicity
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cnpj?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Fornecedores</h2>
                    <p className="text-muted-foreground">Gerencie seus parceiros e fornecedores</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou CNPJ..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                            ) : filteredSuppliers.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum fornecedor encontrado</TableCell></TableRow>
                            ) : (
                                filteredSuppliers.map(supplier => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                {supplier.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{supplier.cnpj ? formatCNPJ(supplier.cnpj) : '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                {supplier.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {supplier.email}</div>}
                                                {supplier.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {supplier.phone}</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(supplier)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(supplier.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                        <DialogDescription>Preencha os dados do fornecedor abaixo</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome / Razão Social *</Label>
                            <Input
                                id="name"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ</Label>
                            <Input
                                id="cnpj"
                                placeholder="00.000.000/0000-00"
                                value={formData.cnpj || ''}
                                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                                id="address"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
