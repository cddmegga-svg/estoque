import { LogOut, User as UserIcon, Building2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { fetchFiliais } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

interface HeaderProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onRegister: () => void;
}

export const Header = ({ user, onNavigate, onRegister }: HeaderProps) => {
  const { data: filiais = [] } = useQuery({
    queryKey: ['filiais'],
    queryFn: fetchFiliais,
    enabled: !!user // Only fetch if user is logged in
  });

  const userFilial = user ? filiais.find(f => f.id === user.filialId) : null;

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">FarmaControl</h1>
              <p className="text-sm text-muted-foreground">Gestão de Estoque</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <UserIcon className="w-4 h-4" />
                    {user.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userFilial?.name} • {user.role === 'admin' ? 'Administrador' : 'Consulta'}
                  </div>
                </div>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={onRegister}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Cadastre-se
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
