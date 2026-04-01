# LabelOS

Sistema de gestao para gravadoras independentes. SaaS multi-tenant com portal de submissao de demos, AI ranker, CRM de artistas, social intelligence e trending feed.

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Auth**: Clerk (Organizations para multi-tenancy)
- **Database**: Neon (Postgres) + Drizzle ORM
- **Storage**: UploadThing (audio files)
- **AI**: OpenRouter (google/gemini-flash-1.5)
- **Scraping**: Apify (Instagram, TikTok)
- **APIs**: Spotify Web API, YouTube Data API v3
- **Styling**: Tailwind CSS v4 + design system customizado

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo-url> labelos
cd labelos
npm install --legacy-peer-deps
```

### 2. Configurar variaveis de ambiente

Copiar `.env.local` e preencher cada chave:

```bash
cp .env.local .env.local.bak
```

#### Clerk
1. Criar conta em [clerk.com](https://clerk.com)
2. Criar application, ativar Organizations
3. Copiar `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`
4. Configurar webhook em Clerk Dashboard > Webhooks > endpoint: `https://seu-dominio/api/webhooks/clerk`
5. Copiar `CLERK_WEBHOOK_SECRET` do webhook criado

#### Neon
1. Criar conta em [neon.tech](https://neon.tech)
2. Criar projeto e database
3. Copiar `DATABASE_URL` (formato: `postgresql://user:pass@host/db?sslmode=require`)

#### UploadThing
1. Criar conta em [uploadthing.com](https://uploadthing.com)
2. Criar app
3. Copiar o `UPLOADTHING_TOKEN` (base64 na dashboard do UploadThing)

#### OpenRouter
1. Criar conta em [openrouter.ai](https://openrouter.ai)
2. Gerar API key
3. Copiar `OPENROUTER_API_KEY`

#### Apify
1. Criar conta em [apify.com](https://apify.com)
2. Gerar API token em Settings > Integrations
3. Copiar `APIFY_API_KEY`

#### Spotify Web API
1. Ir em [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Criar app
3. Copiar `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`

#### YouTube Data API
1. Ir no [Google Cloud Console](https://console.cloud.google.com)
2. Ativar YouTube Data API v3
3. Criar API key
4. Copiar `YOUTUBE_API_KEY`

### 3. Criar tabelas no banco

```bash
npx drizzle-kit push
```

### 4. Seed de dados de teste

```bash
npx tsx db/seed.ts
```

Cria: 1 label ("Gravadora Demo", slug "demo"), 3 submissions, 2 artistas, 1 ai_config.

### 5. Rodar

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Estrutura de pastas

```
app/
  layout.tsx              # Root layout (Clerk + fonts)
  page.tsx                # Redirect -> /dashboard/submissions
  globals.css             # Tailwind v4 + design tokens
  dashboard/
    layout.tsx            # Shell: sidebar 210px + main
    submissions/page.tsx  # Lista de demos + drawer lateral
    artists/
      page.tsx            # Grid de artistas + modal
      [artistId]/page.tsx # Perfil completo + grafico SVG
    trending/page.tsx     # 3 colunas: TikTok, Reels, Spotify
    settings/ai/page.tsx  # Config dos criterios da IA
  submit/
    [orgSlug]/page.tsx    # Portal publico de submissao
  api/
    artists/              # CRUD de artistas
    submissions/          # CRUD de submissions
    ai/
      analyze/            # AI ranker (fire-and-forget)
      config/             # Config de criterios da IA
    scraping/
      run/                # Scraping de todos os artistas
      artist/[artistId]/  # Scraping individual
      status/             # Status do ultimo scraping
    trending/
      route.ts            # GET trending tracks
      update/             # POST atualizar trending
    cron/trigger/         # Trigger manual (dev)
    label/                # GET label da org atual
    uploadthing/          # Upload de audio
    webhooks/clerk/       # Webhook: organization.created
components/
  dashboard/
    sidebar.tsx
    header.tsx
    artist-modal.tsx
    submission-drawer.tsx
    growth-chart.tsx      # SVG puro, sem libs externas
  submit/
    submission-form.tsx
db/
  schema.ts               # 6 tabelas Drizzle
  index.ts                # Conexao lazy com Neon
  seed.ts                 # Dados de teste
lib/
  apify.ts                # Client Apify
  clerk.ts                # Auth helpers
  db.ts                   # Label lookup
  openrouter.ts           # Client OpenRouter
  scraping.ts             # Logica de coleta por plataforma
  spotify.ts              # Client Spotify (client credentials)
  trending.ts             # Logica de trending (TikTok, Reels, Spotify)
  uploadthing.ts          # File router
  youtube.ts              # Client YouTube Data API
netlify/
  functions/
    daily-scraping.ts     # Cron: 6h BRT, scraping + trending
```

## Como testar o cron localmente

O cron roda automaticamente no Netlify. Para testar local:

```bash
# Com o dev server rodando, fazer POST autenticado:
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json"
```

Ou acessar pelo dashboard e usar os botoes "Coletar dados" (artistas) e "Atualizar agora" (trending).

## Scripts

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Dev server |
| `npm run build` | Build de producao |
| `npm run db:push` | Sync schema -> Neon |
| `npm run db:seed` | Inserir dados de teste |
| `npm run db:generate` | Gerar migrations |
| `npm run db:studio` | Drizzle Studio (GUI) |

## Deploy no Netlify

1. Conectar repositorio no Netlify
2. Configurar:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Functions directory**: `netlify/functions`
3. Adicionar TODAS as variaveis de ambiente do `.env.local`
4. Configurar Scheduled Function:
   - `daily-scraping`: cron `0 9 * * *` (6h BRT)
5. Atualizar `NEXT_PUBLIC_APP_URL` para o dominio do Netlify
6. Atualizar webhook URL no Clerk Dashboard
