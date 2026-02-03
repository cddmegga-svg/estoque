
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { registerTenant } from '@/services/api';
import { Link, useNavigate } from 'react-router-dom';

export const RegisterTenantPage = () => {
    const [step, setStep] = useState<'details' | 'account' | 'success'>('account');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        cnpj: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const { signUp } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    // CNPJ Validator (Checksum)
    const validateCNPJ = (cnpj: string) => {
        cnpj = cnpj.replace(/[^\d]+/g, '');
        if (cnpj === '') return false;
        if (cnpj.length !== 14) return false;
        // Eliminate common invalid CNPJs
        if (/^(\d)\1+$/.test(cnpj)) return false;

        // Valida DVs
        let tamanho = cnpj.length - 2
        let numeros = cnpj.substring(0, tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(0))) return false;

        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        for (let i = tamanho; i >= 1; i--) {
            soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(1))) return false;

        return true;
    };

    const formatCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substring(0, 18);
    };

    const handleInputChange = (field: string, value: string) => {
        let finalValue = value;
        if (field === 'cnpj') {
            finalValue = formatCNPJ(value);
        }
        setFormData({ ...formData, [field]: finalValue });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({ variant: 'destructive', title: 'Senhas não conferem', description: 'Por favor, digite a mesma senha.' });
            return;
        }

        if (!validateCNPJ(formData.cnpj)) {
            toast({ variant: 'destructive', title: 'CNPJ Inválido', description: 'O CNPJ informado não é válido. Verifique os números.' });
            return;
        }

        setLoading(true);
        try {
            // 1. Create Supabase Auth User
            // Note: This signs them up but doesn't create the tenant yet.
            const { user, error } = await signUp(formData.email, formData.password, {
                name: formData.name,
                role: 'admin' // Initial Metadata
            });

            if (error) throw error;
            if (!user) throw new Error('Falha ao criar usuário.');

            // 2. Call RPC to Create Tenant and link User
            await registerTenant(
                formData.companyName,
                formData.cnpj,
                formData.email,
                formData.name,
                user.id
            );

            setStep('success');
            toast({ title: 'Sucesso!', description: 'Sua farmácia foi criada. Bem-vindo ao Sistema!' });

        } catch (err: any) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Erro no Cadastro', description: err.message || 'Falha ao criar conta.' });
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl text-emerald-700">Conta Criada!</CardTitle>
                        <CardDescription>
                            Bem-vindo ao sistema, <strong>{formData.companyName}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Sua conta foi configurada e sua farmácia já está ativa.
                        </p>
                        <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => navigate('/login')}>
                            Ir para o Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-6 h-6 text-primary" />
                        <span className="font-bold text-xl text-slate-800">NexFarmaPro</span>
                    </div>
                    <CardTitle>Crie sua conta</CardTitle>
                    <CardDescription>
                        Comece a gerenciar sua farmácia profissionalmente hoje.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome da Farmácia (Razão Social ou Fantasia)</Label>
                            <Input
                                placeholder="Ex: Mega Farma Matriz"
                                value={formData.companyName}
                                onChange={e => handleInputChange('companyName', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>CNPJ</Label>
                            <Input
                                placeholder="00.000.000/0000-00"
                                value={formData.cnpj}
                                onChange={e => handleInputChange('cnpj', e.target.value)}
                                maxLength={18}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Usado para identificação fiscal e importação de XML.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Seu Nome</Label>
                                <Input
                                    placeholder="Dono / Gerente"
                                    value={formData.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email de Acesso</Label>
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={formData.email}
                                    onChange={e => handleInputChange('email', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Senha</Label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => handleInputChange('password', e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Confirmar Senha</Label>
                                <Input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={e => handleInputChange('confirmPassword', e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Configurando Farmácia...</> : 'Criar Conta Grátis'}
                        </Button>

                        <div className="text-center text-sm">
                            Já tem conta? <Link to="/login" className="text-primary hover:underline">Fazer Login</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
