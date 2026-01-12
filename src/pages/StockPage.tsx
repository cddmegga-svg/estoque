import { useState, useMemo } from 'react';
import { Package, Filter, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchStock, fetchProducts, fetchFiliais } from '@/services/api';
import { formatDate, formatCurrency, isExpiringSoon, isExpired } from '@/lib/utils';
import { User } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { ProductCombobox } from '@/components/ProductCombobox';

interface StockPageProps {
  user: User;
}

export const StockPage = ({ user }: StockPageProps) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [filterFilial, setFilterFilial] = useState<string>('all');
  const [filterExpiration, setFilterExpiration] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  const { data: stock = [], isLoading: isLoadingStock, error: stockError } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

  const isLoading = isLoadingStock || isLoadingProducts;

  if (stockError) {
    console.error('Stock Error:', stockError);
  }

  const filteredAndSortedStock = useMemo(() => {
    if (isLoading || !stock || !products) return [];

    let filtered = stock;

    // Busca (Smart Filter)
    if (selectedProductId) {
      filtered = filtered.filter(item => item.productId === selectedProductId);
    }

    // Filtro de filial
    if (filterFilial !== 'all') {
      filtered = filtered.filter(item => item?.filialId === filterFilial);
    }

    // Filtro de validade
    if (filterExpiration === 'expiring') {
      filtered = filtered.filter(item => isExpiringSoon(item.expirationDate));
    } else if (filterExpiration === 'expired') {
      filtered = filtered.filter(item => isExpired(item.expirationDate));
    }

    // Ordenação
    const sorted = [...filtered].sort((a, b) => {
      const productA = products.find(p => p.id === a.productId);
      const productB = products.find(p => p.id === b.productId);

      switch (sortBy) {
        case 'name':
          return (productA?.name || '').localeCompare(productB?.name || '');
        case 'expiration':
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        case 'quantity':
          return b.quantity - a.quantity;
        case 'value':
          return (b.quantity * b.unitPrice) - (a.quantity * a.unitPrice);
        default:
          return 0;
      }
    });

    return sorted;
  }, [stock, products, selectedProductId, filterFilial, filterExpiration, sortBy]);

  const getProduct = (productId: string) => products.find(p => p.id === productId);
  const getFilial = (filialId: string) => filiais.find(f => f.id === filialId);

  const expirationStatus = (expirationDate: string) => {
    if (isExpired(expirationDate)) {
      return { label: 'Vencido', variant: 'destructive' as const };
    }
    if (isExpiringSoon(expirationDate)) {
      return { label: 'Próximo ao vencimento', variant: 'outline' as const, className: 'border-warning text-warning' };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Estoque</h2>
        <p className="text-muted-foreground mt-1">Visualize e gerencie todo o estoque das filiais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>Encontre produtos por nome, princípio ativo ou lote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <ProductCombobox
                products={products}
                value={selectedProductId}
                onChange={setSelectedProductId}
              />
            </div>

            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todas as filiais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {filiais.map(filial => (
                  <SelectItem key={filial.id} value={filial.id}>
                    {filial.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterExpiration} onValueChange={setFilterExpiration}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Validade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as validades</SelectItem>
                <SelectItem value="expiring">Próximo ao vencimento</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome A-Z</SelectItem>
                <SelectItem value="expiration">Data de validade</SelectItem>
                <SelectItem value="quantity">Quantidade</SelectItem>
                <SelectItem value="value">Valor total</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>{filteredAndSortedStock.length} {filteredAndSortedStock.length === 1 ? 'item encontrado' : 'itens encontrados'}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredAndSortedStock.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum item encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedStock.map(item => {
            const product = getProduct(item.productId);
            const filial = getFilial(item.filialId);
            const expStatus = expirationStatus(item.expirationDate);

            return (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-lg">{product?.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {product?.activeIngredient} • {product?.manufacturer}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <Badge variant="secondary">{filial?.name}</Badge>
                          <Badge variant="outline">Lote: {item.lote}</Badge>
                          {expStatus && (
                            <Badge variant={expStatus.variant} className={expStatus.className}>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {expStatus.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                      <div className="text-center md:text-right">
                        <p className="text-sm text-muted-foreground mb-1">Quantidade</p>
                        <p className="text-2xl font-bold text-foreground">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">unidades</p>
                      </div>

                      <div className="text-center md:text-right">
                        <p className="text-sm text-muted-foreground mb-1">Validade</p>
                        <div className="flex items-center gap-1 justify-center md:justify-end">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">{formatDate(item.expirationDate)}</p>
                        </div>
                      </div>

                      <div className="text-center md:text-right">
                        <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)}/un
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
