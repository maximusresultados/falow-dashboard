# FalowCRM Analytics Dashboard

Dashboard analítico de CRM conectado ao Supabase.

## Deploy no Vercel (Passo a Passo)

### 1. Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome: `falow-dashboard`
3. Marque **Private**
4. Clique **Create repository**

### 2. Subir o código

No terminal (CMD/PowerShell), dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "FalowCRM Dashboard v1"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/falow-dashboard.git
git push -u origin main
```

### 3. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique **"Add New → Project"**
3. Importe o repositório `falow-dashboard`
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua anon key
5. Clique **Deploy**

Pronto! Em ~1 minuto seu dashboard estará online.

### 4. Domínio personalizado (opcional)

1. No Vercel, vá em **Settings → Domains**
2. Adicione: `dashboard.falowcrm.com.br`
3. Configure o DNS no seu provedor apontando para o Vercel

## Estrutura

```
falow-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.js      ← Layout global + meta tags
│   │   └── page.js        ← Página principal
│   ├── components/
│   │   └── Dashboard.js   ← Componente do dashboard
│   └── lib/
│       └── supabase.js    ← Helper de conexão Supabase
├── .env.local              ← Variáveis de ambiente (NÃO commitar!)
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000
