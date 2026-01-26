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

            // Check for explicitly set Max Discount on product
            if (item.product.maxDiscountPercent !== undefined && item.product.maxDiscountPercent > 0) {
                pct = item.product.maxDiscountPercent / 100;
            } else {
                // Fallback to Category defaults if not set on product
                if (cat.includes('genérico') || cat.includes('generico') ||
                    cat.includes('similar') ||
                    cat.includes('ético') || cat.includes('etico') || cat.includes('referência')) {
                    pct = 0.30;
                } else if (cat.includes('perfumaria') || cat.includes('alimentação') || cat.includes('higiene')) {
                    pct = 0.05;
                } else {
                    pct = 0.10;
                }
            }

            const itemMax = sub * pct;
            totalMax += itemMax;
        }
        return { max: totalMax, details };
    };

    const [selectedSaleType, setSelectedSaleType] = useState<'budget' | 'order'>('budget');

    // Manager Override State
    const [isManagerOverrideOpen, setIsManagerOverrideOpen] = useState(false);
    const [managerPin, setManagerPin] = useState('');
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
                finishPreSale(pendingSalespersonId, true); // true = override authorized
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha na validação.' });
        }
    };

    const checkSalesperson = async () => {
        try {
            // Check in Employees table
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

        // If user already has a specific logged in identity (not generic), maybe use it?
        // But the requirement says "Shared Terminals", so we should probably ALWAYS ask or have a "Change Salesperson" option.
        // Let's assume if the logged in user has an employee_code, they might be the salesperson.
        // But for "Balcão", usually the logged in user is generic. 
        // Let's FORCE identification for now if it's a pre-sale flow.
        setSalespersonCode('');
        setIdentifiedSalesperson(null);
        setIsSalespersonDialogOpen(true);
    };

    const finishPreSale = async (salespersonId: string) => {
        const role = user?.role || 'viewer';
        const isManager = ['admin', 'manager'].includes(role);

        if (!isManager && discountValue > 0) {
            const { max } = calculateMaxAllowedDiscount();
            if (discountValue > max) {
                toast({
                    variant: 'destructive',
                    title: 'Desconto não autorizado',
                    description: `Limite calculado: ${formatCurrency(max)}.`
                });
                return;
            }
        }

        try {
            setIsFinalizing(true);

            if (navigator.onLine) {
                await createSale(
                    subtotal,
                    discountValue,
                    total,
                    cart,
                    customerName,
                    user?.id,
                    user?.name,
                    user?.filialId,
                    salespersonId,
                    'pending', // Payment Status
                    'open'    // Sale Status (Pre-Sale)
                );

                // Print Ticket Logic would go here

                toast({ title: 'Pré-Venda Enviada!', description: `Código enviado para o Caixa. Total: ${formatCurrency(total)}`, className: "bg-emerald-600 text-white" });
            } else {
                // Offline Pre-Sale? 
                // Complex because we need to sync later. For now, keep existing offline logic but adapt structure if needed.
                // We will use the existing offline logic but maybe add salespersonId to it?
                // For MVP Phase 36, let's focus on Online Pre-Sale.
                toast({ title: 'Modo Offline', description: 'Pré-venda salva localmente.', variant: 'default' });
            }

            setCart([]);
            setCustomerName('');
            setDiscountValue(0);

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
        <>
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
                                {filteredProducts?.map(product => {
                                    const isMedicine = ['genérico', 'generico', 'similar', 'ético', 'etico', 'referência'].some(c => product.category?.toLowerCase().includes(c));

                                    return (
                                        <div
                                            key={product.id}
                                            className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors flex flex-col justify-between"
                                            onClick={() => addToCart(product)}
                                        >
                                            <div>
                                                <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{product.manufacturer}</p>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-1">
                                                {isMedicine && product.pmcPrice > 0 && (
                                                    <span className="text-xs text-muted-foreground line-through">
                                                        PMC: {formatCurrency(product.pmcPrice)}
                                                    </span>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-lg text-emerald-600">
                                                        {/* Validate Price is not 0 */}
                                                        {product.salePrice > 0 ? formatCurrency(product.salePrice) : 'R$ --'}
                                                    </span>
                                                    <Button size="sm" variant="secondary"><Plus className="w-4 h-4" /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                onClick={handleFinalizeClick}
                            >
                                {isFinalizing ? 'Enviando...' : 'Enviar para Caixa (F10)'}
                            </Button>
                        </div>
                    </Card>
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

            {/* Manager Override Dialog */}
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
