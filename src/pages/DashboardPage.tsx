import { useMemo } from 'react';
import { Package, Building2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpirationAlert } from '@/components/features/ExpirationAlert';
import { fetchStock, fetchProducts, fetchFiliais } from '@/services/api'; // Use API
import { isExpiringSoon, formatCurrency } from '@/lib/utils';
import { User } from '@/types';
import { useQuery } from '@tanstack/react-query';

interface DashboardPageProps {
  user: User;
  onNavigate: (page: string) => void;
}

export const DashboardPage = ({ user, onNavigate }: DashboardPageProps) => {
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

  const stats = useMemo(() => {
    const expiringItems = stock.filter(item => isExpiringSoon(item.expirationDate));
    const totalProducts = products.length;
    const totalValue = stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const stockByFilial = filiais.map(filial => ({
      filial,
      items: stock.filter(item => item.filialId === filial.id).length,
      quantity: stock.filter(item => item.filialId === filial.id).reduce((sum, item) => sum + item.quantity, 0),
    }));

    return {
      totalProducts,
      totalValue,
      expiringItems,
      stockByFilial,
    };
  }, [stock, products, filiais]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Visão geral do estoque e alertas importantes</p>
      </div>

      <ExpirationAlert
        expiringItems={stats.expiringItems}
        products={products}
        filiais={filiais}
        onViewDetails={() => onNavigate('stock')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total de Produtos</CardDescription>
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Valor Total</CardDescription>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Filiais</CardDescription>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{filiais.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unidades ativas</p>
          </CardContent>
        </Card>

        <Card className="border-warning">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estoque por Filial</CardTitle>
          <CardDescription>Distribuição de produtos entre as unidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.stockByFilial.map(({ filial, items, quantity }) => (
              <div key={filial.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
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
