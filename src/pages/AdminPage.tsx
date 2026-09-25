import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, UserPlus, Key, UploadCloud, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const AdminPage = ({ currentUser }: { currentUser?: any }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [certificate, setCertificate] = useState<any>(null);
  
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');

  // Fetch local data on mount
  useEffect(() => {
    fetchUsers();
    fetchCertificate();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:3333/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error('Serviço local offline', e);
    }
  };

  const fetchCertificate = async () => {
    try {
      const res = await fetch('http://localhost:3333/api/certificate');
      const data = await res.json();
      setCertificate(data);
    } catch (e) {
      console.error('Serviço local offline', e);
    }
  };

  const handleCertUpload = async () => {
    if (!selectedFile || !password) return alert('Selecione o arquivo e digite a senha');
    
    const formData = new FormData();
    formData.append('certificado', selectedFile);
    formData.append('password', password); // We would normally encrypt this or pass securely
    formData.append('companyName', 'NOVA FARMÁCIA (Via Upload)');
    formData.append('validUntil', '12/12/2027'); // Mock extraction date

    try {
      await fetch('http://localhost:3333/api/certificate', {
        method: 'POST',
        body: formData
      });
      setIsCertModalOpen(false);
      fetchCertificate();
    } catch (e) {
      alert('Erro ao enviar certificado');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    try {
      await fetch('http://localhost:3333/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          role: formData.get('role'),
          permissions: ['Consultar Cofre', 'Legal Holds']
        })
      });
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (e) {
      alert('Erro ao adicionar usuário');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Configurações & Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Gestão de acesso ao Cofre Digital e certificados (e-CNPJ).
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => setIsUserModalOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Autorizados</CardTitle>
              <CardDescription>Colaboradores com acesso à infraestrutura de preservação (Banco Local).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm text-left text-muted-foreground">
                  <thead className="text-xs text-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3">Nome</th>
                      <th className="px-6 py-3">Papel</th>
                      <th className="px-6 py-3">Permissões de Cofre</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="bg-white border-b hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                              {u.name.substring(0,2).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 capitalize">{u.role}</td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            {u.permissions ? JSON.parse(u.permissions).join(', ') : 'Padrão'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm">Editar</Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                          Nenhum usuário cadastrado no banco local ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Certificado e-CNPJ
              </CardTitle>
              <CardDescription>Credencial salva LOCALMENTE para comunicação oficial SNCR.</CardDescription>
            </CardHeader>
            <CardContent>
              {certificate ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-emerald-800">{certificate.company_name}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-emerald-700 mb-2">Arquivo: {certificate.filename}</p>
                  <p className="text-xs font-bold text-emerald-700">Válido até: {certificate.valid_until}</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border rounded-lg mb-4 text-center">
                  <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Nenhum certificado instalado</p>
                </div>
              )}
              <Button onClick={() => setIsCertModalOpen(true)} variant={certificate ? "outline" : "default"} className="w-full text-xs" size="sm">
                {certificate ? 'Substituir Certificado A1 (.pfx)' : 'Instalar Certificado A1 (.pfx)'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cert Modal */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar Certificado A1</DialogTitle>
            <DialogDescription>
              Faça o upload do arquivo .pfx ou .p12. O arquivo será guardado de forma segura na pasta local do NexFarmaPro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Arquivo do Certificado</Label>
              <Input type="file" accept=".pfx,.p12" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Senha do Certificado</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite a senha..." />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCertModalOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCertUpload}>
              <UploadCloud className="w-4 h-4 mr-2" /> Salvar no Cofre
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário Local</DialogTitle>
            <DialogDescription>
              O usuário terá acesso ao sistema mesmo sem internet, pois será salvo no banco de dados SQLite local.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input name="name" required placeholder="Ex: Maria Farmacêutica" />
            </div>
            <div className="space-y-2">
              <Label>Papel (Role)</Label>
              <select name="role" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="tecnico">Técnico (Consultas)</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Cadastrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
