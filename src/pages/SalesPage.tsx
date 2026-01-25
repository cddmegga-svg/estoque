import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, ShoppingCart, Trash2, Plus, Minus, DollarSign, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fetchProducts, createSale, fetchFiliais } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types';

interface CartItem {
    product: Product;
    quantity: number;
}

export const SalesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [discountValue, setDiscountValue] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Queries
    // Queries & Local DB
    // const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts }); <-- Replaced by Dexie

    // Live Query for Offline/Local Search
    const filteredProducts = useLiveQuery(async () => {
        if (!searchTerm) {
            // Return empty or top 10 if you want detailed list on empty
            return await db.products.limit(10).toArray();
        }

        const lowerTerm = searchTerm.toLowerCase();

        // Search by Name or EAN
        // Dexie efficiency: specific index search or simple filter if small DB
        // For < 1000 items, filter is fine. For > 1000, multi-entry index recommended.
        return await db.products
            .filter(p =>
                p.name.toLowerCase().includes(lowerTerm) ||
                (p.ean && p.ean.includes(lowerTerm)) ||
                (p.activeIngredient && p.activeIngredient.toLowerCase().includes(lowerTerm))
            )
            .limit(20)
            .toArray();
    }, [searchTerm]);

    const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });

    const currentFilialName = useMemo(() => {
        return filiais.find(f => f.id === user?.filialId)?.name || 'Filial Desconhecida';
    }, [filiais, user?.filialId]);

    const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const total = Math.max(0, subtotal - discountValue);

    // Handlers
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
        setSearchTerm(''); // Clear search after adding
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const calculateMaxAllowedDiscount = (): { max: number; details: string[] } => {
        let totalMax = 0;
        const details: string[] = [];

        for (const item of cart) {
            const cat = item.product.category?.toLowerCase() || '';
            let pct = 0;
            const sub = item.product.salePrice * item.quantity;

            // Rules
            if (cat.includes('genérico') || cat.includes('generico')) {
                pct = 0.20; // 20%
            } else if (cat.includes('similar')) {
                pct = 0.15; // 15%
            } else if (cat.includes('ético') || cat.includes('etico') || cat.includes('referência')) {
                pct = 0.15; // 15%
            } else if (cat.includes('perfumaria') || cat.includes('alimentação') || cat.includes('higiene')) {
                pct = 0; // 0% - Manager only
            } else {
                // Default fallback for undefined categories (e.g. 5% safe bet or 0?)
                pct = 0.05;
            }

            const itemMax = sub * pct;
            totalMax += itemMax;
            // details.push(`${item.product.name.slice(0,10)}...: ${pct*100}%`);
        }
        return { max: totalMax, details };
    };

    const finalizeSale = async () => {
        if (cart.length === 0) return;

        // Validation: Check Discount Limit
        const role = user?.role || 'viewer';
        const isManager = ['admin', 'manager'].includes(role);

        if (!isManager && discountValue > 0) {
            const { max } = calculateMaxAllowedDiscount();

            // Allow a small margin of error for rounding? No, strict.
            if (discountValue > max) {
                toast({
                    variant: 'destructive',
                    title: 'Desconto não autorizado',
                    description: `Limite calculado para estes produtos: ${formatCurrency(max)}. Itens como Perfumaria/Alimentação não permitem desconto.`
                });
                return;
            }
        }

        try {
            setIsFinalizing(true);

            if (navigator.onLine) {
                // Online: Send to API
                await createSale(
                    subtotal,
                    discountValue,
                    total,
                    cart,
                    customerName,
                    user?.id,
                    user?.name,
                    user?.filialId
                );
                toast({ title: 'Venda Realizada!', description: `Total: ${formatCurrency(total)}` });
            } else {
                // Offline: Save to Dexie
                await db.offlineSales.add({
                    tempId: crypto.randomUUID(),
                    customerName,
                    totalValue: subtotal,
                    discountValue,
                    finalValue: total,
                    items: cart, // Store the whole cart structure
                    createdAt: new Date().toISOString(),
                    synced: 0
                });
                toast({ title: 'Venda Salva (Offline)!', description: 'Será sincronizada quando a conexão voltar.', variant: 'destructive' });
            }

            // Reset UI
            setCart([]);
            setCustomerName('');
            setDiscountValue(0);

            // Invalidate queries if online, otherwise just reset
            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['movements'] });
            } else {
                // Optionally update local stock count if we were tracking it locally
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao finalizar venda.' });
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-6rem)]">
            {/* LEFT COLUMN: Product Catalog / Search */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle>Catálogo de Produtos</CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, EAN ou princípio ativo... (F2)"
                                className="pl-9 h-12 text-lg"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts?.map(product => (
                                <div
                                    key={product.id}
                                    className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors flex flex-col justify-between"
                                    onClick={() => addToCart(product)}
                                >
                                    <div>
                                        <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{product.manufacturer}</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="font-bold text-lg text-emerald-600">
                                            {formatCurrency(product.salePrice)}
                                        </span>
                                        <Button size="sm" variant="secondary"><Plus className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            ))}
                            {searchTerm && filteredProducts.length === 0 && (
                                <div className="col-span-full text-center py-8 text-muted-foreground">
                                    Nenhum produto encontrado.
                                </div>
                            )}
                            {!searchTerm && (
                                <div className="col-span-full text-center py-8 text-muted-foreground">
                                    Comece digitando para buscar produtos...
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN: Cart / Point of Sale */}
            <div className="flex flex-col gap-4">
                <Card className="flex-1 flex flex-col border-emerald-100 shadow-md">
                    <CardHeader className="bg-emerald-50/50 pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" /> Cesta de Compras
                            </CardTitle>
                            <span className="text-xs font-mono text-muted-foreground">{currentFilialName}</span>
                        </div>
                        <div className="mt-4">
                            <Label className="text-xs text-muted-foreground">Cliente (Opcional)</Label>
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                                <Input
                                    className="h-8 bg-background"
                                    placeholder="Consumidor Final"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 space-y-4">
                                <ShoppingCart className="w-12 h-12 opacity-20" />
                                <p className="text-center">Cesta vazia.<br />Bipe ou pesquise produtos.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-center">Qtd</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[30px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <TableRow key={item.product.id}>
                                            <TableCell className="py-2">
                                                <div className="font-medium text-sm line-clamp-1">{item.product.name}</div>
                                                <div className="text-xs text-muted-foreground">{formatCurrency(item.product.salePrice)} Un.</div>
                                            </TableCell>
                                            <TableCell className="text-center py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="w-4 text-center text-sm">{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}>
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium py-2">
                                                {formatCurrency(item.product.salePrice * item.quantity)}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>

                    {/* TOTALS SECTION */}
                    <div className="p-4 bg-slate-50 border-t space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Desconto:</span>
                            <div className="flex items-center gap-2 w-32">
                                <DollarSign className="w-3 h-3 text-muted-foreground" />
                                <Input
                                    type="number"
                                    className="h-7 text-right"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between text-2xl font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span className="text-emerald-600">{formatCurrency(total)}</span>
                        </div>

                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg mt-2"
                            disabled={cart.length === 0 || isFinalizing}
                            onClick={finalizeSale}
                        >
                            {isFinalizing ? 'Finalizando...' : 'Finalizar Pré-Venda (F10)'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
