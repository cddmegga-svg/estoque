
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StockPage } from '@/pages/StockPage';
import { ImportPage } from '@/pages/ImportPage';
import { TransfersPage } from './pages/TransfersPage';
import { MovementsPage } from './pages/MovementsPage';
import { ProductsPage } from './pages/ProductsPage';
import { AdminPage } from './pages/AdminPage';
import { Sidebar, MobileHeader } from '@/components/layout/Sidebar';
import { SuppliersPage } from './pages/SuppliersPage';
import { FinancialPage } from './pages/FinancialPage';
import { PurchaseRequestsPage } from '@/pages/PurchaseRequestsPage';
import { SalesPage } from '@/pages/SalesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { Toaster } from '@/components/ui/toaster';

import { useProductSync } from '@/hooks/useProductSync';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState<any>({});
  const [showRegister, setShowRegister] = useState(false);

  // Background Sync
  useProductSync();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-emerald-600 font-medium animate-pulse">Carregando PharmaFlow...</div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (showRegister) {
      return (
        <RegisterPage
          onUserCreated={() => setShowRegister(false)}
          onBack={() => setShowRegister(false)}
        />
      );
    }
    return (
      <>
        <LoginPage onRegister={() => setShowRegister(true)} />
      </>
    );
  }

  // Check Permissions Helper
  const hasPermission = (permission: string) => {
    // Admin always allows
    if (user.role === 'admin') return true;
    // Check permissions array
    return user.permissions?.includes(permission);
  };

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
        if (!hasPermission('view_products') && !hasPermission('manage_stock'))
          return <div className="p-8 text-center text-red-500">Acesso Negado: Você não tem permissão para ver produtos.</div>;
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
        return <SuppliersPage />; // Usually open or sales

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

      case 'reports':
        if (!hasPermission('view_reports')) return <div className="p-8 text-center text-red-500">Acesso Negado.</div>;
        return <ReportsPage />;

      default:
        return <DashboardPage user={user} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
      />

      {/* Desktop Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-64px)] lg:h-screen">
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
