import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { fetchCurrentTenant, updateTenantSettings } from '@/services/api';

export const TenantSettings = () => {
    const [logoUrl, setLogoUrl] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#059669');
    const [website, setWebsite] = useState('');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchCurrentTenant().then(tenant => {
            if (tenant) {
                setLogoUrl(tenant.logo_url || '');
                setPrimaryColor(tenant.primary_color || '#059669');
                setWebsite(tenant.website || '');
                setPhone(tenant.phone || '');
                setName(tenant.name || '');
            }
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateTenantSettings(logoUrl, primaryColor, website, phone, name);
            toast({ title: 'Sucesso', description: 'Dados da empresa atualizados!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personalização da Empresa</CardTitle>
                <CardDescription>Configure a identidade visual e dados de contrato da sua farmácia no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                    <div className="space-y-2">
                        <Label>Nome Fantasia (Sistema)</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Farmácia Central" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Logo URL</Label>
                            <div className="flex gap-2">
                                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                            </div>
                            <p className="text-xs text-muted-foreground">Cole o link direto da sua logo.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Cor Principal</Label>
                            <div className="flex gap-2 items-center">
                                <Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-10 p-1" />
                                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#000000" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Telefone / Suporte</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 0000-0000" />
                        </div>
                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.suafarmacia.com" />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
