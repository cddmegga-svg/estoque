
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
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showRegister, setShowRegister] = useState(false);

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

  // Authenticated
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage user={user} onNavigate={setCurrentPage} />;
      case 'stock':
        return <StockPage user={user} />;
      case 'import':
        return <ImportPage user={user} />;
      case 'transfers':
        return <TransfersPage user={user} />;
      case 'products':
        return <ProductsPage />;
      case 'movements':
        return <MovementsPage />;
      case 'admin':
        return user.role === 'admin' ? <AdminPage currentUser={user} /> : <div className="text-center py-12 text-muted-foreground">Acesso restrito a administradores</div>;
      default:
        return <DashboardPage user={user} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixed width */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={user}
      />

      {/* Main Content - Computed margin to account for fixed sidebar */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
