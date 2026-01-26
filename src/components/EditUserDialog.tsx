import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '@/services/api';
import { User, Filial } from '@/types';

interface EditUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    filiais: Filial[];
}

export const EditUserDialog = ({ isOpen, onClose, user, filiais }: EditUserDialogProps) => {
    const [name, setName] = useState('');
    const [filialId, setFilialId] = useState('');
    const [role, setRole] = useState<'admin' | 'viewer'>('viewer');

    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (user) {
            setName(user.name);
            setFilialId(user.filialId);
            if (user) {
                setName(user.name);
                setFilialId(user.filialId);
                // @ts-ignore
                setRole(user.role);
            }
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: any }) => updateUser(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast({ title: 'Usuário Atualizado', description: 'As alterações foram salvas.' });
            onClose();
        },
        onError: (err: any) => {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        updateMutation.mutate({
            id: user.id,
            updates: {
                name,
                filialId,
                role
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>Alterar dados de acesso e local.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Filial</Label>
                        <Select value={filialId} onValueChange={setFilialId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Permissão Geral</Label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Colaborador</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={updateMutation.isPending}>Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
