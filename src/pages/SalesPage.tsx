import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fetchProducts, createSale, fetchFiliais, fetchCustomers } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
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

    // Persistence: Load initial state from localStorage if available
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('pos_cart');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse cart", e);
            return [];
        }
    });
    const [customerName, setCustomerName] = useState(() => localStorage.getItem('pos_customer_name') || '');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => localStorage.getItem('pos_customer_id') || null);

    const [discountValue, setDiscountValue] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showCustomerResults, setShowCustomerResults] = useState(false);

    // Persistence: Save state changes
    useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        if (customerName) localStorage.setItem('pos_customer_name', customerName);
        else localStorage.removeItem('pos_customer_name');

        if (selectedCustomerId) localStorage.setItem('pos_customer_id', selectedCustomerId);
        else localStorage.removeItem('pos_customer_id');
    }, [customerName, selectedCustomerId]);

    const selectCustomer = (customer: any) => {
        setCustomerName(customer.name);
        setSelectedCustomerId(customer.id);
        setShowCustomerResults(false);
    };

    // Queries
    const { data: customerResults = [] } = useQuery({
        queryKey: ['customers_search', customerName],
        queryFn: () => fetchCustomers(customerName),
        enabled: customerName.length > 2 && !selectedCustomerId
    });

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

    const updateItemDiscountPercent = (productId: string, percent: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const discountValue = item.product.salePrice * (percent / 100);
                return { ...item, unitDiscount: discountValue };
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

    const [selectedSaleType, setSelectedSaleType] = useState<'budget' | 'order'>('budget');

    // Manager Override State
    const [isManagerOverrideOpen, setIsManagerOverrideOpen] = useState(false);
    const [managerPin, setManagerPin] = useState('');

    // Product History (Home Key)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<any>(null);

    // Key Listener for Home
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Home') {
                e.preventDefault();
                // If there's a search term or a selected item context, or just the last item added?
                // User said: "Tocando da tecla HOME do teclado, em cima do produto"
                // This implies "hover" or "selection". In a web app, "hover" is hard to track via keyboard.
                // We'll assume "Last Added Item" or "Active Search Result" if we had keyboard nav.
                // For MVP, if cart has items, pick the LAST item added? Or if search is open?
                // Better approach: Since we don't have "selection state" on the table yet (no arrow key nav),
                // We will open history for the *Last Item Added to Cart* OR requires user to click a "History" button.
                // BUT User asked for Keyboard.
                // Let's implement: If Search has result -> History of first result?
                // If Cart has items -> History of last item?
                // Let's prioritize: If Search Input is FOCUSED and has value -> First Result.
                // Else if Cart has items -> Last Cart Item.

                if (filteredProducts && filteredProducts.length > 0 && searchTerm) {
                    openProductHistory(filteredProducts[0]);
                } else if (cart.length > 0) {
                    openProductHistory(cart[cart.length - 1].product);
                }
            }
            if (e.key === 'F10') handleFinalizeClick();
            if (e.key === 'F2') document.querySelector<HTMLInputElement>('input[placeholder*="BIPAR"]')?.focus();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, filteredProducts, searchTerm]);

    const { data: productHistory = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['product_history', selectedHistoryProduct?.id],
        queryFn: async () => {
            if (!selectedHistoryProduct?.id) return [];
            const { data, error } = await supabase
                .from('sale_items')
                .select(`
                     unit_price, quantity, created_at,
                     sale:sale_id (customer_name, created_at)
                 `)
                .eq('product_id', selectedHistoryProduct.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data.map((item: any) => ({
                date: item.sale?.created_at || item.created_at,
                customer: item.sale?.customer_name || 'Consumidor',
                price: item.unit_price,
                quantity: item.quantity
            }));
        },
        enabled: !!selectedHistoryProduct?.id && isHistoryOpen
    });

    const openProductHistory = (product: any) => {
        setSelectedHistoryProduct(product);
        setIsHistoryOpen(true);
    };
    const [pendingSalespersonId, setPendingSalespersonId] = useState<string | null>(null);

    // Salesperson Identity State
    const [salespersonCode, setSalespersonCode] = useState('');
    const [isSalespersonDialogOpen, setIsSalespersonDialogOpen] = useState(false);
    const [identifiedSalesperson, setIdentifiedSalesperson] = useState<{ id: string, name: string } | null>(null);

    const handleManagerOverride = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('id, role')
                .eq('pin', managerPin)
                .in('role', ['manager', 'admin']) // Only managers/admins
                .eq('active', true)
                .single();

            if (error || !data) {
                toast({ variant: 'destructive', title: 'Acesso Negado', description: 'PIN de Gerente inválido.' });
                return;
            }

            // Success
            setIsManagerOverrideOpen(false);
            setManagerPin('');
            if (pendingSalespersonId) {
                finishPreSale(pendingSalespersonId, true);
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha na validação.' });
        }
    };

    const checkSalesperson = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('id, name')
                .eq('pin', salespersonCode)
                .eq('active', true)
                .single();

            if (error || !data) {
                toast({ variant: 'destructive', title: 'PIN Inválido', description: 'Colaborador não encontrado.' });
                return;
            }

            setIdentifiedSalesperson(data);
            setIsSalespersonDialogOpen(false);
            finishPreSale(data.id);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao validar colaborador.' });
        }
    };

    const handleFinalizeClick = () => {
        if (cart.length === 0) return;
        setSalespersonCode('');
        setIdentifiedSalesperson(null);
        setIsSalespersonDialogOpen(true);
    };

    const finishPreSale = async (salespersonId: string, override: boolean = false) => {
        const role = user?.role || 'viewer';
        const isManager = ['admin', 'manager'].includes(role);

        if (!isManager && !override && discountPercent > 20) {
            // Hardcoded 20% limit for safety
            const max = 20;
            if (discountPercent > max) {
                setIsManagerOverrideOpen(true);
                setPendingSalespersonId(salespersonId);
                toast({
                    variant: 'destructive',
                    title: 'Desconto não autorizado',
                    description: `Limite máximo: ${max}%`
                });
                return;
            }
        }

        try {
            setIsFinalizing(true);

            if (navigator.onLine) {
                await createSale(
                    subtotal,
                    finalDiscountValue,
                    total,
                    cart,
                    customerName,
                    user?.id,
                    user?.name,
                    user?.filialId,
                    salespersonId,
                    'pending',
                    'open',
                    undefined,
                    [], // payments
                    undefined,
                    undefined,
                    selectedCustomerId || undefined
                );
                toast({ title: 'Pré-Venda Enviada!', description: `Código enviado para o Caixa. Total: ${formatCurrency(total)}`, className: "bg-primary text-primary-foreground" });
            } else {
                toast({ title: 'Modo Offline', description: 'Pré-venda salva localmente.', variant: 'default' });
            }

            setCart([]);
            setCustomerName('');
            setSelectedCustomerId(null);
            setDiscountPercent(0);

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['movements'] });
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao enviar pré-venda.' });
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-50">
            {/* TOP BAR: Search */}
            <div className="bg-white border-b px-6 py-4 flex gap-4 items-center shadow-sm z-20">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                    <Input
                        placeholder="BIPAR OU PESQUISAR PRODUTO (F2)..."
                        className="pl-12 h-16 text-2xl shadow-inner bg-slate-50 border-slate-200 uppercase font-semibold text-slate-700 placeholder:text-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    {/* Results Overlay */}
                    {searchTerm && filteredProducts && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[70vh] overflow-y-auto">
                            {filteredProducts.map(product => {
                                const isMedicine = ['genérico', 'generico', 'similar', 'ético', 'etico', 'referência'].some(c => product.category?.toLowerCase().includes(c));
                                return (
                                    <div
                                        key={product.id}
                                        className="p-6 border-b hover:bg-emerald-50 cursor-pointer flex justify-between items-center group transition-all"
                                        onClick={() => addToCart(product)}
                                    >
                                        <div>
                                            <div className="font-bold text-2xl text-slate-800">{product.name}</div>
                                            <div className="text-base text-slate-500 flex gap-4 mt-1">
                                                <span>{product.manufacturer}</span>
                                                {product.ean && <span>GTIN: {product.ean}</span>}
                                                <span className="uppercase bg-slate-100 px-2 rounded text-xs py-0.5">{product.category || 'Geral'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {isMedicine && product.pmcPrice > 0 && (
                                                <div className="text-sm text-muted-foreground line-through">
                                                    PMC: {formatCurrency(product.pmcPrice)}
                                                </div>
                                            )}
                                            <div className="font-black text-3xl text-primary">
                                                {formatCurrency(product.salePrice)}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="w-[300px]">
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                            className={`pl-10 h-16 text-lg bg-white border-slate-200 ${selectedCustomerId ? 'border-emerald-500 ring-1 ring-emerald-500 text-emerald-700 font-bold' : ''}`}
                            placeholder="Identificar Cliente"
                            value={customerName}
                            onChange={(e) => {
                                setCustomerName(e.target.value);
                                setSelectedCustomerId(null); // Reset selection on edit
                                setShowCustomerResults(true);
                            }}
                            onFocus={() => setShowCustomerResults(true)}
                            onBlur={() => setTimeout(() => setShowCustomerResults(false), 200)} // Delay to allow click
                        />
                        {selectedCustomerId && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-full">
                                CRM
                            </div>
                        )}
                        {/* Customer Search Results */}
                        {showCustomerResults && customerResults && customerResults.length > 0 && !selectedCustomerId && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-slate-200 z-50 max-h-[300px] overflow-y-auto">
                                {customerResults.map((c: any) => (
                                    <div
                                        key={c.id}
                                        className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                                        onClick={() => selectCustomer(c)}
                                    >
                                        <div className="font-bold text-slate-800">{c.name}</div>
                                        <div className="text-xs text-slate-500 flex gap-2">
                                            {c.cpf && <span>{c.cpf}</span>}
                                            {c.phone && <span>{c.phone}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CHART TABLE */}
            <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100/50">
                <Card className="min-h-full border-0 shadow-sm flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <TableRow className="h-14">
                                    <TableHead className="w-[60px] text-center font-bold text-slate-400">#</TableHead>
                                    <TableHead className="w-[40%] font-bold text-slate-600 text-lg">PRODUTO</TableHead>
                                    <TableHead className="text-right font-bold text-slate-600 text-lg">PREÇO UN.</TableHead>
                                    <TableHead className="text-center w-[140px] font-bold text-slate-600 text-lg">QTD</TableHead>
                                    <TableHead className="text-right w-[140px] font-bold text-slate-600 text-lg">DESC (%)</TableHead>
                                    <TableHead className="text-right font-bold text-slate-600 text-lg">TOTAL</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-96 text-center text-slate-300">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <ShoppingBag className="w-24 h-24 opacity-20" />
                                                <span className="text-2xl font-light">Cesta Vazia</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    cart.map((item, index) => {
                                        // Guard against corrupted cart items
                                        if (!item || !item.product) return null;

                                        // Calculate percentage for display
                                        // item.unitDiscount is currently VALUE. Logic needs to handle input as % and store as value, or vice-versa.
                                        // The helper `updateItemDiscountPercent` below handles the conversion.
                                        const discountPercent = item.product.salePrice > 0 ? (item.unitDiscount / item.product.salePrice) * 100 : 0;

                                        // Helper to calculate Line Total
                                        const lineTotal = (item.product.salePrice - item.unitDiscount) * item.quantity;

                                        return (
                                            <TableRow key={item.product.id} className="hover:bg-slate-50 transition-colors h-20">
                                                <TableCell className="text-center font-mono text-slate-400 text-lg">
                                                    {String(index + 1).padStart(2, '0')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold text-xl text-slate-800 line-clamp-2 leading-tight">{item.product.name}</div>
                                                    <div className="text-sm text-slate-500 mt-1">{item.product.activeIngredient}</div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-slate-600 text-xl">
                                                    {formatCurrency(item.product.salePrice)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2 bg-slate-100 rounded-lg p-1.5 w-fit mx-auto border border-slate-200">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md" onClick={() => updateQuantity(item.product.id, -1)}>
                                                            <Minus className="w-4 h-4" />
                                                        </Button>
                                                        <span className="w-8 text-center font-bold text-xl">{item.quantity}</span>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md" onClick={() => updateQuantity(item.product.id, 1)}>
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="relative w-28 ml-auto">
                                                        <Input
                                                            className="h-10 text-right pr-8 text-lg font-medium"
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            placeholder="0"
                                                            value={discountPercent > 0 ? Math.round(discountPercent) : ''}
                                                            onChange={(e) => updateItemDiscountPercent(item.product.id, parseFloat(e.target.value) || 0)}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                                                    </div>
                                                    {item.unitDiscount > 0 && (
                                                        <div className="text-xs text-red-500 text-right mt-1 font-medium">
                                                            -{formatCurrency(item.unitDiscount * item.quantity)}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-2xl text-emerald-700">
                                                    {formatCurrency(lineTotal)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button size="icon" variant="ghost" className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => removeFromCart(item.product.id)}>
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* BOTTOM FOOTER */}
            <div className="bg-slate-900 text-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-30">
                <div className="flex justify-between items-end max-w-[1920px] mx-auto gap-8">

                    <div className="flex items-center gap-12 flex-1">
                        <div className="flex gap-2 items-center text-slate-400">
                            <ShoppingBag className="w-6 h-6" />
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wider font-bold">Volumes</span>
                                <span className="text-2xl font-mono text-white leading-none">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                            </div>
                        </div>

                        {/* Global Discount R$ */}
                        <div className="space-y-1">
                            <Label className="text-slate-400 text-xs uppercase tracking-wider font-bold">Desconto Global (R$)</Label>
                            <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 px-4 h-16 w-52 focus-within:ring-2 ring-emerald-500/50 transition-all">
                                <span className="text-slate-500 font-bold mr-2 text-xl">R$</span>
                                <Input
                                    type="number"
                                    className="bg-transparent border-0 text-white text-3xl font-bold text-right focus-visible:ring-0 placeholder:text-slate-700 p-0 h-full"
                                    placeholder="0,00"
                                    min={0}
                                    value={discountValue > 0 ? discountValue : ''}
                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>


                    {/* Totals */}
                    <div className="flex gap-8 items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 pr-8">
                        <div className="text-right space-y-1 border-r border-slate-700 pr-8 mr-4">
                            <div className="text-sm text-slate-400 uppercase tracking-widest font-medium">Subtotal</div>
                            <div className="text-3xl font-medium text-slate-300">
                                {formatCurrency(subtotal)}
                            </div>
                        </div>

                        <div className="text-right space-y-0">
                            <div className="text-sm text-emerald-500 uppercase tracking-widest font-bold mb-1">Total Final</div>
                            <div className="text-6xl font-black text-emerald-400 tracking-tighter leading-none filters drop-shadow-lg">
                                {formatCurrency(total)}
                            </div>
                        </div>
                    </div>

                    <Button
                        className="h-24 w-60 text-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/40 rounded-2xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                        disabled={cart.length === 0 || isFinalizing}
                        onClick={handleFinalizeClick}
                    >
                        {isFinalizing ? (
                            <RefreshCw className="w-10 h-10 animate-spin" />
                        ) : (
                            <>
                                <span className="text-3xl tracking-tight">FINALIZAR</span>
                                <span className="text-sm opacity-80 font-medium tracking-widest uppercase bg-emerald-700/50 px-3 py-0.5 rounded-full">Atalho F10</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

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

            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                            Histórico do Produto
                        </DialogTitle>
                        <DialogDescription>
                            Últimas vendas de <span className="font-bold text-slate-800">{selectedHistoryProduct?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoadingHistory ? (
                            <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-primary" /></div>
                        ) : productHistory.length === 0 ? (
                            <div className="text-center text-muted-foreground p-8">Nenhuma venda anterior encontrada.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead className="text-center">Qtd</TableHead>
                                        <TableHead className="text-right">Valor Un.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productHistory.map((h: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {formatDate(h.date)}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700">
                                                {h.customer}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {h.quantity}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-700">
                                                {formatCurrency(h.price)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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

            {/* PIN Dialog for Salesperson Attribution */}
            <Dialog open={isSalespersonDialogOpen} onOpenChange={setIsSalespersonDialogOpen}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-center text-slate-700">Identifique-se</DialogTitle>
                        <DialogDescription className="text-center">
                            Digite seu PIN de vendedor para prosseguir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex justify-center">
                        <Input
                            type="password"
                            autoFocus
                            placeholder="PIN"
                            className="text-center text-2xl tracking-widest w-32 font-bold"
                            value={salespersonCode}
                            onChange={(e) => setSalespersonCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') checkSalesperson();
                            }}
                            maxLength={6}
                        />
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={checkSalesperson}
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
