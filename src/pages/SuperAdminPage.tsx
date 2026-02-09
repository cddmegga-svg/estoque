import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllTenants, toggleTenantStatus, registerTenant } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Search,
    ShieldAlert,
    CheckCircle2,
    MoreHorizontal,
    Building2,
    Users,
    DollarSign,
    Lock,
    Unlock,
    Plus,
    Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

export function SuperAdminPage() {
    const { user } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    // New Tenant Form State
    const [isNewTenantOpen, setIsNewTenantOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newTenant, setNewTenant] = useState({
        companyName: '',
        cnpj: '',
        ownerName: '',
        email: '',
        password: '',
        pin: ''
    });

    // Stats
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.plan_status === 'active').length;
    const totalRevenue = activeTenants * 150; // Mock R$ 150/mo

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        try {
            setLoading(true);
            const data = await fetchAllTenants();
            setTenants(data || []);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erro de Acesso',
                description: 'Você não tem permissão para visualizar estes dados.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async () => {
        // Basic Validation
        if (!newTenant.companyName || !newTenant.cnpj || !newTenant.email || !newTenant.password || !newTenant.ownerName) {
            toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Preencha todos os campos.' });
            return;
        }

        setCreateLoading(true);
        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newTenant.email,
                password: newTenant.password,
                options: {
                    data: {
                        name: newTenant.ownerName,
                        role: 'admin'
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Usuário não criado.");

            // 2. Register Tenant RPC
            await registerTenant(
                newTenant.companyName,
                newTenant.cnpj,
                newTenant.email,
                newTenant.ownerName,
                authData.user.id,
                newTenant.pin
            );

            toast({ title: 'Sucesso', description: 'Nova farmácia cadastrada!' });
            setIsNewTenantOpen(false);
            setNewTenant({ companyName: '', cnpj: '', ownerName: '', email: '', password: '', pin: '' });
            loadTenants();

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao Cadastrar', description: error.message });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await toggleTenantStatus(tenantId, newStatus);
            toast({
                title: newStatus === 'active' ? 'Farmácia Ativada' : 'Farmácia Suspensa',
                description: `O acesso foi ${newStatus === 'active' ? 'liberado' : 'bloqueado'} com sucesso.`,
                className: newStatus === 'active' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            });
            loadTenants(); // Refresh
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar status',
                description: 'Tente novamente.'
            });
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.cnpj?.includes(searchTerm)
    );

    if (loading) return <div className="p-8 text-center animate-pulse">Carregando Painel Administrativo...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="h-8 w-8 text-purple-600" />
                        Super Admin
                    </h1>
                    <p className="text-muted-foreground">Gestão global de farmácias (Tenants)</p>
                </div>
                <div className="flex gap-2">
                    {/* ... Cards ... */}
                </div>
                <Button onClick={() => setIsNewTenantOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                    <Plus className="w-4 h-4" /> Nova Farmácia
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm max-w-md">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nome ou CNPJ..."
                    className="border-0 focus-visible:ring-0"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Tenant Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Farmácia</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Usuários</TableHead>
                            <TableHead>Módulos</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTenants.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                                            {tenant.logo_url ? (
                                                <img src={tenant.logo_url} className="w-full h-full object-cover" />
                                            ) : (
                                                tenant.name?.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{tenant.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{tenant.cnpj || 'Sem CNPJ'}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={tenant.plan_status === 'active' ? 'default' : 'destructive'}
                                        className={tenant.plan_status === 'active' ? 'bg-green-600' : ''}>
                                        {tenant.plan_status === 'active' ? 'Ativo' : 'Suspenso'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-slate-600">
                                        <Users className="h-4 w-4" />
                                        {tenant.users_count}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {/* Mock de Features por enquanto */}
                                        {tenant.features?.sngpc && <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-purple-50">SNGPC</Badge>}
                                        {tenant.features?.fiscal && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">NFe</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                    {tenant.created_at ? format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tenant.id)}>
                                                Copiar ID
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className={tenant.plan_status === 'active' ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}
                                                onClick={() => handleToggleStatus(tenant.id, tenant.plan_status)}
                                            >
                                                {tenant.plan_status === 'active' ? (
                                                    <><Lock className="mr-2 h-4 w-4" /> Bloquear Acesso</>
                                                ) : (
                                                    <><Unlock className="mr-2 h-4 w-4" /> Liberar Acesso</>
                                                )}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* New Tenant Modal */}
            <Dialog open={isNewTenantOpen} onOpenChange={setIsNewTenantOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Cadastrar Nova Farmácia</DialogTitle>
                        <DialogDescription>
                            Use este formulário para criar manualmente um novo tenant e o usuário proprietário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label>Nome da Farmácia</Label>
                            <Input
                                value={newTenant.companyName}
                                onChange={e => setNewTenant({ ...newTenant, companyName: e.target.value })}
                                placeholder="Ex: Farmácia Popular"
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label>CNPJ</Label>
                            <Input
                                value={newTenant.cnpj}
                                onChange={e => setNewTenant({ ...newTenant, cnpj: e.target.value })}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div className="col-span-2 border-t my-2" />
                        <div className="space-y-2 col-span-2">
                            <Label className="font-bold text-slate-700">Dados do Proprietário (Admin)</Label>
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label>Nome do Dono</Label>
                            <Input
                                value={newTenant.ownerName}
                                onChange={e => setNewTenant({ ...newTenant, ownerName: e.target.value })}
                                placeholder="Nome Completo"
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label>Email de Login</Label>
                            <Input
                                value={newTenant.email}
                                onChange={e => setNewTenant({ ...newTenant, email: e.target.value })}
                                placeholder="email@farmacia.com"
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label>Senha Provisória</Label>
                            <Input
                                type="password"
                                value={newTenant.password}
                                onChange={e => setNewTenant({ ...newTenant, password: e.target.value })}
                                placeholder="******"
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="flex items-center gap-2">PIN Administrativo <Lock className="w-3 h-3 text-slate-400" /></Label>
                            <Input
                                value={newTenant.pin}
                                onChange={e => setNewTenant({ ...newTenant, pin: e.target.value })}
                                placeholder="123456"
                                maxLength={6}
                            />
                            <p className="text-[10px] text-muted-foreground">Senha numérica de 6 dígitos para liberar funções restritas.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTenantOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTenant} disabled={createLoading} className="bg-purple-600 hover:bg-purple-700">
                            {createLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Farmácia'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
