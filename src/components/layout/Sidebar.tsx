import { LayoutDashboard, Package, FileText, ArrowLeftRight, Shield, Zap, LogOut, RefreshCw, Menu, DollarSign, Users, ClipboardList, BarChart3, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string, params?: any) => void;
    user: User | null;
    collapsed?: boolean;
    className?: string;
}

const SidebarContent = ({ currentPage, onNavigate, user, isMobile = false, onClose, collapsed = false }: SidebarProps & { isMobile?: boolean, onClose?: () => void }) => {
    const { signOut, checkPermission, activeEmployee } = useAuth();

    // Permission Checks (Now uses the unified logic)
    const hasPermission = (permission: string) => {
        const result = checkPermission ? checkPermission(permission) : false;
        console.log(`Sidebar: ${permission} = ${result}. ActiveEmp: ${activeEmployee?.name}`);
        return result;
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ];

    if (hasPermission('view_products') || hasPermission('manage_stock') || hasPermission('view_stock')) {
        menuItems.push(
            { id: 'stock', icon: Package, label: 'Estoque', path: '/stock' },
            { id: 'products', icon: Package, label: 'Produtos', path: '/products' }
        );
    }

    if (hasPermission('create_sale')) {
        menuItems.push({ id: 'sales', icon: DollarSign, label: 'Pré-Venda (Balcão)', path: '/sales' });
        menuItems.push({ id: 'customers', label: 'Clientes (CRM)', icon: Users, path: '/customers' });
    }

    if (hasPermission('manage_suppliers')) {
        menuItems.push({ id: 'suppliers', label: 'Fornecedores', icon: Users, path: '/suppliers' });
    }

    if (hasPermission('view_reports')) {
        menuItems.push({ id: 'reports', icon: BarChart3, label: 'Relatórios (BI)', path: '/reports' });
    }

    if (hasPermission('manage_stock')) {
        menuItems.push(
            { id: 'logistics', icon: Truck, label: 'Logística & Operações', path: '/logistics' },
            { id: 'orders', label: 'Encomendas', icon: ClipboardList, path: '/orders' }
        );
    }

    if (hasPermission('view_financial')) {
        menuItems.push({ id: 'financial', label: 'Contas a Pagar', icon: DollarSign, path: '/financial' });
    }

    if (hasPermission('access_pos')) {
        menuItems.push({ id: 'pos', label: 'Frente de Caixa', icon: DollarSign, path: '/pos' });
    }

    if (hasPermission('manage_users') || user?.role === 'admin') {
        menuItems.push({ id: 'admin', label: 'Administração', icon: Shield, path: '/admin' });
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="h-20 flex items-center px-6 border-b border-border/50 gap-3 flex-shrink-0">
                <div className={cn("flex-shrink-0 transition-all duration-300", collapsed ? "h-8 w-8" : "h-10 w-10")}>
                    <img src="/logo.png" alt="Mega Farma" className="h-full w-full object-contain" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <h1 className="text-lg font-extrabold text-[#d32f2f] leading-none tracking-tight">MEGA FARMA</h1>
                        <p className="text-xs font-semibold text-[#1976d2] tracking-wider">POPULAR</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className={cn("flex-1 py-6 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
                <TooltipProvider delayDuration={0}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;

                        const ButtonContent = (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onNavigate(item.id);
                                    if (isMobile && onClose) onClose();
                                }}
                                className={cn(
                                    'w-full flex items-center gap-3 py-2.5 text-sm font-medium rounded-lg transition-all',
                                    collapsed ? 'justify-center px-0' : 'px-3',
                                    isActive
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                                )}
                            >
                                <Icon className={cn("flex-shrink-0", collapsed ? "w-6 h-6" : "w-5 h-5", isActive ? "text-emerald-600" : "text-muted-foreground")} />
                                {!collapsed && item.label}
                            </button>
                        );

                        if (collapsed) {
                            return (
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        {ButtonContent}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="font-bold bg-slate-900 text-white">
                                        <p>{item.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return ButtonContent;
                    })}
                </TooltipProvider>
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-border/50 bg-slate-50/50 flex-shrink-0">
                <div className={cn("flex items-center gap-3 mb-4", collapsed && "justify-center")}>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate capitalize">
                                {user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                            </p>
                        </div>
                    )}
                </div>

                <Button
                    variant="outline"
                    className={cn("w-full gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 mb-2", collapsed ? "justify-center px-0" : "justify-start")}
                    onClick={() => {
                        // TODO: trigger unlock dialog
                        // For now we just use the CommandMenu (Ctrl+K) or assume the POS enforces generic login
                        // User requested "Surgical" permissions.
                        // Ideally we should have a PIN Prompt here.
                        window.dispatchEvent(new CustomEvent('open-unlock-dialog'));
                    }}
                    title={collapsed ? "Desbloquear Acesso" : undefined}
                >
                    <Shield className="w-4 h-4" />
                    {!collapsed && "Liberar Acesso"}
                </Button>

                <Button
                    variant="ghost"
                    className={cn("w-full gap-2 text-red-400 hover:bg-red-50 hover:text-red-600", collapsed ? "justify-center px-0" : "justify-start")}
                    onClick={() => signOut()}
                    title={collapsed ? "Sair" : undefined}
                >
                    <LogOut className="w-4 h-4" />
                    {!collapsed && "Sair"}
                </Button>
            </div>
        </div>
    );
};

export const Sidebar = (props: SidebarProps) => {
    return (
        <aside className={cn(
            "border-r border-border min-h-screen hidden lg:flex flex-col fixed left-0 top-0 h-full z-50 bg-white shadow-sm transition-all duration-300",
            props.collapsed ? "w-16" : "w-64",
            props.className
        )}>
            <SidebarContent {...props} />
        </aside>
    );
};

export const MobileHeader = (props: SidebarProps) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8">
                    <img src="/logo.png" alt="Mega Farma" className="h-full w-full object-contain" />
                </div>
                <span className="font-bold text-lg text-emerald-800">PharmaFlow mobile</span>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="w-6 h-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <SidebarContent {...props} isMobile={true} onClose={() => setOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
