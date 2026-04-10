
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface LoginPageProps {
  onRegister?: () => void;
}

export const LoginPage = ({ onRegister }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isResetting) {
      if (!email) {
        setError('Por favor, informe seu email para recuperar a senha');
        setLoading(false);
        return;
      }
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg('Link de recuperação enviado para o seu email!');
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Erro ao enviar email de recuperação');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      await signIn(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-48 h-32 mb-4 flex items-center justify-center">
            <img src="/nexfarma-logo.png" alt="NexFarmaPro" className="w-full h-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">NexFarmaPro</CardTitle>
            <CardDescription className="text-base mt-2">
              {isResetting ? 'Recuperação de Senha' : 'Sistema de Gestão Inteligente'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@farma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {!isResetting && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Senha</Label>
                  <Button
                    variant="link"
                    type="button"
                    className="p-0 h-auto text-xs text-muted-foreground"
                    onClick={() => { setError(''); setSuccessMsg(''); setIsResetting(true); }}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="border-green-500 text-green-600">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (isResetting ? 'Enviando...' : 'Entrando...') : (isResetting ? 'Enviar Link de Recuperação' : 'Entrar')}
            </Button>
            
            {isResetting && (
               <Button
                variant="outline"
                type="button"
                className="w-full mt-2"
                onClick={() => { setError(''); setSuccessMsg(''); setIsResetting(false); }}
               >
                 Voltar para o Login
               </Button>
            )}
          </form>
        </CardContent>
        {!isResetting && (
          <CardFooter className="flex justify-center">
            <Button variant="link" onClick={onRegister} className="text-muted-foreground">
              Não tem uma conta? Crie sua Farmácia Grátis
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
