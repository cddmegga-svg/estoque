import { useState } from 'react';
import { Shield, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchUsers, fetchFiliais, updateUser, deleteUser } from '@/services/api';
import { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AdminPageProps {
  currentUser: User;
}

export const AdminPage = ({ currentUser }: AdminPageProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) =>
      updateUser(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário atualizado',
        description: 'As alterações foram salvas com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido do sistema',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'viewer') => {
    updateMutation.mutate({ id: userId, updates: { role: newRole } });
  };

  const handleFilialChange = (userId: string, newFilialId: string) => {
    updateMutation.mutate({ id: userId, updates: { filialId: newFilialId } });
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você não pode excluir sua própria conta',
      });
      return;
    }

    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteMutation.mutate(userId);
    }
  };

  const getUserFilial = (filialId: string) => filiais.find(f => f.id === filialId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Administração</h2>
          <p className="text-muted-foreground mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
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
                            {user.id === currentUser.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary">{filial?.name}</Badge>
                            <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                              {user.role === 'admin' ? (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  Administrador
                                </>
                              ) : (
                                'Consulta'
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'viewer')}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Consulta</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={user.filialId}
                            onValueChange={(value) => handleFilialChange(user.id, value)}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {filiais.map(filial => (
                                <SelectItem key={filial.id} value={filial.id}>
                                  {filial.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser.id || deleteMutation.isPending}
                          >
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

      <Card>
        <CardHeader>
          <CardTitle>Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total de Usuários</p>
              <p className="text-3xl font-bold text-foreground">{users.length}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Administradores</p>
              <p className="text-3xl font-bold text-primary">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Consulta</p>
              <p className="text-3xl font-bold text-foreground">
                {users.filter(u => u.role === 'viewer').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
