import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, ShoppingCart, Trash2, Plus, Minus, DollarSign, User as UserIcon, Package, ShoppingBag, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fetchProducts, createSale, fetchFiliais } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { Product } from '@/types';

interface CartItem {
    product: Product;
    quantity: number;
    unitDiscount: number; // Discount per unit in currency
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
        if (!searchTerm) return []; // Clean UI: Start empty

        const lowerTerm = searchTerm.toLowerCase();

        // Search by Name or EAN
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

    const [discountPercent, setDiscountPercent] = useState(0);

    const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const totalItemDiscounts = cart.reduce((acc, item) => acc + (item.unitDiscount * item.quantity), 0);

    // Calculate global discount based on PERCENTAGE
    const valueAfterItemDiscounts = subtotal - totalItemDiscounts;
    const globalDiscountValue = valueAfterItemDiscounts * (discountPercent / 100);

    const total = Math.max(0, valueAfterItemDiscounts - globalDiscountValue);

    // We pass the absolute value to createSale for consistency with DB schema
    const finalDiscountValue = totalItemDiscounts + globalDiscountValue;

    // Handlers
    const addToCart = (product: Product) => {
        const salePrice = (product.pmcPrice && product.pmcPrice > 0) ? product.pmcPrice : product.salePrice;
        const effectiveProduct = {
            ...product,
            salePrice: salePrice
        };

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product: effectiveProduct, quantity: 1, unitDiscount: 0 }];
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
        // Simple logic for now
        totalMax = subtotal * 0.20; // 20% max hardcoded for safety or complex logic
        return { max: totalMax, details };
    };

    // ... (Keep existing Manager Override & Salesperson Identity logic)

    // ... [Inside finishPreSale]
    // Use finalDiscountValue which matches the expected arg in createSale

    // ... [Render]
    {/* TOTALS SECTION */ }
    <div className="p-6 bg-slate-50 border-t space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal (Capa):</span>
            <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-slate-700">Desconto Global (%):</span>
            <div className="flex items-center gap-2 w-32 relative">
                <Input
                    type="number"
                    className="h-8 text-right pr-6"
                    placeholder="0"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                />
                <span className="absolute right-2 text-xs text-muted-foreground">%</span>
            </div>
        </div>

        <div className="border-t pt-4">
            <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground line-through decoration-red-400 decoration-1">
                    De: {formatCurrency(subtotal)}
                </span>
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-slate-500">Por:</span>
                    <span className="text-4xl font-extrabold text-emerald-600 tracking-tight">
                        {formatCurrency(total)}
                    </span>
                </div>
            </div>
        </div>

        <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-xl font-bold mt-2 shadow-emerald-200 shadow-lg"
            disabled={cart.length === 0 || isFinalizing}
            onClick={handleFinalizeClick}
        >
            {isFinalizing ? 'Enviando...' : 'Finalizar (F10)'}
        </Button>
    </div>
                    </Card >
                </div >
            </div >

    <Dialog open={isSalespersonDialogOpen} onOpenChange={setIsSalespersonDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Identificação do Vendedor</DialogTitle>
                <DialogDescription>
                    Digite seu código pessoal (PIN) para vincular a venda.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-4">
                    <Label htmlFor="pin" className="text-right w-20">PIN</Label>
                    <Input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        className="col-span-3 text-center text-2xl tracking-widest"
                        placeholder="____"
                        maxLength={6}
                        value={salespersonCode}
                        onChange={(e) => setSalespersonCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') checkSalesperson();
                        }}
                        autoFocus
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsSalespersonDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={checkSalesperson} disabled={!salespersonCode}>Confirmar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

{/* Manager Override Dialog */ }
<Dialog open={isManagerOverrideOpen} onOpenChange={setIsManagerOverrideOpen}>
    <DialogContent className="sm:max-w-md border-red-200">
        <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
                Autorização de Gerente
            </DialogTitle>
            <DialogDescription>
                Desconto acima do permitido. Solicite a senha do gerente.
            </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-4">
                <Label htmlFor="mgr-pin" className="text-right w-20">PIN</Label>
                <Input
                    id="mgr-pin"
                    type="password"
                    inputMode="numeric"
                    className="col-span-3 text-center text-2xl tracking-widest"
                    placeholder="____"
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleManagerOverride();
                    }}
                    autoFocus
                />
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsManagerOverrideOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleManagerOverride}>Autorizar</Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
                </>
            );
        };
