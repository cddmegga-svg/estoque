import { LayoutDashboard, Package, FileText, ArrowLeftRight, Shield, Zap, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types';

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    user: User | null;
}

export const Sidebar = ({ currentPage, onNavigate, user }: SidebarProps) => {
    const { signOut } = useAuth();
    const isAdmin = user?.role === 'admin';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'stock', icon: Package, label: 'Estoque', path: '/stock' },
        { id: 'products', icon: Package, label: 'Produtos', path: '/products' },
        { id: 'movements', icon: RefreshCw, label: 'Movimentação Manual', path: '/movements' },
        { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'admin', label: 'Administração', icon: Shield });
    }

    return (
        <aside className="w-64 bg-white border-r border-border min-h-screen flex flex-col fixed left-0 top-0 h-full z-50">
            {/* Header */}
            <div className="h-20 flex items-center px-6 border-b border-border/50 gap-3">
                <div className="h-10 w-10 flex-shrink-0">
                    <img src="/logo.png" alt="Mega Farma" className="h-full w-full object-contain" />
                </div>
                <div>
                    <h1 className="text-lg font-extrabold text-[#d32f2f] leading-none tracking-tight">MEGA FARMA</h1>
                    <p className="text-xs font-semibold text-[#1976d2] tracking-wider">POPULAR</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all',
                                isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-muted-foreground")} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-border/50 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate capitalize">
                            {user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    onClick={() => signOut()}
                >
                    <LogOut className="w-4 h-4" />
                    Sair
                </Button>
            </div>
        </aside>
    );
};
