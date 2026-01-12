
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RegisterPage } from '@/pages/RegisterPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StockPage } from '@/pages/StockPage';
import { ImportPage } from '@/pages/ImportPage';
import { TransfersPage } from '@/pages/TransfersPage';
import { AdminPage } from '@/pages/AdminPage';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
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
      case 'admin':
        return user.role === 'admin' ? <AdminPage currentUser={user} /> : <div className="text-center py-12 text-muted-foreground">Acesso restrito a administradores</div>;
      default:
        return <DashboardPage user={user} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onNavigate={setCurrentPage}
        onRegister={() => { }} // Hidden or re-purposed
      />
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isAdmin={user?.role === 'admin'}
      />

      <main className="container mx-auto px-4 py-8">
        {renderPage()}
      </main>

      <Toaster />
    </div>
  );
}

export default App;
