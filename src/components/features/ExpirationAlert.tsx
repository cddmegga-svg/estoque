import { AlertTriangle, ChevronRight, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockItem, Product, Filial } from '@/types';
import { formatDate, isExpiringSoon } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ExpirationAlertProps {
  expiringItems: StockItem[];
  products: Product[];
  filiais: Filial[];
  onViewDetails: () => void;
}

export const ExpirationAlert = ({ expiringItems, products, filiais, onViewDetails }: ExpirationAlertProps) => {
  if (expiringItems.length === 0) {
    return null;
  }

  const getProduct = (productId: string) => products.find(p => p.id === productId);
  const getFilial = (filialId: string) => filiais.find(f => f.id === filialId);

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Produtos Próximos ao Vencimento</CardTitle>
              <CardDescription>
                {expiringItems.length} {expiringItems.length === 1 ? 'item vencerá' : 'itens vencerão'} nos próximos 6 meses
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onViewDetails} className="gap-2">
            Ver Todos
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {expiringItems.slice(0, 3).map(item => {
            const product = getProduct(item.productId);
            const filial = getFilial(item.filialId);
            const today = new Date();
            const expDate = new Date(item.expirationDate);
            const monthsUntilExpiry = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {product?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lote: {item.lote} • {filial?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-medium text-foreground">
                      {formatDate(item.expirationDate)}
                    </p>
                    <Badge variant="outline" className="text-xs border-warning text-warning">
                      {monthsUntilExpiry} {monthsUntilExpiry === 1 ? 'mês' : 'meses'}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-foreground w-16 text-right">
                    {item.quantity} un
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {expiringItems.length > 3 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            E mais {expiringItems.length - 3} {expiringItems.length - 3 === 1 ? 'item' : 'itens'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
