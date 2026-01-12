# Guia de Deploy (Publicação Online)

Como sua aplicação usa **Vite + React** e **Supabase**, a forma mais rápida e fácil de colocar online é usando **Vercel** ou **Netlify**.

## Opção 1: Vercel (Recomendada)
A Vercel é excelente para apps React e tem integração nativa com o GitHub.

### 1. Preparar o Repositório
Se ainda não fez, suba seu código para o GitHub:
1.  Crie um repositório no GitHub.
2.  No seu terminal local:
    ```bash
    git init
    # Certifique-se que o arquivo .env.local está no .gitignore!
    git add .
    git commit -m "Deploy inicial"
    git branch -M main
    git remote add origin SEU_URL_DO_GITHUB
    git push -u origin main
    ```

### 2. Conectar na Vercel
1.  Crie uma conta em [vercel.com](https://vercel.com).
2.  Clique em **"Add New..."** > **"Project"**.
3.  Importe seu repositório do Git.
4.  **Configurar Variáveis de Ambiente**:
    *   Nas configurações de deploy (Environment Variables), adicione:
        *   `VITE_SUPABASE_URL`: (Valor do seu projeto Supabase)
        *   `VITE_SUPABASE_KEY`: (Sua chave Anon Key)
5.  Clique em **Deploy**.

## Opção 2: Netlify (Drag & Drop)
Se não quiser usar Git agora, pode fazer upload manual.

1.  Rode o comando de build no seu PC:
    ```bash
    npm run build
    ```
2.  Isso vai gerar uma pasta `dist`.
3.  Crie uma conta em [netlify.com](https://netlify.com).
4.  Arraste a pasta `dist` para a área de drop do Netlify.
5.  **Atenção**: Como estamos usando Router, apps SPA precisam de uma configuração extra no Netlify para não dar erro 404 ao atualizar a página.
    *   Crie um arquivo chamado `_redirects` na pasta `public`:
        ```text
        /*  /index.html  200
        ```
    *   Reconstrua (`npm run build`) e faça upload novamente.

## URL do Banco de Dados
Lembre-se que seu banco de dados Supabase já está na nuvem! Não precisa "deployar" o banco. O app, seja rodando no seu PC ou na Vercel, vai conectar no mesmo banco de dados do Supabase.
