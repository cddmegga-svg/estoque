import { useState } from 'react';
import { ArrowLeftRight, Plus, History, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchStock, fetchProducts, fetchFiliais, fetchTransfers, createTransfer } from '@/services/api';
import { User, StockItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductCombobox } from '@/components/ProductCombobox';

interface TransfersPageProps {
  user: User;
}

export const TransfersPage = ({ user }: TransfersPageProps) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [toFilial, setToFilial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });
  const { data: transfers = [] } = useQuery({ queryKey: ['transfers'], queryFn: fetchTransfers });

  // Mutation
  const transferMutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] }); // If we fetched movements

      toast({
        title: 'Transferência realizada!',
        description: 'Transferência concluída com sucesso',
      });

      // Clear form
      setSelectedProduct('');
      setSelectedStockItem(null);
      setToFilial('');
      setQuantity('');
      setNotes('');
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na transferência',
        description: error.message || 'Ocorreu um erro ao processar a transferência',
      });
    }
  });

  // Apenas administradores podem fazer transferências
  const canTransfer = user.role === 'admin';

  // Products logic with safety checks
  const safeStock = Array.isArray(stock) ? stock : [];
  const safeProducts = Array.isArray(products) ? products : [];

  // Estoque da filial do usuário
  const userStock = safeStock.filter(item => item?.filialId === user?.filialId);

  // Produtos únicos no estoque do usuário
  const availableProducts = safeProducts.filter(product =>
    product && userStock.some(item => item?.productId === product.id)
  );

  // Itens de estoque do produto selecionado
  const stockItemsForProduct = selectedProduct
    ? userStock.filter(item => item?.productId === selectedProduct)
    : [];

  // Filiais disponíveis para transferência (exceto a atual)
  const targetFiliais = filiais.filter(f => f.id !== user.filialId);

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setSelectedStockItem(null);
    setQuantity('');
  };

  const handleStockItemSelect = (stockItemId: string) => {
    const item = stockItemsForProduct.find(s => s.id === stockItemId);
    setSelectedStockItem(item || null);
    setQuantity('');
  };

  const handleTransfer = () => {
    if (!selectedStockItem || !toFilial || !quantity) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      });
      return;
    }

    const transferQty = parseInt(quantity);

    if (transferQty <= 0 || transferQty > selectedStockItem.quantity) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Quantidade inválida',
      });
      return;
    }

    // Call mutation
    transferMutation.mutate({
      productId: selectedStockItem.productId,
      fromFilialId: user.filialId,
      toFilialId: toFilial,
      lote: selectedStockItem.lote,
      quantity: transferQty,
      userId: user.id,
      userName: user.name, // Note: user.name comes from AuthContext user object
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Transferências</h2>
        <p className="text-muted-foreground mt-1">
          {canTransfer ? 'Realize transferências entre filiais e consulte o histórico' : 'Consulte o histórico de transferências'}
        </p>
      </div>

      <Tabs defaultValue={canTransfer ? 'new' : 'history'} className="space-y-6">
        <TabsList>
          {canTransfer && (
            <TabsTrigger value="new" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Transferência
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {canTransfer && (
          <TabsContent value="new" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nova Transferência</CardTitle>
                <CardDescription>Transfira produtos entre as filiais da rede</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <ProductCombobox
                    products={availableProducts}
                    value={selectedProduct}
                    onChange={handleProductSelect}
                  />
                </div>

                {stockItemsForProduct.length > 0 && (
                  <div className="space-y-2">
                    <Label>Lote</Label>
                    <Select
                      value={selectedStockItem?.id || ''}
                      onValueChange={handleStockItemSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {stockItemsForProduct.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.lote} - {item.quantity} un disponíveis - Val: {formatDate(item.expirationDate)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Filial de Destino</Label>
                  <Select value={toFilial} onValueChange={setToFilial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFiliais.map(filial => (
                        <SelectItem key={filial.id} value={filial.id}>
                          {filial.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantidade
                    {selectedStockItem && (
                      <span className="text-muted-foreground ml-2">
                        (máx: {selectedStockItem.quantity})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedStockItem?.quantity || 0}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Digite a quantidade"
                    disabled={!selectedStockItem}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Motivo da transferência, observações..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={!selectedStockItem || !toFilial || !quantity || transferMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  {transferMutation.isPending ? 'Processando...' : 'Realizar Transferência'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-4">
          {transfers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma transferência registrada</p>
              </CardContent>
            </Card>
          ) : (
            transfers.map(transfer => {
              const product = products.find(p => p.id === transfer.productId);
              const fromFilial = filiais.find(f => f.id === transfer.fromFilialId);
              const toFilial = filiais.find(f => f.id === transfer.toFilialId);

              return (
                <Card key={transfer.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">{product?.name || 'Produto desconhecido'}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Lote: {transfer.lote} • {transfer.quantity} unidades
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="secondary">{fromFilial?.name || 'Filial Origem'}</Badge>
                            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="secondary">{toFilial?.name || 'Filial Destino'}</Badge>
                          </div>
                          {transfer.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {transfer.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Transferido por</p>
                        <p className="font-medium text-foreground">{transfer.userName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(transfer.transferDate.split('T')[0])}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
