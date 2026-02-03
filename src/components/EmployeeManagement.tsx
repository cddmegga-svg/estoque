import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fetchEmployees, addEmployee, updateEmployee, deleteEmployee } from '@/services/api';
import { User, Filial } from '@/types';

export const EmployeeManagement = ({ currentUser, filiais }: { currentUser: User, filiais: Filial[] }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<any>(null);
    const [form, setForm] = useState({ name: '', role: 'salesperson', pin: '', filial_id: '' });
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });

    const openDialog = (emp?: any) => {
        if (emp) {
            setEditingEmp(emp);
            setForm({ name: emp.name, role: emp.role, pin: emp.pin, filial_id: emp.filial_id || '' });
        } else {
            setEditingEmp(null);
            setForm({ name: '', role: 'salesperson', pin: '', filial_id: currentUser.filialId });
        }
        setIsDialogOpen(true);
    };

    const getFilialName = (id: string) => filiais.find(f => f.id === id)?.name || '-';

    const DEFAULT_PERMISSIONS: Record<string, string[]> = {
        salesperson: ['create_sale', 'view_products'],
        cashier: ['access_pos', 'manage_cash', 'create_sale'],
        manager: ['admin_access', 'manage_users', 'manage_stock', 'view_reports', 'view_financial'],
        stock: ['view_stock', 'manage_stock', 'view_products'],
        pharmacist: ['view_stock', 'manage_stock', 'create_sale', 'view_reports']
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'manager': return 'Gerente';
            case 'cashier': return 'Caixa';
            case 'stock': return 'Estoquista';
            case 'pharmacist': return 'Farmacêutico';
            default: return 'Vendedor';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Apply default permissions based on role if creating or if needing update
            const permissions = DEFAULT_PERMISSIONS[form.role] || [];
            const payload = { ...form, permissions };

            if (editingEmp) {
                await updateEmployee(editingEmp.id, payload);
                toast({ title: 'Atualizado', description: 'Colaborador atualizado.' });
            } else {
                await addEmployee(payload);
                toast({ title: 'Criado', description: 'Colaborador adicionado à equipe.' });
            }
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            setIsDialogOpen(false);
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar.' });
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" /> Novo Membro
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((emp: any) => (
                    <Card key={emp.id}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${emp.role === 'manager' ? 'bg-red-500' : emp.role === 'cashier' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                <span className="font-bold text-lg">{emp.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => openDialog(emp)}><Edit className="w-4 h-4" /></Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <Badge variant="outline">{getRoleLabel(emp.role)}</Badge>
                                    <span className="font-mono bg-slate-100 px-2 py-1 rounded">PIN: {emp.pin}</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center justify-between pt-2">
                                    <span>Filial: {getFilialName(emp.filial_id)}</span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive mt-4" onClick={() => handleDelete(emp.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Remover
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEmp ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Função</Label>
                            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="salesperson">Vendedor</SelectItem>
                                    <SelectItem value="cashier">Operador de Caixa</SelectItem>
                                    <SelectItem value="stock">Estoquista</SelectItem>
                                    <SelectItem value="pharmacist">Farmacêutico</SelectItem>
                                    <SelectItem value="manager">Gerente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>PIN de Acesso (Senha Numérica)</Label>
                            <Input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} maxLength={6} required placeholder="Ex: 1234" />
                        </div>
                        <div className="space-y-2">
                            <Label>Filial</Label>
                            <Select value={form.filial_id} onValueChange={v => setForm({ ...form, filial_id: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
