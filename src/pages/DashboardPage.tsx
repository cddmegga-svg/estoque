import { useMemo } from 'react';
import { Package, Building2, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpirationAlert } from '@/components/features/ExpirationAlert';
import { fetchStock, fetchProducts, fetchFiliais, fetchPayables } from '@/services/api'; // Use API
import { isExpiringSoon, formatCurrency } from '@/lib/utils';
import { User } from '@/types';
import { useQuery } from '@tanstack/react-query';

interface DashboardPageProps {
  user: User;
  onNavigate: (page: string, params?: any) => void;
}

export const DashboardPage = ({ user, onNavigate }: DashboardPageProps) => {
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

  // Permissions
  const isGlobalAdmin = useMemo(() => {
    // Check if role is admin OR owner, OR if permission 'admin_access' is explicitly present
    return user.role === 'admin' || user.role === 'owner' || user.permissions?.includes('admin_access');
  }, [user]);

  const stats = useMemo(() => {
    // 1. Determine Scope
    const targetFiliais = isGlobalAdmin
      ? filiais
      : filiais.filter(f => f.id === user.filialId);

    // 2. Filter Stock based on Scope
    const visibleStock = stock.filter(item => targetFiliais.some(f => f.id === item.filialId));

    const expiringItems = visibleStock.filter(item => isExpiringSoon(item.expirationDate));
    const totalProducts = products.length; // Catalog is global
    const totalValue = visibleStock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const stockByFilial = targetFiliais.map(filial => ({
      filial,
      items: visibleStock.filter(item => item.filialId === filial.id).length,
      quantity: visibleStock.filter(item => item.filialId === filial.id).reduce((sum, item) => sum + item.quantity, 0),
    }));

    return {
      totalProducts,
      totalValue,
      expiringItems,
      stockByFilial,
      filialCount: targetFiliais.length
    };
  }, [stock, products, filiais, user, isGlobalAdmin]);

  // Financial Stats
  const { data: payables = [] } = useQuery({ queryKey: ['payables'], queryFn: fetchPayables });

  const financialStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    // Filter Payables
    const visiblePayables = isGlobalAdmin
      ? payables
      : payables.filter(p => p.filialId === user.filialId);

    const dueSoon = visiblePayables.filter(p => {
      if (p.status !== 'pending') return false;
      const due = new Date(p.dueDate);
      // Fix timezone - keeping simple date comparison for now
      return due >= today && due <= next7Days;
    });

    const totalDueSoon = dueSoon.reduce((acc, curr) => acc + curr.amount, 0);
    const overdueCount = visiblePayables.filter(p => {
      if (p.status !== 'pending') return false;
      const due = new Date(p.dueDate);
      return due < today;
    }).length;

    return { totalDueSoon, countDueSoon: dueSoon.length, overdueCount };
  }, [payables, user, isGlobalAdmin]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            {isGlobalAdmin ? "Visão Geral (Todas as Filiais)" : `Visão Local: ${filiais.find(f => f.id === user.filialId)?.name || 'Minha Loja'}`}
          </p>
        </div>
      </div>

      <ExpirationAlert
        expiringItems={stats.expiringItems}
        products={products}
        filiais={filiais}
        onViewDetails={() => onNavigate('stock', { filterExpiration: 'expiring' })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card onClick={() => onNavigate('products')} className="cursor-pointer hover:bg-slate-50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total de Produtos</CardDescription>
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos cadastrados (Global)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Valor em Estoque</CardDescription>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isGlobalAdmin ? "Soma de todas lojas" : "Apenas nesta loja"}
            </p>
          </CardContent>
        </Card>

        <Card onClick={() => onNavigate('admin')} className="cursor-pointer hover:bg-slate-50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Filiais Ativas</CardDescription>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.filialCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Unidades visíveis</p>
          </CardContent>
        </Card>

        <Card
          className="border-warning cursor-pointer hover:bg-amber-50/50 transition-colors"
          onClick={() => onNavigate('stock', { filterExpiration: 'expiring' })}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Próximos Vencimento</CardDescription>
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.expiringItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Itens em até 6 meses</p>
          </CardContent>
        </Card>

        {/* Financial Widget */}
        <Card
          className={`cursor-pointer transition-colors ${financialStats.overdueCount > 0 ? "border-red-400 bg-red-50/10 hover:bg-red-100/20" : "border-blue-200 hover:bg-blue-50/20"}`}
          onClick={() => onNavigate('financial')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Contas a Pagar (7 dias)</CardDescription>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{formatCurrency(financialStats.totalDueSoon)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {financialStats.countDueSoon} a vencer
              {financialStats.overdueCount > 0 && <span className="text-destructive font-bold ml-1">({financialStats.overdueCount} atrasadas)</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estoque por Filial</CardTitle>
          <CardDescription>Distribuição de produtos entre as unidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.stockByFilial.map(({ filial, items, quantity }) => (
              <div
                key={filial.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onNavigate('stock', { filialId: filial.id })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{filial.name}</p>
                    <p className="text-sm text-muted-foreground">{filial.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{quantity}</p>
                  <p className="text-xs text-muted-foreground">{items} {items === 1 ? 'lote' : 'lotes'}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
