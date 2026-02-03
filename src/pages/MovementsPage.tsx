import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle, ArrowUpCircle, Barcode, Calendar, Package, Factory, FileText, Info, History, Printer, ChevronRight, Camera } from 'lucide-react';
import { fetchFiliais, fetchProducts, fetchStock, addMovement, fetchMovements, updateStockItem, addStockItem } from '@/services/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Product, StockItem, Movement } from '@/types';
import { ProductCombobox } from '@/components/ProductCombobox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReactToPrint } from 'react-to-print';

interface MovementBatch {
    id: string; // Compound ID
    date: string;
    filialId: string;
    userName: string;
    type: string; // 'entry' or 'exit'
    notes?: string; // Added notes
    items: Movement[];
    numberOfItems: number;
}

export const MovementsPage = ({ user }: { user: any }) => {
    const [selectedTab, setSelectedTab] = useState('entry');
    const [selectedFilial, setSelectedFilial] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedLote, setSelectedLote] = useState('');
    const [quantity, setQuantity] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [nfeNumber, setNfeNumber] = useState('');
    const [entryDate, setEntryDate] = useState(''); // Default empty? Or today?
    const [notes, setNotes] = useState('');

    // History & Details State
    const [selectedBatch, setSelectedBatch] = useState<MovementBatch | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Print
    const historyPrintRef = useRef<HTMLDivElement>(null);
    const handleHistoryPrint = useReactToPrint({
        // @ts-ignore
        contentRef: historyPrintRef,
        // @ts-ignore
        content: () => historyPrintRef.current,
        documentTitle: `Guia_Movimentacao_${selectedBatch?.date}`
    });


    const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });
    const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
    const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
    const { data: movements = [] } = useQuery({ queryKey: ['movements'], queryFn: fetchMovements });

    // Helper: Find selected product details
    const productDetails = products.find(p => p.id === selectedProduct);

    // Helper: Filter stock for "Exit" mode (only show what exists in selected filial)
    const availableStock = stock.filter(item =>
        item.filialId === selectedFilial &&
        item.productId === selectedProduct &&
        item.quantity > 0
    );

    // Grouping Logic for History
    const groupedMovements = useMemo(() => {
        const groups: { [key: string]: MovementBatch } = {};

        movements.forEach(m => {
            // Group by Minute + User + Filial + Type
            const dateKey = m.date ? m.date.substring(0, 16) : 'unknown';
            const key = `${dateKey}_${m.filialId}_${m.userId}_${m.type}`;

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    date: m.date,
                    filialId: m.filialId,
                    userName: m.userName,
                    type: m.type,
                    notes: m.notes, // Capture notes
                    items: [],
                    numberOfItems: 0
                };
            }
            groups[key].items.push(m);
            groups[key].numberOfItems += 1;
        });

        return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [movements]);

    // Helper: Handle smart Lote selection (Exit Mode)
    const handleLoteSelect = (stockItemId: string) => {
        setSelectedLote(stockItemId);
        const item = availableStock.find(s => s.id === stockItemId);
        if (item) {
            // Auto-fill expiration date from existing batch
            setExpirationDate(item.expirationDate.split('T')[0]);
        }
    };

    // Helper: Names
    const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Produto desconhecido';
    const getFilialName = (id: string) => filiais.find(f => f.id === id)?.name || 'Filial desconhecida';

    const handleScan = (code: string) => {
        const product = products.find(p => p.ean === code);
        if (product) {
            setSelectedProduct(product.id);
            toast({ title: 'Produto encontrado', description: `${product.name} selecionado.` });
        } else {
            toast({ variant: 'destructive', title: 'Não encontrado', description: `Nenhum produto com EAN ${code}` });
        }
    };


    const handleRegister = async () => {
        if (!selectedFilial || !selectedProduct || !selectedLote || !quantity) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios' });
            return;
        }

        const qtd = parseInt(quantity);
        if (isNaN(qtd) || qtd <= 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Quantidade inválida' });
            return;
        }

        try {
            // 1. Update Stock Logic
            if (selectedTab === 'exit') {
                // Exit: selectedLote is the Stock ID
                const stockItem = availableStock.find(s => s.id === selectedLote);
                if (!stockItem) throw new Error("Item de estoque não encontrado");

                if (stockItem.quantity < qtd) {
                    toast({ variant: 'destructive', title: 'Erro', description: 'Quantidade insuficiente em estoque' });
                    return;
                }

                await updateStockItem(stockItem.id, { quantity: stockItem.quantity - qtd });
            } else {
                // Entry: selectedLote is just the string name
                // Check if exists
                const existingItem = stock.find(s =>
                    s.filialId === selectedFilial &&
                    s.productId === selectedProduct &&
                    s.lote === selectedLote
                );

                if (existingItem) {
                    await updateStockItem(existingItem.id, { quantity: existingItem.quantity + qtd });
                } else {
                    // Create new
                    if (!expirationDate) {
                        toast({ variant: 'destructive', title: 'Erro', description: 'Data de validade obrigatória para novos lotes' });
                        return;
                    }
                    // Fetch product price reference? Or just use 0/manual? 
                    // Let's assume we need to add product cost price if available, or 0
                    const product = products.find(p => p.id === selectedProduct);

                    await addStockItem({
                        productId: selectedProduct,
                        filialId: selectedFilial,
                        lote: selectedLote,
                        expirationDate: expirationDate,
                        quantity: qtd,
                        unitPrice: product?.costPrice || 0, // Fallback
                        entryDate: entryDate || new Date().toISOString(), // Use selected date or now
                        nfeNumber: nfeNumber // Pass real NFe Number
                    });
                }
            }

            // 2. Register Movement
            await addMovement({
                productId: selectedProduct,
                filialId: selectedFilial,
                lote: selectedTab === 'exit' ? availableStock.find(s => s.id === selectedLote)?.lote : selectedLote,
                type: selectedTab,
                quantity: qtd,
                date: new Date().toISOString(),
                userId: user?.id || 'manual',
                userName: user?.name || 'Manual User',
                notes: notes
            });

            toast({ title: 'Sucesso', description: 'Movimentação registrada com sucesso.' });

            // Clean
            setQuantity('');
            setNotes('');
            setNfeNumber('');
            setEntryDate('');

            // Optional: Keep selection to allow rapid entry? Maybe clear Lote
            if (selectedTab === 'entry') setSelectedLote('');

            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });

        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Falha ao registrar.' });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Movimentação Manual</h2>
                <p className="text-muted-foreground mt-1">Registre entradas e saídas e visualize o histórico.</p>
            </div>

            <Tabs defaultValue="register" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="register"><Package className="w-4 h-4 mr-2" /> Registro</TabsTrigger>
                    <TabsTrigger value="history"><History className="w-4 h-4 mr-2" /> Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Visual Product Details Card (Only shows when product is selected) */}
                        <div className="lg:col-span-1 order-2 lg:order-1">
                            <Card className="h-full border-l-4 border-l-primary">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Info className="w-5 h-5 text-primary" />
                                        Detalhes do Produto
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {productDetails ? (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Nome Comercial</p>
                                                <p className="font-bold text-lg text-foreground">{productDetails.name}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Barcode className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">EAN / Código de Barras</p>
                                                    <p className="text-sm text-foreground font-mono bg-slate-100 px-2 py-0.5 rounded">{productDetails.ean}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">NCM</p>
                                                    <p className="text-sm text-foreground">{productDetails.ncm}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Factory className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Fabricante</p>
                                                    <p className="text-sm text-foreground">{productDetails.manufacturer}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t">
                                                <p className="text-xs text-muted-foreground mb-1">Princípio Ativo</p>
                                                <p className="text-sm font-medium">{productDetails.activeIngredient}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground opacity-50">
                                            <Package className="w-12 h-12 mx-auto mb-2" />
                                            <p>Selecione um produto para ver os detalhes técnicos</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Form */}
                        <div className="lg:col-span-2 order-1 lg:order-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Nova Movimentação</CardTitle>
                                    <CardDescription>Escolha o tipo de operação</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-6">
                                            <TabsTrigger value="entry" className="gap-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                                                <ArrowDownCircle className="w-4 h-4" /> Entrada (Compra/Ajuste)
                                            </TabsTrigger>
                                            <TabsTrigger value="exit" className="gap-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
                                                <ArrowUpCircle className="w-4 h-4" /> Saída (Venda/Ajuste)
                                            </TabsTrigger>
                                        </TabsList>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Filial</Label>
                                                    <Select value={selectedFilial} onValueChange={setSelectedFilial}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione a filial" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {filiais.map(filial => (
                                                                <SelectItem key={filial.id} value={filial.id}>{filial.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Produto</Label>
                                                    <ProductCombobox
                                                        products={products}
                                                        value={selectedProduct}
                                                        onChange={setSelectedProduct}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Lote</Label>
                                                    {selectedTab === 'exit' ? (
                                                        <Select value={selectedLote} onValueChange={handleLoteSelect} disabled={!selectedProduct || !selectedFilial}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={!selectedProduct ? "Selecione prod e filial" : "Selecione o lote"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableStock.length === 0 ? (
                                                                    <SelectItem value="none" disabled>Sem estoque disponível</SelectItem>
                                                                ) : (
                                                                    availableStock.map(item => (
                                                                        <SelectItem key={item.id} value={item.id}>
                                                                            {item.lote} (Qtd: {item.quantity})
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            placeholder="Digite o N° do lote"
                                                            value={selectedLote}
                                                            onChange={(e) => setSelectedLote(e.target.value)}
                                                        />
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Data de Validade</Label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <Input
                                                            type="date"
                                                            className="pl-9"
                                                            value={expirationDate}
                                                            onChange={(e) => setExpirationDate(e.target.value)}
                                                            disabled={selectedTab === 'exit'} // Auto-filled on exit
                                                        />
                                                    </div>
                                                    {selectedTab === 'exit' && <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente pelo lote</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Quantidade</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Digite a quantidade"
                                                    value={quantity}
                                                    onChange={(e) => setQuantity(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Observação (Opcional)</Label>
                                                <Input
                                                    placeholder="Motivo da movimentação"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                />
                                            </div>

                                            <Button onClick={handleRegister} className={selectedTab === 'entry' ? "w-full bg-primary hover:bg-primary/90" : "w-full bg-red-600 hover:bg-red-700"}>
                                                {selectedTab === 'entry' ? 'Registrar Entrada' : 'Registrar Baixa'}
                                            </Button>
                                        </div>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico e Guias</CardTitle>
                            <CardDescription>Movimentações manuais agrupadas por operação</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {groupedMovements.length === 0 ? <p className="text-muted-foreground text-center py-8">Vazio</p> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Filial</TableHead>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Qtd Itens</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedMovements.map(batch => (
                                            <TableRow key={batch.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedBatch(batch)}>
                                                <TableCell>{formatDateTime(batch.date)}</TableCell>
                                                <TableCell>
                                                    {batch.type === 'entry'
                                                        ? <Badge className="bg-primary hover:bg-primary/90">Entrada</Badge>
                                                        : <Badge className="bg-red-600">Saída</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell>{getFilialName(batch.filialId)}</TableCell>
                                                <TableCell>{batch.userName}</TableCell>
                                                <TableCell><Badge variant="outline">{batch.numberOfItems}</Badge></TableCell>
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
                                <DialogTitle>Detalhes da Movimentação</DialogTitle>
                                <DialogDescription>
                                    Realizada em {selectedBatch && formatDateTime(selectedBatch.date)}
                                </DialogDescription>
                            </DialogHeader>

                            {selectedBatch && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="font-bold">Filial:</span> {getFilialName(selectedBatch.filialId)}</div>
                                        <div><span className="font-bold">Usuário:</span> {selectedBatch.userName}</div>
                                        <div><span className="font-bold">Tipo:</span> {selectedBatch.type === 'entry' ? 'Entrada' : 'Saída'}</div>
                                        <div className="col-span-2"><span className="font-bold">Obs:</span> {selectedBatch.notes || '-'}</div>
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
                                                {selectedBatch.items.map(m => (
                                                    <TableRow key={m.id}>
                                                        <TableCell>{getProductName(m.productId)}</TableCell>
                                                        <TableCell>{m.lote}</TableCell>
                                                        <TableCell className="text-right font-bold">{m.quantity}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Hidden Print Wrapper */}
                                    <div style={{ display: "none" }}>
                                        <div ref={historyPrintRef} className="p-8 font-sans">
                                            <div className="text-center mb-8 border-b pb-4">
                                                <h1 className="text-2xl font-bold uppercase">Grupo Mega Farma</h1>
                                                <p className="text-sm">Comprovante de Movimentação</p>
                                                <p className="text-xs mt-2 text-gray-500">Data: {new Date(selectedBatch.date).toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div className="mb-6 grid grid-cols-2 gap-4">
                                                <div><p className="font-bold text-xs uppercase text-gray-500">Filial</p><p>{getFilialName(selectedBatch.filialId)}</p></div>
                                                <div><p className="font-bold text-xs uppercase text-gray-500">Operação</p><p>{selectedBatch.type === 'entry' ? 'Entrada' : 'Saída'}</p></div>
                                                <div className="col-span-2"><p className="font-bold text-xs uppercase text-gray-500">Observações</p><p>{selectedBatch.notes || '-'}</p></div>
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
                                            Imprimir Comprovante
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
