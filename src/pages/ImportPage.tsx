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
import { fetchFiliais, fetchProducts, addProduct, addStockItem, addMovement } from '@/services/api';
import { NFe, User, Product } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ImportPageProps {
  user: User;
}

export const ImportPage = ({ user }: ImportPageProps) => {
  const [nfeData, setNfeData] = useState<NFe | null>(null);
  const [selectedFilial, setSelectedFilial] = useState<string>('');
  const [itemsWithLoteData, setItemsWithLoteData] = useState<Map<number, { lote: string; expirationDate: string }>>(new Map());
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

  const updateItemLoteData = (itemIndex: number, field: 'lote' | 'expirationDate', value: string) => {
    const newMap = new Map(itemsWithLoteData);
    const current = newMap.get(itemIndex) || { lote: '', expirationDate: '' };
    newMap.set(itemIndex, { ...current, [field]: value });
    setItemsWithLoteData(newMap);
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
        const loteData = itemsWithLoteData.get(index);

        // Verificar se temos lote e validade (do XML ou preenchido manualmente)
        const finalLote = loteData?.lote || item.lote;
        const finalExpiration = loteData?.expirationDate || item.expirationDate;

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
            name: item.name,
            activeIngredient: item.name.split(' ')[0], // Simple heuristic, ideally manual or better parsing
            manufacturer: item.manufacturer,
            ean: item.ean,
            ncm: item.ncm,
          };

          await addProduct(newProduct);

          product = {
            id: newProduct.id,
            name: newProduct.name,
            activeIngredient: newProduct.activeIngredient,
            manufacturer: newProduct.manufacturer,
            ean: newProduct.ean,
            ncm: newProduct.ncm
          };

          sessionCreatedProducts.set(item.ean, product);
        }

        if (!product) continue;

        // Adicionar item ao estoque
        await addStockItem({
          productId: product.id,
          filialId: selectedFilial,
          lote: finalLote,
          expirationDate: finalExpiration,
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
      setNfeData(null);
      setSelectedFilial('');
      setItemsWithLoteData(new Map());

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
          <CardTitle>Upload de Arquivo XML</CardTitle>
          <CardDescription>Selecione um arquivo XML de Nota Fiscal Eletrônica (NFe) padrão Brasil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="xml-file">Arquivo XML</Label>
            <div className="flex gap-2">
              <Input
                id="xml-file"
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="flex-1"
                disabled={isImporting}
              />
              <Button variant="outline" onClick={handleUseSampleXML} disabled={isImporting}>
                Usar Exemplo
              </Button>
            </div>
          </div>

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

          <Card>
            <CardHeader>
              <CardTitle>Validação e Conferência Manual</CardTitle>
              <CardDescription>
                Revise os itens importados e preencha lote/validade quando necessário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Filial de Destino</Label>
                <Select value={selectedFilial} onValueChange={setSelectedFilial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a filial" />
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

              <div className="space-y-3">
                {nfeData.items.map((item, index) => {
                  const loteData = itemsWithLoteData.get(index);
                  const hasLoteAndExpiration = (loteData?.lote && loteData?.expirationDate) || (item.lote && item.expirationDate);

                  return (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-medium text-foreground">{item.name}</h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary">EAN: {item.ean}</Badge>
                                <Badge variant="secondary">NCM: {item.ncm}</Badge>
                                <Badge variant="outline">{item.quantity} unidades</Badge>
                                <Badge variant="outline">{formatCurrency(item.unitPrice)}/un</Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`lote-${index}`} className="text-xs">
                                  Lote {item.lote && '(do XML)'}
                                </Label>
                                <Input
                                  id={`lote-${index}`}
                                  placeholder={item.lote || 'Digite o lote'}
                                  defaultValue={item.lote}
                                  onChange={(e) => updateItemLoteData(index, 'lote', e.target.value)}
                                // Disabled if strict checking enabled, but allowing override for now
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
                                  onChange={(e) => updateItemLoteData(index, 'expirationDate', e.target.value)}
                                />
                              </div>
                            </div>

                            {hasLoteAndExpiration && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
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
                disabled={!selectedFilial || isImporting}
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
    </div>
  );
};
