import { useState, useRef, useMemo } from 'react';
import { ArrowLeftRight, Plus, History, Package, Trash2, Printer, ChevronRight, Camera } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchStock, fetchProducts, fetchFiliais, fetchTransfers, createTransfer } from '@/services/api';
import { User, StockItem, Transfer } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductCombobox } from '@/components/ProductCombobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TransfersPageProps {
  user: User;
}

interface TransferItem {
  id: string; // Stock Item ID
  productId: string;
  productName: string;
  lote: string;
  quantity: number;
  maxQuantity: number;
}

interface TransferBatch {
  id: string; // Compound ID
  date: string;
  fromFilialId: string;
  toFilialId: string;
  userName: string;
  notes?: string; // Added notes
  items: Transfer[];
  totalItems: number;
}
// ...
// Inside groupedTransfers
userName: t.userName,
  notes: t.notes, // Capture notes
    items: [],
      totalItems: 0
        // ...
        // Inside Dialog Details
        < div className = "grid grid-cols-2 gap-4 text-sm" >
                    <div><span className="font-bold">De:</span> {getFilialName(selectedBatch.fromFilialId)}</div>
                    <div><span className="font-bold">Para:</span> {getFilialName(selectedBatch.toFilialId)}</div>
                    <div><span className="font-bold">Responsável:</span> {selectedBatch.userName}</div>
                    <div className="col-span-2"><span className="font-bold">Obs:</span> {selectedBatch.notes || '-'}</div>
                  </div >
  // ...
  // Inside Print Template
  <div className="mb-6 grid grid-cols-2 gap-4">
    <div><p className="font-bold text-xs uppercase text-gray-500">Origem</p><p>{getFilialName(selectedBatch.fromFilialId)}</p></div>
    <div><p className="font-bold text-xs uppercase text-gray-500">Destino</p><p>{getFilialName(selectedBatch.toFilialId)}</p></div>
    <div className="col-span-2"><p className="font-bold text-xs uppercase text-gray-500">Observações</p><p>{selectedBatch.notes || '-'}</p></div>
  </div>

