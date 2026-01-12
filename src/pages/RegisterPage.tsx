
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RegisterPageProps {
  onUserCreated: (userId: string) => void;
  onBack: () => void;
}

export const RegisterPage = ({ onUserCreated, onBack }: RegisterPageProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedFilial, setSelectedFilial] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [filiais, setFiliais] = useState<any[]>([]);
  const { toast } = useToast();
  const { signUp } = useAuth();

  useEffect(() => {
    const fetchFiliais = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.from('filiais').select('*');
      if (data) setFiliais(data);
    };
    fetchFiliais();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    if (!name || !email || !selectedFilial || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      await signUp(email, password, {
        name,
        role: 'viewer',
        filialId: selectedFilial
      });

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Verifique seu email para confirmar o cadastro.',
      });

      setSuccess(true);

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">Cadastre-se</CardTitle>
          <CardDescription>
            Crie sua conta para acessar o sistema de gestão de estoque
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@farma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="******"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filial">Filial</Label>
              <Select value={selectedFilial} onValueChange={setSelectedFilial}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua filial" />
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

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-success bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Cadastro realizado! Verifique seu email.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || success}>
              {isLoading ? 'Criando conta...' : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Conta
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBack}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
