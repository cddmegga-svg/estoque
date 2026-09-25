import React from 'react';
import { cn } from '@/lib/utils';
import { 
    LayoutDashboard, 
    Package, 
    Shield, 
    LogOut,
    ArrowLeftRight,
    FileText,
    ClipboardList,
    RefreshCw,
    Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface User {
  role?: string;
  permissions?: string[];
  email?: string;
  [key: string]: any;
}

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    user: User | null;
    collapsed?: boolean;
    className?: string;
}

interface MobileHeaderProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    user: User | null;
}

const hasPermission = (user: User | null, permission: string) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    return user.permissions?.includes(permission) || false;
};

export const MobileHeader = ({ currentPage, onNavigate, user }: MobileHeaderProps) => {
    return (
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-foreground">NexFarmaPro</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => {
                // Just toggle a custom event for the mobile menu if needed, or handle it via App state.
                // For now, this just exists to satisfy the prop contract.
            }}>
                <Menu className="w-5 h-5" />
            </Button>
        </div>
    );
};

export const Sidebar = ({ currentPage, onNavigate, user, collapsed = false, className }: SidebarProps) => {
    
    const menuItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, path: 'dashboard' },
    ];

    const isSuperAdmin = user?.email === 'nexfarmapro@gmail.com';

    if (isSuperAdmin) {
        menuItems.push({
            id: 'super-admin',
            label: 'Gestão SaaS (Admin)',
            icon: Shield,
            path: 'super-admin'
        });
    } else {
        // NOVOS MENUS DO NEXFARMAPRO (COFRE DIGITAL)
        menuItems.push({ id: 'documents', label: 'Cofre Digital', icon: Package, path: 'documents' });
        
        // M�dulos de Compliance
        menuItems.push({ id: 'audit', label: 'Auditoria de Logs', icon: ClipboardList, path: 'audit' });
        menuItems.push({ id: 'retention', label: 'Políticas de Retenção', icon: FileText, path: 'retention' });
        menuItems.push({ id: 'legal-holds', label: 'Legal Holds', icon: Shield, path: 'legal-holds' });
        
        // Integrações
        if (hasPermission(user, 'admin_access') || user?.role === 'admin') {
            menuItems.push({ id: 'integrations', label: 'Connectors & SNCR', icon: ArrowLeftRight, path: 'integrations' });
            menuItems.push({ id: 'backups', label: 'Gestão de Backups', icon: RefreshCw, path: 'backups' });
        }

        // Configurações
        if (hasPermission(user, 'manage_users') || user?.role === 'admin') {
            menuItems.push({ id: 'admin', label: 'Configurações', icon: Shield, path: 'admin' });
        }
    }

    return (
        <div className={cn("flex flex-col h-full bg-white border-r fixed inset-y-0 left-0 z-50 transition-all duration-300", collapsed ? "w-16" : "w-64", className)}>
            <div className="h-20 flex items-center px-6 border-b border-border/50 gap-3 flex-shrink-0">
                <div className={cn("flex-shrink-0 transition-all duration-300 rounded-lg overflow-hidden", collapsed ? "h-8 w-8" : "h-10 w-10")}>
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-xl">N</span>
                    </div>
                </div>
                {!collapsed && (
                    <div className="flex flex-col min-w-0 transition-opacity duration-300">
                        <span className="font-bold text-lg leading-tight truncate text-foreground">
                            NexFarmaPro
                        </span>
                        <span className="text-xs font-medium text-emerald-600 truncate uppercase tracking-wider">
                            Compliance Vault
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin">
                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.path || (currentPage === '' && item.path === 'dashboard');
                        return (
                            <Button
                                key={item.id}
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-3 relative group transition-all duration-200",
                                    isActive ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    collapsed ? "justify-center px-0" : "px-3"
                                )}
                                onClick={() => onNavigate(item.path)}
                                title={collapsed ? item.label : undefined}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                                )}
                                <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <div className="p-4 border-t border-border/50 bg-slate-50/50 mt-auto">
                <Button
                    variant="ghost"
                    className={cn("w-full gap-2 text-red-500 hover:bg-red-50 hover:text-red-600", collapsed ? "justify-center px-0" : "justify-start")}
                    onClick={() => {
                        // Dispatch a logout event or clear localStorage to trigger AuthContext logout
                        localStorage.removeItem('sb-auth-token');
                        window.location.reload();
                    }}
                    title={collapsed ? "Sair" : undefined}
                >
                    <LogOut className="w-4 h-4" />
                    {!collapsed && "Sair do Sistema"}
                </Button>
            </div>
        </div>
    );
};

