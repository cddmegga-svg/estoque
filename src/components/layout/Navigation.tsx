import { LayoutDashboard, Package, FileText, ArrowLeftRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isAdmin?: boolean;
}

const getNavItems = (isAdmin: boolean) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stock', label: 'Estoque', icon: Package },
    { id: 'import', label: 'Importar XML', icon: FileText },
    { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
  ];
  
  if (isAdmin) {
    items.push({ id: 'admin', label: 'Admin', icon: Shield });
  }
  
  return items;
};

export const Navigation = ({ currentPage, onNavigate, isAdmin = false }: NavigationProps) => {
  const navItems = getNavItems(isAdmin);
  
  return (
    <nav className="bg-white border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
