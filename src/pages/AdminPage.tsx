import { useState } from 'react';
import { Shield, Trash2, Users, Building, Plus, Edit, MapPin, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchUsers, fetchFiliais, updateUser, deleteUser, addFilial, updateFilial } from '@/services/api';
import { User, Filial } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AdminPageProps {
  currentUser: User;
}

export const AdminPage = ({ currentUser }: AdminPageProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States for Filial Dialog
  const [isFilialDialogOpen, setIsFilialDialogOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [filialForm, setFilialForm] = useState<Partial<Filial>>({ type: 'store' });

  // Permissions State
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const AVAILABLE_PERMISSIONS = [
    { id: 'view_dashboard', label: 'Ver Dashboard' },
    { id: 'view_products', label: 'Ver Produtos (Cadastro)' },
    { id: 'view_stock', label: 'Ver Estoque (Quantidades)' },
    { id: 'manage_stock', label: 'Movimentar Estoque (Entrada/Saída)' },
    { id: 'create_sale', label: 'Realizar Vendas' },
    { id: 'manage_suppliers', label: 'Gerenciar Fornecedores' },
    { id: 'view_reports', label: 'Ver Relatórios (BI)' },
    { id: 'view_transfers', label: 'Ver Transferências' },
    { id: 'create_transfer', label: 'Criar Transferências' },
    { id: 'manage_users', label: 'Gerenciar Usuários' },
    { id: 'view_financial', label: 'Ver Financeiro' },
    { id: 'access_pos', label: 'Acessar Frente de Caixa (PDV)' },
    { id: 'manage_cash', label: 'Gerenciar Caixa (Sangria/Fechamento)' },
    { id: 'admin_access', label: 'Acesso Admin Completo' },
  ];

  // Queries
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

  // User Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) => updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário atualizado', description: 'As alterações foram salvas com sucesso' });
    },
    onError: (error: any) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message })
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuário excluído', description: 'O usuário foi removido do sistema' });
    },
    onError: (error: any) => toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message })
  });

  // Filial Mutations
  const createFilialMutation = useMutation({
    mutationFn: addFilial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filiais'] });
      setIsFilialDialogOpen(false);
      resetFilialForm();
      toast({ title: 'Filial criada', description: 'Nova unidade cadastrada com sucesso' });
    },
    onError: (error: any) => toast({ variant: 'destructive', title: 'Erro ao criar', description: error.message })
  });

  const updateFilialMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Filial> }) => updateFilial(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filiais'] });
      setIsFilialDialogOpen(false);
      resetFilialForm();
      toast({ title: 'Filial atualizada', description: 'Dados da unidade salvos com sucesso' });
    },
    onError: (error: any) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message })
  });

  // Handlers
  const handleRoleChange = (userId: string, newRole: 'admin' | 'viewer') => {
    updateUserMutation.mutate({ id: userId, updates: { role: newRole } });
  };

  const handleUserFilialChange = (userId: string, newFilialId: string) => {
    updateUserMutation.mutate({ id: userId, updates: { filialId: newFilialId } });
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) return;
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleOpenFilialDialog = (filial?: Filial) => {
    if (filial) {
      setEditingFilial(filial);
      setFilialForm(filial);
    } else {
      setEditingFilial(null);
      resetFilialForm();
    }
    setIsFilialDialogOpen(true);
  };

  const resetFilialForm = () => {
    setFilialForm({ type: 'store', name: '', cnpj: '', address: '' });
  };

  const handleOpenPermissions = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || []);
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      updates: { permissions: selectedPermissions }
    }, {
      onSuccess: () => setIsPermissionsDialogOpen(false)
    });
  };

  const handleFilialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filialForm.name || !filialForm.cnpj) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome e CNPJ são obrigatórios.' });
      return;
    }

    if (editingFilial) {
      updateFilialMutation.mutate({ id: editingFilial.id, updates: filialForm });
    } else {
      // @ts-ignore - ID is generated by DB
      createFilialMutation.mutate(filialForm as Filial);
    }
  };

  const getUserFilial = (filialId: string) => filiais.find(f => f.id === filialId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Administração</h2>
          <p className="text-muted-foreground mt-1">Gerencie usuários, balcões e permissões</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="filiais">Filiais e Centros de Distribuição</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsCreateUserOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Usuário
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map(user => {
                  const filial = getUserFilial(user.filialId);
                  return (
                    <Card key={user.id} className={user.id === currentUser.id ? 'border-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{user.name}</h3>
                                {user.id === currentUser.id && <Badge variant="outline" className="text-xs">Você</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {user.employeeCode && <Badge variant="outline" className="mt-1 bg-slate-50 text-slate-600">PIN: {user.employeeCode}</Badge>}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge variant="secondary">{filial?.name}</Badge>
                                <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                  {user.role === 'admin' ? <><Shield className="w-3 h-3 mr-1" /> Administrador</> : 'Consulta'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="icon" onClick={() => handleOpenPermissions(user)} title="Gerenciar Permissões">
                                <Shield className="w-4 h-4 text-amber-600" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleDeleteUser(user.id)} disabled={user.id === currentUser.id}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filiais">
          <div className="flex justify-end mb-4">
            <Button onClick={() => handleOpenFilialDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Nova Filial
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filiais.map(filial => (
              <Card key={filial.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {filial.type === 'warehouse' ? 'Centro de Distribuição' : 'Loja Física'}
                  </CardTitle>
                  {filial.type === 'warehouse' ? <Building className="h-4 w-4 text-muted-foreground" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">{filial.name}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1"><FileText className="w-3 h-3" /> {filial.cnpj}</p>
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {filial.address}</p>
                  </div>
                  <Button variant="outline" className="w-full mt-4" size="sm" onClick={() => handleOpenFilialDialog(filial)}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFilialDialogOpen} onOpenChange={setIsFilialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFilial ? 'Editar Filial' : 'Nova Filial'}</DialogTitle>
            <DialogDescription>Preencha os dados da unidade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFilialSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Filial</Label>
              <Input id="name" value={filialForm.name || ''} onChange={e => setFilialForm({ ...filialForm, name: e.target.value })} placeholder="Ex: Filial Centro" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={filialForm.cnpj || ''} onChange={e => setFilialForm({ ...filialForm, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={filialForm.address || ''} onChange={e => setFilialForm({ ...filialForm, address: e.target.value })} placeholder="Rua..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={filialForm.type} onValueChange={(val: 'store' | 'warehouse') => setFilialForm({ ...filialForm, type: val })}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">Loja Física</SelectItem>
                  <SelectItem value="warehouse">Centro de Distribuição (CD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFilialDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createFilialMutation.isPending || updateFilialMutation.isPending}>
                {createFilialMutation.isPending || updateFilialMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissões de Acesso</DialogTitle>
            <DialogDescription>
              Defina o que <strong>{selectedUser?.name}</strong> pode fazer no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {AVAILABLE_PERMISSIONS.map(perm => (
              <div key={perm.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={perm.id}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={selectedPermissions.includes(perm.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPermissions([...selectedPermissions, perm.id]);
                    } else {
                      setSelectedPermissions(selectedPermissions.filter(p => p !== perm.id));
                    }
                  }}
                />
                <Label htmlFor={perm.id} className="text-sm font-normal cursor-pointer">
                  {perm.label}
                </Label>
              </div>
            ))}
          </div>

          {/* Role Editor */}
          <div className="border-t pt-4 mt-4">
            <Label className="mb-2 block">Nível de Acesso (Role)</Label>
            <Select
              value={selectedUser?.role || 'viewer'}
              onValueChange={(val: 'admin' | 'viewer') => {
                if (selectedUser) handleRoleChange(selectedUser.id, val);
                // Optimistic update for UI if needed, but react-query usually handles it
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Colaborador (Visualizador)</SelectItem>
                <SelectItem value="admin">Administrador (Total)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Administradores têm acesso irrestrito.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePermissions} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog - reusing part of RegisterPage logic but inside Admin */}
      <CreateUserDialog
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        filiais={filiais}
      />
    </div>
  );
};

// Sub-component for Create User to keep file clean-ish
import { useAuth } from '@/hooks/useAuth';

const CreateUserDialog = ({ isOpen, onClose, filiais }: { isOpen: boolean, onClose: () => void, filiais: Filial[] }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [filialId, setFilialId] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Note: Client-side signUp automatically signs in the new user, booting the Admin out.
      // This is a limitation of Supabase Client SDK.
      // We can try to use a secondary connection if we had one, but we don't.
      // WARNING to User: This will likely logout.
      // Workaround: We could just insert into 'users' table if we weren't using Auth mainly? 
      // No, need Auth user. 
      // Let's implement it and see. The user requested it here.

      await signUp(email, password, {
        name,
        role: 'viewer',
        filialId,
        employeeCode
      });

      toast({ title: 'Usuário Criado', description: 'O usuário foi criado. Verifique o email.' });
      onClose();
      setName('');
      setEmail('');
      setPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Usuário</DialogTitle>
          <DialogDescription>
            Cria um novo usuário no sistema.
            <span className="block text-red-500 font-bold mt-2">Atenção: Ao criar um usuário aqui, sua sessão de Administrador pode ser encerrada (Limitação do sistema).</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Código / PIN (Para PDV)</Label>
            <Input
              value={employeeCode}
              onChange={e => setEmployeeCode(e.target.value)}
              placeholder="Ex: 101"
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label>Filial</Label>
            <Select value={filialId} onValueChange={setFilialId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Criar Usuário</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
