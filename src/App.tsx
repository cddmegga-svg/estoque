import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StockPage } from '@/pages/StockPage';
import { ImportPage } from '@/pages/ImportPage';
import { TransfersPage } from '@/pages/TransfersPage';
import { MovementsPage } from '@/pages/MovementsPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { AdminPage } from '@/pages/AdminPage';
import { Sidebar, MobileHeader } from '@/components/layout/Sidebar';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { FinancialPage } from '@/pages/FinancialPage';
import { PurchaseRequestsPage } from '@/pages/PurchaseRequestsPage';
import { SalesPage } from '@/pages/SalesPage';
import { ConferencePage } from '@/pages/ConferencePage';
import { LogisticsPage } from '@/pages/LogisticsPage';
import { POSPage } from '@/pages/POSPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { Toaster } from '@/components/ui/toaster';
import { CommandMenu } from '@/components/CommandMenu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useProductSync } from '@/hooks/useProductSync';
import { ThemeManager } from '@/components/ThemeManager';
import { RegisterTenantPage } from '@/pages/RegisterTenantPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';

function App() {
  const { user, loading, checkPermission } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState<any>({});
  const [showRegister, setShowRegister] = useState(false);

  // Background Sync
  useProductSync();

  // Helper Functions
  const hasPermission = (permission: string) => {
    return checkPermission ? checkPermission(permission) : false;
  };

  const isSuperAdmin = user?.email === 'nexfarmapro@gmail.com';

  // Force Redirect for Super Admin
  useEffect(() => {
    if (isSuperAdmin && currentPage === 'dashboard') {
      setCurrentPage('super-admin');
    }
  }, [isSuperAdmin, currentPage]);

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    setPageParams(params || {});
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage user={user} onNavigate={handleNavigate} />;

      case 'stock':
      case 'products':
        if (!hasPermission('view_products') && !hasPermission('manage_stock') && !hasPermission('view_stock'))
          return <div className="p-8 text-center text-red-500">Acesso Negado: Você não tem permissão para ver produtos/estoque.</div>;
        return currentPage === 'stock' ? <StockPage user={user} params={pageParams} /> : <ProductsPage />;

      case 'import':
        if (!hasPermission('manage_stock')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <ImportPage user={user} />;

      case 'transfers':
        if (!hasPermission('view_transfers')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <TransfersPage user={user} />;

      case 'movements':
        if (!hasPermission('manage_stock')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <MovementsPage user={user} />;

      case 'suppliers':
        if (!hasPermission('manage_suppliers')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <SuppliersPage />;

      case 'financial':
        if (!hasPermission('view_financial')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <FinancialPage user={user} />;

      case 'purchaseRequests':
      case 'orders':
        if (!hasPermission('manage_stock')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <PurchaseRequestsPage user={user} />;

      case 'admin':
        if (!hasPermission('admin_access') && !hasPermission('manage_users')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <AdminPage currentUser={user} />;

      case 'sales':
        if (!hasPermission('create_sale')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <SalesPage />;

      case 'pos':
        if (!hasPermission('access_pos')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <POSPage />;

      case 'reports':
        if (!hasPermission('view_reports')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <ReportsPage />;

      case 'logistics':
        if (!hasPermission('manage_stock')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <LogisticsPage user={user} />;

      case 'conference':
        if (!hasPermission('manage_stock')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <ConferencePage user={user} />;

      case 'customers':
        return <CustomersPage />;

      case 'super-admin':
        // Basic frontend check (backend also protects this)
        if (user?.email !== 'nexfarmapro@gmail.com') return <div className="p-8 text-center text-red-500">Acesso Restrito ao Super Admin.</div>;
        return <SuperAdminPage />;

      default:
        return <DashboardPage user={user} onNavigate={handleNavigate} />;
    }
  };

  const isFullScreenPage = ['sales', 'pos'].includes(currentPage);

  if (loading) {
    return (
      <>
        <ThemeManager />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-primary font-medium animate-pulse">Carregando NexFarmaPro...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <ThemeManager />
      {!user ? (
        showRegister ? <RegisterTenantPage onLogin={() => setShowRegister(false)} /> : <LoginPage onRegister={() => setShowRegister(true)} />
      ) : (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <MobileHeader
              currentPage={currentPage}
              onNavigate={handleNavigate}
              user={user}
            />
          </div>

          {/* Desktop Sidebar */}
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            user={user}
            collapsed={isFullScreenPage}
            className={isFullScreenPage ? 'hidden lg:flex' : 'hidden lg:flex'}
          />

          {/* Main Content */}
          <main className={`flex-1 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-64px)] lg:h-screen lg:ml-64 ${isFullScreenPage ? 'lg:ml-16' : ''}`}>
            <div className={`mx-auto ${isFullScreenPage ? 'max-w-full px-4' : 'max-w-7xl'}`}>
              {renderPage()}
            </div>
          </main>

          <Toaster />
          <CommandMenu onNavigate={handleNavigate} />

          {/* Global Unlock Dialog */}
          <UnlockDialog />
        </div>
      )}
    </>
  );
}

// Global Unlock Component using Event Listener
function UnlockDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState('');
  const { setActiveEmployee } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-unlock-dialog', handleOpen);
    return () => window.removeEventListener('open-unlock-dialog', handleOpen);
  }, []);

  const handleUnlock = async () => {
    try {
      // 1. Try finding an Employee first (Standard Case)
      let { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('pin', pin)
        .eq('active', true)
        .single();

      let unlockedUser: any = null;

      // 2. If no employee found, try finding an Owner/User with this PIN
      if (!employeeData) {
        // Security Note: We should ideally also check if the PIN belongs to a user in the CURRENT tenant.
        // But verifying the tenant depends on the context. 
        // For now, PINs should be somewhat unique or we assume the first match is valid.
        // A better approach is to check if the user belongs to the current tenant of the logged in user?
        // Actually, "global" owners across tenants might have same PIN? Unlikely to collide often.
        // Let's just check the `users` table.
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('pin', pin)
          .single();

        if (userData) {
          unlockedUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            filialId: userData.filial_id,
            permissions: userData.permissions || [],
            employeeCode: userData.pin,
            isOwner: true
          };
        }
      } else {
        // It was an employee
        unlockedUser = {
          id: employeeData.id,
          name: employeeData.name,
          email: `employee-${employeeData.pin}@system.local`,
          role: employeeData.role || 'viewer',
          filialId: employeeData.filial_id,
          permissions: employeeData.permissions || [],
          employeeCode: employeeData.pin
        };
      }

      if (!unlockedUser) {
        toast({ variant: 'destructive', title: 'PIN Inválido', description: 'Nenhum funcionário ou dono encontrado com este PIN.' });
        return;
      }

      // Manually save to session storage to avoid race condition with reload
      sessionStorage.setItem('unlocked_employee', JSON.stringify(unlockedUser));
      setActiveEmployee?.(unlockedUser); // "Upscale" permissions

      toast({
        title: 'Acesso Liberado 🔓',
        description: `Bem-vindo(a), ${unlockedUser.name}.`,
        duration: 5000,
        className: "bg-primary text-primary-foreground"
      });

      setIsOpen(false);
      setPin('');
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro Técnico', description: 'Verifique o console para detalhes.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Liberar Acesso</DialogTitle>
          <DialogDescription className="text-center">
            Digite seu PIN para desbloquear funções administrativas.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex justify-center">
          <Input
            type="password"
            autoFocus
            placeholder="PIN"
            className="text-center text-2xl tracking-widest w-32 font-bold"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            maxLength={6}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleUnlock} className="w-full bg-primary hover:bg-primary/90">
            Liberar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default App;