export const TransfersPage = ({ user }: TransfersPageProps) => {
  // Current Selection State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [toFilial, setToFilial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // Cart / List State
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  // History Details State
  const [selectedBatch, setSelectedBatch] = useState<TransferBatch | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Print Logic
  const printRef = useRef<HTMLDivElement>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    // @ts-ignore
    contentRef: printRef,
    // @ts-ignore
    content: () => printRef.current,
    documentTitle: `Transferencia_${new Date().toISOString()}`
  });

  const handleHistoryPrint = useReactToPrint({
    // @ts-ignore
    contentRef: historyPrintRef,
    // @ts-ignore
    content: () => historyPrintRef.current,
    documentTitle: `Guia_Historico_${selectedBatch?.date}`
  });

  // Queries
  const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });
  const { data: transfers = [] } = useQuery({ queryKey: ['transfers'], queryFn: fetchTransfers });

  // Helpers
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Produto desconhecido';
  const getFilialName = (id: string) => filiais.find(f => f.id === id)?.name || 'Filial';

  // Group Transfers Logic
  const groupedTransfers = useMemo(() => {
    const groups: { [key: string]: TransferBatch } = {};

    transfers.forEach(t => {
      // Create a key based on minute/hour to group "batches"
      // Assuming ISO string, we take substring(0, 16) for YYYY-MM-DDTHH:mm
      const dateKey = t.transferDate ? t.transferDate.substring(0, 16) : 'unknown';
      const key = `${dateKey}_${t.fromFilialId}_${t.toFilialId}_${t.userId}`;

      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: t.transferDate,
          fromFilialId: t.fromFilialId,
          toFilialId: t.toFilialId,
          userName: t.userName,
          items: [],
          totalItems: 0
        };
      }
      groups[key].items.push(t);
      groups[key].totalItems += 1;
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transfers]);


  // ... (Filter logic matches original)
  const canTransfer = user.role === 'admin';
  const userStock = Array.isArray(stock) ? stock.filter(item => item?.filialId === user?.filialId) : [];
  const availableProducts = Array.isArray(products) ? products.filter(product =>
    product && userStock.some(item => item?.productId === product.id)
  ) : [];
  const stockItemsForProduct = selectedProduct
    ? userStock.filter(item => item?.productId === selectedProduct)
    : [];
  const targetFiliais = filiais.filter(f => f.id !== user.filialId);

  // Handlers
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

  const handleAddItem = () => {
    if (!selectedStockItem || !quantity) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Preencha produto e quantidade' });
      return;
    }

    const qtd = parseInt(quantity);
    if (qtd <= 0 || qtd > selectedStockItem.quantity) {
      toast({ variant: 'destructive', title: 'Qtd Inválida', description: 'Verifique a quantidade disponível' });
      return;
    }

    const newItem: TransferItem = {
      id: selectedStockItem.id,
      productId: selectedStockItem.productId,
      productName: getProductName(selectedStockItem.productId),
      lote: selectedStockItem.lote,
      quantity: qtd,
      maxQuantity: selectedStockItem.quantity
    };

    setTransferItems([...transferItems, newItem]);

    // Reset inputs but keep filial select
    setSelectedProduct('');
    setSelectedStockItem(null);
    setQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...transferItems];
    newItems.splice(index, 1);
    setTransferItems(newItems);
  };

  const handleScan = (code: string) => {
    const product = products.find(p => p.ean === code);
    if (product) {
      setSelectedProduct(product.id);
      toast({ title: 'Produto encontrado', description: `${product.name} selecionado.` });
    } else {
      toast({ variant: 'destructive', title: 'Não encontrado', description: `Nenhum produto com EAN ${code}` });
    }
  };

  const handleFinalizeTransfer = async () => {
    if (!toFilial || transferItems.length === 0) return;

    try {
      // Serial execution for now
      for (const item of transferItems) {
        await createTransfer({
          productId: item.productId,
          fromFilialId: user.filialId,
          toFilialId: toFilial,
          lote: item.lote,
          quantity: item.quantity,
          userId: user.id,
          userName: user.name,
          notes: notes,
        });
      }

      // Success
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });

      toast({
        title: 'Sucesso!',
        description: `${transferItems.length} itens transferidos.`,
      });

      setTransferItems([]);
      setNotes('');
      // Optional: Auto print receipt here if requested

    } catch (error) {
      // Mutation onError handles this usually, but since we await directly:
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao processar itens.' });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Transferências</h2>

      <Tabs defaultValue={canTransfer ? 'new' : 'history'}>
        <TabsList>
          <TabsTrigger value="new"><Plus className="w-4 h-4 mr-2" /> Nova Transferência</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-2" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Input Form */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Filial de Destino</Label>
                    <Select value={toFilial} onValueChange={setToFilial} disabled={transferItems.length > 0}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFiliais.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {transferItems.length > 0 && <p className="text-xs text-muted-foreground">Para mudar, limpe a lista.</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Produto</Label>
                    <ProductCombobox products={availableProducts} value={selectedProduct} onChange={handleProductSelect} />
                  </div>

                  {stockItemsForProduct.length > 0 && (
                    <div className="space-y-2">
                      <Label>Lote</Label>
                      <Select value={selectedStockItem?.id || ''} onValueChange={handleStockItemSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Lote..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stockItemsForProduct.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.lote} - {item.quantity} un - Val: {formatDate(item.expirationDate)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder="0"
                      disabled={!selectedStockItem}
                    />
                  </div>

                  <Button onClick={handleAddItem} className="w-full bg-slate-800 hover:bg-slate-900" disabled={!selectedStockItem || !quantity || !toFilial}>
                    Adicionar à Lista
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN: List & Actions */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Itens para Transferência</CardTitle>
                  <Badge variant="outline">{transferItems.length} itens</Badge>
                </CardHeader>
                <CardContent className="flex-1">
                  {transferItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum item adicionado</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transferItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.lote}</TableCell>
                            <TableCell className="font-bold">{item.quantity}</TableCell>
                            <TableCell onClick={() => handleRemoveItem(idx)} className="cursor-pointer text-red-500 hover:text-red-700 w-10">
                              <Trash2 className="w-4 h-4" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4 border-t pt-6">
                  <Textarea
                    placeholder="Observações da transferência..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <div className="flex w-full gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePrint()}
                      disabled={transferItems.length === 0}
                    >
                      <Printer className="w-4 h-4 mr-2" /> Imprimir Guia
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleFinalizeTransfer}
                      disabled={transferItems.length === 0}
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" /> Concluir Transferência
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Hidden Print Area */}
          <div style={{ display: "none" }}>
            <div ref={printRef} className="p-8 font-sans">
              <div className="text-center mb-8 border-b pb-4">
                <h1 className="text-2xl font-bold uppercase">Grupo Mega Farma</h1>
                <p className="text-sm">Guia de Transferência de Mercadorias</p>
                <p className="text-xs mt-2 text-gray-500">Emitido em: {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold text-xs uppercase text-gray-500">Origem</p>
                  <p>{getFilialName(user.filialId)}</p>
                </div>
                <div>
                  <p className="font-bold text-xs uppercase text-gray-500">Destino</p>
                  <p>{getFilialName(toFilial)}</p>
                </div>
              </div>

              <table className="w-full text-sm border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Produto</th>
                    <th className="border p-2 text-left">Lote</th>
                    <th className="border p-2 text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {transferItems.map((item, i) => (
                    <tr key={i}>
                      <td className="border p-2">{item.productName}</td>
                      <td className="border p-2">{item.lote}</td>
                      <td className="border p-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 pt-4 border-t border-dashed">
                <p className="font-bold mb-1">Observações:</p>
                <p className="italic text-sm">{notes || "Sem observações."}</p>
              </div>

              <div className="mt-12 flex justify-between px-8">
                <div className="text-center border-t pt-2 w-1/3">
                  <p className="text-xs">Assinatura Expedição</p>
                </div>
                <div className="text-center border-t pt-2 w-1/3">
                  <p className="text-xs">Assinatura Recebimento</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transferências (Agrupado)</CardTitle>
            </CardHeader>
            <CardContent>
              {groupedTransfers.length === 0 ? <p className="text-muted-foreground text-center py-8">Vazio</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedTransfers.map(batch => (
                      <TableRow key={batch.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedBatch(batch)}>
                        <TableCell>{formatDateTime(batch.date)}</TableCell>
                        <TableCell>{getFilialName(batch.fromFilialId)}</TableCell>
                        <TableCell>{getFilialName(batch.toFilialId)}</TableCell>
                        <TableCell>{batch.userName}</TableCell>
                        <TableCell><Badge variant="outline">{batch.totalItems} itens</Badge></TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Details Dialog */}
          <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detalhes da Transferência</DialogTitle>
                <DialogDescription>
                  Realizada em {selectedBatch && formatDateTime(selectedBatch.date)}
                </DialogDescription>
              </DialogHeader>

              {selectedBatch && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-bold">De:</span> {getFilialName(selectedBatch.fromFilialId)}</div>
                    <div><span className="font-bold">Para:</span> {getFilialName(selectedBatch.toFilialId)}</div>
                    <div><span className="font-bold">Responsável:</span> {selectedBatch.userName}</div>
                  </div>

                  <div className="border rounded-md max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.items.map(t => (
                          <TableRow key={t.id}>
                            <TableCell>{getProductName(t.productId)}</TableCell>
                            <TableCell>{t.lote}</TableCell>
                            <TableCell className="text-right font-bold">{t.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Hidden Print Wrapper for History */}
                  <div style={{ display: "none" }}>
                    <div ref={historyPrintRef} className="p-8 font-sans">
                      <div className="text-center mb-8 border-b pb-4">
                        <h1 className="text-2xl font-bold uppercase">Grupo Mega Farma</h1>
                        <p className="text-sm">2ª Via - Guia de Transferência</p>
                        <p className="text-xs mt-2 text-gray-500">Data Original: {new Date(selectedBatch.date).toLocaleString()}</p>
                      </div>
                      <div className="mb-6 grid grid-cols-2 gap-4">
                        <div><p className="font-bold text-xs uppercase text-gray-500">Origem</p><p>{getFilialName(selectedBatch.fromFilialId)}</p></div>
                        <div><p className="font-bold text-xs uppercase text-gray-500">Destino</p><p>{getFilialName(selectedBatch.toFilialId)}</p></div>
                      </div>
                      <table className="w-full text-sm border-collapse border">
                        <thead><tr className="bg-gray-100"><th className="border p-2 text-left">Produto</th><th className="border p-2 text-left">Lote</th><th className="border p-2 text-right">Qtd</th></tr></thead>
                        <tbody>
                          {selectedBatch.items.map((item, i) => (
                            <tr key={i}><td className="border p-2">{getProductName(item.productId)}</td><td className="border p-2">{item.lote}</td><td className="border p-2 text-right">{item.quantity}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleHistoryPrint()}>
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir 2ª Via
                    </Button>
                    <Button onClick={() => setSelectedBatch(null)}>Fechar</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

        </TabsContent>
      </Tabs>
    </div>
  );
};
