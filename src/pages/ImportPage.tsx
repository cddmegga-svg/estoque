import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseNFeXML, SAMPLE_NFE_XML } from '@/lib/xmlParser';
import { fetchFiliais, fetchProducts, addProduct, addStockItem, addMovement, addPayable } from '@/services/api';
import { NFe, User, Product, PRODUCT_CATEGORIES, NFeDuplicate, Supplier } from '@/types';
import { formatCurrency, formatDate, generateId, formatCNPJ } from '@/lib/utils';
import { calculateSmartPrice } from '@/lib/pricingUtils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SupplierFormDialog } from '@/components/forms/SupplierFormDialog';
import { fetchSuppliers } from '@/services/api';

interface ImportPageProps {
  user: User;
}

export const ImportPage = ({ user }: ImportPageProps) => {
  const [nfeData, setNfeData] = useState<NFe | null>(null);
  const [selectedFilial, setSelectedFilial] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Supplier & Financial Logic
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState<Partial<Supplier>>({});
  const [extractedBills, setExtractedBills] = useState<(NFeDuplicate & { barcode?: string, include: boolean })[]>([]);

  const [itemsEditedData, setItemsEditedData] = useState<Map<number, any>>(new Map());
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: filiais = [] } = useQuery({ queryKey: ['filiais'], queryFn: fetchFiliais });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setNfeData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlContent = e.target?.result as string;
      const parsedNFe = parseNFeXML(xmlContent);

      if (parsedNFe) {
        setNfeData(parsedNFe);

        // 1. Check Supplier
        const cleanCnpj = parsedNFe.cnpj.replace(/\D/g, '');
        const existingSupplier = suppliers.find(s => s.cnpj?.replace(/\D/g, '') === cleanCnpj);

        if (!existingSupplier) {
          setNewSupplierData({
            name: parsedNFe.supplier,
            cnpj: parsedNFe.cnpj,
            // Tentar extrair endereço se possível no futuro
          });
          // Delay slightly to let UI render, then show prompt or auto-open
          toast({
            title: 'Fornecedor Novo!',
            description: 'Fornecedor não encontrado. Clique em "Cadastrar" para adicionar.',
            action: <Button variant="outline" size="sm" onClick={() => setIsSupplierDialogOpen(true)}>Cadastrar</Button>,
            duration: 10000
          });
        }

        // 2. Extract Bills
        if (parsedNFe.duplicates && parsedNFe.duplicates.length > 0) {
          setExtractedBills(parsedNFe.duplicates.map(d => ({
            ...d,
            barcode: '',
            include: true // Default to include
          })));
        } else {
          setExtractedBills([]);
        }

        toast({
          title: 'XML importado com sucesso!',
          description: `NFe ${parsedNFe.number} - ${parsedNFe.items.length} itens encontrados`,
        });
      } else {
        setError('Falha ao processar o XML. Verifique se o arquivo é uma NFe válida.');
      }
    };

    reader.onerror = () => {
      setError('Erro ao ler o arquivo XML');
    };

    reader.readAsText(file);
  };

  const handleUseSampleXML = () => {
    const parsedNFe = parseNFeXML(SAMPLE_NFE_XML);
    if (parsedNFe) {
      setNfeData(parsedNFe);
      setError('');
      toast({
        title: 'XML de exemplo carregado!',
        description: 'Você pode validar e importar estes dados para teste',
      });
    }
  };

  const updateItemData = (itemIndex: number, field: string, value: string) => {
    const newMap = new Map(itemsEditedData);
    const current = newMap.get(itemIndex) || {};
    newMap.set(itemIndex, { ...current, [field]: value });
    setItemsEditedData(newMap);
  };

  const handleImportNFe = async () => {
    if (!nfeData || !selectedFilial) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione uma filial antes de importar',
      });
      return;
    }

    setIsImporting(true);
    let importedCount = 0;

    // We need to keep track of products created IN THIS SESSION to avoid dupes if products list is stale
    const sessionCreatedProducts = new Map<string, Product>();

    try {
      // Process items sequentially to avoid race conditions or overwhelming the DB
      for (let index = 0; index < nfeData.items.length; index++) {
        const item = nfeData.items[index];
        const editedItem = itemsEditedData.get(index) || {};

        // Merge XML data with manual edits (Manual takes precedence)
        const finalLote = editedItem.lote || item.lote;
        const finalExpiration = editedItem.expirationDate || item.expirationDate;
        const finalName = editedItem.name || item.name;
        const finalManufacturer = editedItem.manufacturer || item.manufacturer;
        const finalCategory = editedItem.category;
        const finalDistributor = editedItem.distributor || nfeData.supplier; // Default to NFe supplier

        if (!finalLote || !finalExpiration) {
          continue; // Pular itens sem lote/validade
        }

        // Verificar se produto já existe (na lista carregada ou criado agora)
        let product = products.find(p => p.ean === item.ean) || sessionCreatedProducts.get(item.ean);

        if (!product) {
          // Criar novo produto
          const newProductID = generateId('prod');
          const newProduct = {
            id: newProductID, // Note: API service will use this ID
            name: finalName,
            activeIngredient: finalName.split(' ')[0],
            manufacturer: finalManufacturer,
            ean: item.ean,
            ncm: item.ncm,
            category: finalCategory,
            distributor: finalDistributor,
            // Extended Data
            costPrice: item.unitPrice,
            profitMargin: editedItem.profitMargin || 30.0,
            price: editedItem.salePrice || calculateSmartPrice(item.unitPrice, 30.0),
            taxCfop: item.cfop,
            taxIcms: item.taxes?.icms,
            taxPis: item.taxes?.pis,
            taxCofins: item.taxes?.cofins,
            taxIpi: item.taxes?.ipi,
            // Manufacturing Date logic for Stock Item comes later, stored in item/editedItem
          };

          await addProduct(newProduct, user.id);

          product = {
            id: newProduct.id,
            name: newProduct.name,
            activeIngredient: newProduct.activeIngredient,
            manufacturer: newProduct.manufacturer,
            ean: newProduct.ean,
            ncm: newProduct.ncm,
            category: newProduct.category,
            distributor: newProduct.distributor
          };

          sessionCreatedProducts.set(item.ean, product);
        } else {
          // If product exists, we might want to update it? 
          // For now, let's assume we don't overwrite existing product data on import unless explicitly asked.
          // But the user MIGHT be correcting data. 
          // Let's stick to "Creating new" logic for now as requested "Register items".
          // If the user wants to update, they usually go to Products page.
          // However, if they just added Category/Distributor here, it won't save if product exists.
          // We can skip update for existing products to stick to safety, or simple update.
          // Given the instructions, let's just use existing product.
        }

        if (!product) continue;

        // Adicionar item ao estoque
        await addStockItem({
          productId: product.id,
          filialId: selectedFilial,
          lote: finalLote,
          expirationDate: finalExpiration,
          manufacturingDate: item.manufacturingDate, // From parsed XML
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          entryDate: new Date().toISOString().split('T')[0],
          nfeNumber: nfeData.number,
        });

        // Registrar movimento
        await addMovement({
          productId: product.id,
          filialId: selectedFilial,
          lote: finalLote,
          type: 'entry',
          quantity: item.quantity,
          date: new Date().toISOString(),
          userId: user.id,
          userName: user.name, // from AuthContext user
          nfeNumber: nfeData.number,
          notes: `Importação NFe ${nfeData.number}`,
        });

        importedCount++;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });

      toast({
        title: 'Importação concluída!',
        description: `${importedCount} ${importedCount === 1 ? 'item adicionado' : 'itens adicionados'} ao estoque`,
      });

      // Limpar formulário
      setItemsEditedData(new Map());

      // ---------------------------------------------------------
      // PROCESS FINANCIALS
      // ---------------------------------------------------------
      const billsToImport = extractedBills.filter(b => b.include);
      if (billsToImport.length > 0) {
        // Find Supplier ID
        const cleanNfeCnpj = nfeData?.cnpj?.replace(/\D/g, '') || '';
        const supplier = suppliers.find(s => s.cnpj?.replace(/\D/g, '') === cleanNfeCnpj);

        let billsCount = 0;
        for (const bill of billsToImport) {
          await addPayable({
            description: `Fatura NFe ${nfeData?.number} (${bill.number})`,
            amount: bill.value,
            dueDate: bill.dueDate,
            status: 'pending',
            filialId: selectedFilial, // Bill goes to the receiving filial
            supplierId: supplier?.id,
            entityName: supplier ? supplier.name : nfeData?.supplier,
            invoiceNumber: nfeData?.number,
            barcode: bill.barcode,
            notes: `Importado via XML`
          }, user.id);
          billsCount++;
        }
        if (billsCount > 0) {
          toast({ title: 'Financeiro Atualizado', description: `${billsCount} contas a pagar criadas.` });
        }
      }

      setExtractedBills([]); // Clear

    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: err.message || 'Ocorreu um erro ao salvar os dados',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Importar XML NFe</h2>
        <p className="text-muted-foreground mt-1">Importe notas fiscais eletrônicas para adicionar produtos ao estoque</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados de Entrada</CardTitle>
          <CardDescription>Selecione a Filial de destino e o arquivo XML</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filial de Destino *</Label>
            <Select value={selectedFilial} onValueChange={setSelectedFilial} disabled={isImporting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a filial..." />
              </SelectTrigger>
              <SelectContent>
                {filiais.map(filial => (
                  <SelectItem key={filial.id} value={filial.id}>
                    {filial.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="xml-file">Arquivo XML (NFe)</Label>
            <div className="flex gap-2">
              <Input
                id="xml-file"
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="flex-1"
                disabled={isImporting || !selectedFilial}
              />
              <Button variant="outline" onClick={handleUseSampleXML} disabled={isImporting || !selectedFilial}>
                Usar Exemplo
              </Button>
            </div>
            {!selectedFilial && <p className="text-xs text-muted-foreground text-orange-600">Selecione uma filial para habilitar o upload.</p>}
          </div>

          {/* Validation Logic */}
          {(() => {
            if (!nfeData) return null; // Safe return
            const selectedFilialObj = filiais.find(f => f.id === selectedFilial);
            const cleanNfeCNPJ = nfeData?.recipientCnpj?.replace(/\D/g, '') || '';
            const cleanFilialCNPJ = selectedFilialObj?.cnpj?.replace(/\D/g, '') || '';

            // Check mismatch only if both are present
            const isMismatch = selectedFilial && cleanNfeCNPJ && cleanFilialCNPJ && cleanNfeCNPJ !== cleanFilialCNPJ;

            return (
              <>
                {isMismatch && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Bloqueio de Segurança:</strong> O CNPJ de destino da NFe ({formatCNPJ(cleanNfeCNPJ)}) não confere com a filial selecionada ({selectedFilialObj?.name}).
                    </AlertDescription>
                  </Alert>
                )}
              </>
            );
          })()}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {nfeData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Informações da NFe</CardTitle>
              <CardDescription>Dados extraídos do arquivo XML</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número da NFe</p>
                  <p className="font-medium text-foreground">{nfeData.number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Emissão</p>
                  <p className="font-medium text-foreground">{formatDate(nfeData.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium text-foreground">{nfeData.supplier}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium text-foreground">{nfeData.cnpj}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FINANCIALS SECTION */}
          {extractedBills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Financeiro / Contas a Pagar</CardTitle>
                <CardDescription>
                  Faturas extraídas do XML. Selecione para lançar automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {extractedBills.map((bill, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-4 items-start md:items-center p-3 border rounded-md bg-slate-50">
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={bill.include}
                          onChange={(e) => {
                            const newBills = [...extractedBills];
                            newBills[idx].include = e.target.checked;
                            setExtractedBills(newBills);
                          }}
                        />
                        <div>
                          <p className="font-semibold text-sm">Fatura {bill.number}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(bill.dueDate)}</p>
                        </div>
                      </div>

                      <div className="font-bold text-emerald-700 min-w-[100px]">
                        {formatCurrency(bill.value)}
                      </div>

                      <div className="flex-1 w-full">
                        <div className="flex gap-2 items-center">
                          <Label htmlFor={`barcode-${idx}`} className="sr-only">Código de Barras</Label>
                          <Input
                            id={`barcode-${idx}`}
                            placeholder="Código de Barras / Linha Digitável (Opcional)"
                            value={bill.barcode}
                            onChange={(e) => {
                              const newBills = [...extractedBills];
                              newBills[idx].barcode = e.target.value;
                              setExtractedBills(newBills);
                            }}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Validação e Conferência Manual</CardTitle>
              <CardDescription>
                Revise os itens importados e preencha lote/validade quando necessário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {nfeData.items.map((item, index) => {
                  const editedItem = itemsEditedData.get(index) || {};
                  const hasLoteAndExpiration = (editedItem.lote || item.lote) && (editedItem.expirationDate || item.expirationDate);

                  return (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <Label htmlFor={`name-${index}`} className="text-xs">Nome do Produto</Label>
                              <Input
                                id={`name-${index}`}
                                defaultValue={item.name}
                                onChange={(e) => updateItemData(index, 'name', e.target.value)}
                                className="font-medium"
                              />
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary">EAN: {item.ean}</Badge>
                                <Badge variant="secondary">NCM: {item.ncm}</Badge>
                                <Badge variant="outline">{item.quantity} unidades</Badge>
                                <Badge variant="outline">{formatCurrency(item.unitPrice)}/un</Badge>
                              </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-md border text-sm">
                              <div>
                                <Label className="text-xs text-muted-foreground">Custo Unit. (R$)</Label>
                                <div className="font-medium">{formatCurrency(item.unitPrice)}</div>
                              </div>
                              <div>
                                <Label htmlFor={`margin-${index}`} className="text-xs">Margem (%)</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    id={`margin-${index}`}
                                    type="number"
                                    className="h-8"
                                    defaultValue={editedItem.profitMargin || 30}
                                    onChange={(e) => {
                                      const margin = parseFloat(e.target.value) || 0;
                                      const newPrice = calculateSmartPrice(item.unitPrice, margin);
                                      updateItemData(index, 'profitMargin', margin.toString());
                                      updateItemData(index, 'salePrice', newPrice.toString());
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`price-${index}`} className="text-xs text-emerald-700 font-bold">Venda Sugerida</Label>
                                <div className="relative">
                                  <div className="absolute left-2 top-1.5 text-xs text-muted-foreground">R$</div>
                                  <Input
                                    id={`price-${index}`}
                                    type="number"
                                    className="h-8 pl-6 font-bold text-emerald-700"
                                    value={editedItem.salePrice || calculateSmartPrice(item.unitPrice, 30)}
                                    onChange={(e) => updateItemData(index, 'salePrice', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="col-span-1 md:col-span-3 text-[10px] text-muted-foreground flex gap-4 mt-1 border-t pt-1 border-slate-200">
                                <span title="Código Fiscal de Operações">CFOP: {item.cfop || '-'}</span>
                                <span>ICMS: {item.taxes?.icms || 0}%</span>
                                <span>PIS: {item.taxes?.pis || 0}%</span>
                                <span>COFINS: {item.taxes?.cofins || 0}%</span>
                                <span>IPI: {item.taxes?.ipi || 0}%</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`manufacturer-${index}`} className="text-xs">Fabricante</Label>
                                <Input
                                  id={`manufacturer-${index}`}
                                  defaultValue={item.manufacturer}
                                  onChange={(e) => updateItemData(index, 'manufacturer', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`distributor-${index}`} className="text-xs">Distribuidor / Fornecedor</Label>
                                <Input
                                  id={`distributor-${index}`}
                                  defaultValue={nfeData.supplier}
                                  placeholder={nfeData.supplier}
                                  onChange={(e) => updateItemData(index, 'distributor', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`category-${index}`} className="text-xs">Categoria</Label>
                                <Select onValueChange={(val) => updateItemData(index, 'category', val)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRODUCT_CATEGORIES.map((cat) => (
                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="border-t pt-2 mt-2">
                              <p className="text-xs font-semibold mb-2">Dados de Lote e Validade</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor={`lote-${index}`} className="text-xs">
                                    Lote {item.lote && '(do XML)'}
                                  </Label>
                                  <Input
                                    id={`lote-${index}`}
                                    placeholder={item.lote || 'Digite o lote'}
                                    defaultValue={item.lote}
                                    onChange={(e) => updateItemData(index, 'lote', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`expiration-${index}`} className="text-xs">
                                    Data de Validade {item.expirationDate && '(do XML)'}
                                  </Label>
                                  <Input
                                    id={`expiration-${index}`}
                                    type="date"
                                    defaultValue={item.expirationDate}
                                    onChange={(e) => updateItemData(index, 'expirationDate', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>

                            {hasLoteAndExpiration && (
                              <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>Pronto para importar</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Button
                onClick={handleImportNFe}
                disabled={(() => {
                  const selectedFilialObj = filiais.find(f => f.id === selectedFilial);
                  const cleanNfeCNPJ = nfeData.recipientCnpj?.replace(/\D/g, '') || '';
                  const cleanFilialCNPJ = selectedFilialObj?.cnpj?.replace(/\D/g, '') || '';
                  const isMismatch = selectedFilial && cleanNfeCNPJ && cleanFilialCNPJ && cleanNfeCNPJ !== cleanFilialCNPJ;
                  return !selectedFilial || isImporting || isMismatch;
                })()}
                className="w-full"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? 'Importando...' : 'Importar para Estoque'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      <SupplierFormDialog
        isOpen={isSupplierDialogOpen}
        onClose={() => setIsSupplierDialogOpen(false)}
        initialData={newSupplierData}
        onSuccess={(newSupplier) => {
          // Refresh suppliers list
          setSuppliers(prev => [...prev, newSupplier]);
          // Also update the Suppliers Query cache if needed, handled by invalidateQueries inside dialog
        }}
      />
    </div>
  );
};
