import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addSupplier, updateSupplier } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Supplier } from '@/types';

interface SupplierFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (supplier: Supplier) => void;
    initialData?: Partial<Supplier>; // For pre-filling from XML
    editingSupplier?: Supplier | null; // For editing mode
}

export const SupplierFormDialog = ({ isOpen, onClose, onSuccess, initialData, editingSupplier }: SupplierFormDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<Partial<Supplier>>({
        name: '',
        cnpj: '',
        user_name: '', // contact person
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (editingSupplier) {
                setFormData(editingSupplier);
            } else if (initialData) {
                // Pre-fill from XML or other source
                setFormData(prev => ({ ...prev, ...initialData }));
            } else {
                // Reset
                setFormData({ name: '', cnpj: '', user_name: '', email: '', phone: '', address: '' });
            }
        }
    }, [isOpen, editingSupplier, initialData]);

    const createMutation = useMutation({
        mutationFn: addSupplier,
        onSuccess: (newSupplier: any) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: 'Fornecedor cadastrado!', description: `${newSupplier.name} salvo com sucesso.` });
            if (onSuccess) onSuccess(newSupplier);
            onClose();
        },
        onError: (err: any) => toast({ variant: 'destructive', title: 'Erro', description: err.message })
    });

    const updateMutation = useMutation({
        mutationFn: (vars: { id: string; data: any }) => updateSupplier(vars.id, vars.data),
        onSuccess: (updatedSupplier: any) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: 'Fornecedor atualizado!', description: `${updatedSupplier.name} salvo com sucesso.` });
            if (onSuccess) onSuccess(updatedSupplier);
            onClose();
        },
        onError: (err: any) => toast({ variant: 'destructive', title: 'Erro', description: err.message })
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nome é obrigatório' });
            return;
        }

        if (editingSupplier && editingSupplier.id) {
            updateMutation.mutate({ id: editingSupplier.id, data: formData });
        } else {
            createMutation.mutate(formData as Omit<Supplier, 'id'>);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados da empresa parceira.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="s-name">Razão Social / Nome *</Label>
                            <Input
                                id="s-name"
                                value={formData.name || ''}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="s-cnpj">CNPJ</Label>
                                <Input
                                    id="s-cnpj"
                                    value={formData.cnpj || ''}
                                    onChange={e => setFormData(p => ({ ...p, cnpj: e.target.value }))}
                                    placeholder="00.000.000/0001-00"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="s-phone">Telefone</Label>
                                <Input
                                    id="s-phone"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="s-email">Email</Label>
                            <Input
                                id="s-email"
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="s-address">Endereço</Label>
                            <Input
                                id="s-address"
                                value={formData.address || ''}
                                onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                            {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Fornecedor'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
