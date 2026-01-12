import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle, ArrowUpCircle, Barcode, Calendar, Package, Factory, FileText, Info } from 'lucide-react';
import { fetchFiliais, fetchProducts, fetchStock } from '@/services/api';
import { formatDate } from '@/lib/utils';
import { Product, StockItem } from '@/types';
import { ProductCombobox } from '@/components/ProductCombobox';
import { useQuery } from '@tanstack/react-query';

export const MovementsPage = () => {
    const [selectedTab, setSelectedTab] = useState('entry');
    const [selectedFilial, setSelectedFilial] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedLote, setSelectedLote] = useState(''); // For Exit: ID of stockItem, For Entry: String text
    const [quantity, setQuantity] = useState('');
    const [expirationDate, setExpirationDate] = useState(''); // Only active for Entry or Manual Override

    const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });
    const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
    const { data: stock = [] } = useQuery({ queryKey: ['stock'], queryFn: fetchStock });

    // Helper: Find selected product details
    const productDetails = products.find(p => p.id === selectedProduct);

    // Helper: Filter stock for "Exit" mode (only show what exists in selected filial)
    const availableStock = stock.filter(item =>
        item.filialId === selectedFilial &&
        item.productId === selectedProduct &&
        item.quantity > 0
    );

    // Helper: Handle smart Lote selection (Exit Mode)
    const handleLoteSelect = (stockItemId: string) => {
        setSelectedLote(stockItemId);
        const item = availableStock.find(s => s.id === stockItemId);
        if (item) {
            // Auto-fill expiration date from existing batch
            setExpirationDate(item.expirationDate.split('T')[0]);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-foreground">Movimentação Manual</h2>
                <p className="text-muted-foreground mt-1">Registre entradas e saídas de produtos manualmente</p>
            </div>

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
                            <CardTitle>Registro de Movimentação</CardTitle>
                            <CardDescription>Escolha o tipo de movimentação e preencha os dados</CardDescription>
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

                                    <Button className={selectedTab === 'entry' ? "w-full bg-emerald-600 hover:bg-emerald-700" : "w-full bg-red-600 hover:bg-red-700"}>
                                        {selectedTab === 'entry' ? 'Registrar Entrada' : 'Registrar Baixa'}
                                    </Button>
                                </div>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
