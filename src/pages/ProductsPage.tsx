import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Search, Barcode, Factory, FileText, Info, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { fetchProducts, addProduct, updateProduct, deleteProduct } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { MoneyInput } from '@/components/ui/money-input';

export const ProductsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        ean: '',
        ncm: '',
        manufacturer: '',
        activeIngredient: '',
        costPrice: 0,
        salePrice: 0,
        imageUrl: ''
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch Products
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: fetchProducts
    });

    // Create Product Mutation
    const createProductMutation = useMutation({
        mutationFn: addProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Produto cadastrado!', description: `${formData.name} salvo com sucesso.` });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => toast({ variant: 'destructive', title: 'Erro', description: error.message })
    });

    // Update Product Mutation
    const updateProductMutation = useMutation({
        mutationFn: (variables: { id: string; data: any }) => updateProduct(variables.id, variables.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Produto atualizado!', description: `${formData.name} foi atualizado.` });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => toast({ variant: 'destructive', title: 'Erro', description: error.message })
    });

    // Delete Product Mutation
    const deleteProductMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: 'Produto removido', description: 'O produto foi excluído com sucesso.' });
        },
        onError: (error: any) => toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message })
    });

    const handleDelete = async (product: any) => {
        if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
            deleteProductMutation.mutate(product.id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            ean: '',
            ncm: '',
            manufacturer: '',
            activeIngredient: '',
            costPrice: 0,
            salePrice: 0,
            imageUrl: ''
        });
        setEditingId(null);
    };

    const handleEdit = (product: any) => {
        setFormData({
            name: product.name,
            ean: product.ean || '',
            ncm: product.ncm || '',
            manufacturer: product.manufacturer || '',
            activeIngredient: product.activeIngredient || '',
            costPrice: product.costPrice || 0,
            salePrice: product.salePrice || 0,
            imageUrl: product.imageUrl || ''
        });
        setEditingId(product.id);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.ean) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha Nome e EAN.' });
            return;
        }

        if (editingId) {
            updateProductMutation.mutate({ id: editingId, data: formData });
        } else {
            createProductMutation.mutate(formData);
        }
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Filter Logic
    const filteredProducts = products.filter(product => {
        const term = searchTerm.toLowerCase();
        return (
            product.name.toLowerCase().includes(term) ||
            (product.ean || '').includes(term) ||
            (product.activeIngredient || '').toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Produtos</h2>
                    <p className="text-muted-foreground mt-1">Gerencie o catálogo de produtos farmacêuticos</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Produto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>Cadastrar Novo Produto</DialogTitle>
                                <DialogDescription>
                                    Preencha os detalhes técnicos do medicamento ou produto.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-1 gap-2">
                                    <Label htmlFor="name">Nome Comercial *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="Ex: Paracetamol 500mg"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="ean">EAN / Código de Barras *</Label>
                                        <div className="relative">
                                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="ean"
                                                className="pl-9"
                                                value={formData.ean}
                                                onChange={(e) => handleInputChange('ean', e.target.value)}
                                                placeholder="789..."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="ncm">NCM</Label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="ncm"
                                                className="pl-9"
                                                value={formData.ncm}
                                                onChange={(e) => handleInputChange('ncm', e.target.value)}
                                                placeholder="3004..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="manufacturer">Fabricante</Label>
                                        <div className="relative">
                                            <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="manufacturer"
                                                className="pl-9"
                                                value={formData.manufacturer}
                                                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                                                placeholder="Ex: EMS, Medley..."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="activeIngredient">Princípio Ativo</Label>
                                        <div className="relative">
                                            <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="activeIngredient"
                                                className="pl-9"
                                                value={formData.activeIngredient}
                                                onChange={(e) => handleInputChange('activeIngredient', e.target.value)}
                                                placeholder="Ex: Amoxicilina..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
                                        <MoneyInput
                                            id="costPrice"
                                            value={formData.costPrice}
                                            onChange={(val) => handleInputChange('costPrice', val)}
                                            placeholder="R$ 0,00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
                                        <MoneyInput
                                            id="salePrice"
                                            value={formData.salePrice}
                                            onChange={(val) => handleInputChange('salePrice', val)}
                                            placeholder="R$ 0,00"
                                            className="font-bold text-emerald-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="imageUrl">URL da Imagem do Produto</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="imageUrl"
                                            value={formData.imageUrl}
                                            onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                                            placeholder="https://exemplo.com/imagem.png"
                                        />
                                        {formData.imageUrl && (
                                            <div className="h-10 w-10 border rounded bg-slate-100 flex-shrink-0 relative overflow-hidden">
                                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[0.8rem] text-muted-foreground">Cole o link de uma imagem da internet.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={createProductMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                                    {createProductMutation.isPending ? 'Salvando...' : 'Salvar Produto'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Catálogo</CardTitle>
                    <CardDescription>
                        {products.length} produtos cadastrados no sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, EAN ou princípio ativo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 max-w-md"
                        />
                    </div>

                    <div className="rounded-md border">
                        <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-medium text-sm text-muted-foreground border-b">
                            <div className="col-span-4">Nome</div>
                            <div className="col-span-2">EAN</div>
                            <div className="col-span-2">Fabricante</div>
                            <div className="col-span-2">Venda</div>
                            <div className="col-span-2">Custo</div>
                        </div>
                        <div className="divide-y">
                            {isLoading ? (
                                <div className="p-8 text-center text-muted-foreground">Carregando produtos...</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">Nenhum produto encontrado.</div>
                            ) : (
                                filteredProducts.map((product) => (
                                    <div key={product.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors text-sm">
                                        <div className="col-span-4 font-medium flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-white border flex items-center justify-center text-emerald-700 overflow-hidden relative">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Package className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">{product.name}</div>
                                                <div className="text-xs text-muted-foreground">{product.activeIngredient}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 font-mono text-xs text-muted-foreground">{product.ean}</div>
                                        <div className="col-span-2 text-muted-foreground">{product.manufacturer}</div>
                                        <div className="col-span-2 font-bold text-emerald-700">
                                            {formatCurrency(product.salePrice || 0)}
                                        </div>
                                        <div className="col-span-2 text-muted-foreground text-xs">
                                            {formatCurrency(product.costPrice || 0)}
                                        </div>
                                        <div className="col-span-12 md:col-span-1 flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                                                Editar
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(product)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
