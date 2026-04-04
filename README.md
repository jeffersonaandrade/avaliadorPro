# Avaliador PRO

Aplicação **SaaS** para **consulta de placa** e **análise de viabilidade de compra** no pátio: combina dados veiculares, referência FIPE e um simulador de margem/ofertas orientado à decisão do lojista.

---

## Sumário

- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Banco de dados (Supabase)](#banco-de-dados-supabase)
- [Scripts](#scripts)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Modo mock (desenvolvimento)](#modo-mock-desenvolvimento)
- [Deploy](#deploy)
- [Segurança](#segurança)

---

## Stack

| Tecnologia | Uso |
|------------|-----|
| **Next.js 16** (App Router) | Framework full-stack, Server Actions |
| **React 19** | UI |
| **TypeScript** | Tipagem |
| **Tailwind CSS** | Estilização |
| **Supabase** | Persistência (cache por placa + simulação de viabilidade) |
| **Zod** | Validação (ex.: placa) |
| **Lucide React** | Ícones |

Integrações externas:

- **Consultar Placa** — dados básicos do veículo (API paga).
- **FIPE (Parallelum)** — resolução de preço via `fipe-resolver` (consumo conforme implementação atual).

---

## Funcionalidades

- **Análise por placa** — somente após clique em **Analisar veículo**; cache em banco (`consultas_veiculos`) evita chamadas duplicadas às APIs.
- **Acesso B2B** — `usuario_acesso` no Supabase: `plano_ativo`, limite **mensal** de resoluções FIPE (`consultas_fipe_utilizadas` / `consultas_fipe_limite`) e `creditos_premium` para análises premium. Sem plano ativo, nenhuma API externa é chamada.
- **Exibição** — marca, modelo, ano, referência de mercado, chassi, cor, combustível, tipo e avisos.
- **Formulário de viabilidade** — foco no **teto de compra** (oferta máxima segura); custos operacionais (sem incluir o preço pedido); comparação visual pedido × teto e delta; lucro desejado, ajuste FIPE e gordura de negociação.
- **Motor de viabilidade** (`src/lib/viabilidade.ts`) — custo total operacional, preço de venda sugerido, margem vs FIPE tabela, veredito, oferta máxima e oferta inicial (ancoragem).
- **UX de decisão** — resumo executivo, cenário conservador, alertas contextuais, fluxo mock de **PIX** para “histórico premium” (UI apenas).

---

## Pré-requisitos

- **Node.js** 20+ (recomendado; alinhado ao `engines` implícito do projeto).
- Conta **Supabase** com projeto criado.
- Credenciais **Consultar Placa** (e-mail + API key), exceto em modo mock.

---

## Configuração

1. **Clone o repositório**

   ```bash
   git clone <url-do-repositorio>
   cd avaliadorPro
   ```

2. **Instale dependências**

   ```bash
   npm install
   ```

3. **Crie o arquivo `.env.local`** na raiz (não commitado — ver `.gitignore`) com as variáveis da [tabela abaixo](#variáveis-de-ambiente).

4. **Aplique o schema SQL** no Supabase (SQL Editor), usando o arquivo [`database.sql`](./database.sql) como referência. Ajuste **RLS** para produção — o arquivo inclui comentários sobre políticas de desenvolvimento vs produção.

5. **Suba o ambiente de desenvolvimento**

   ```bash
   npm run dev
   ```

   Abra [http://localhost:3000](http://localhost:3000) (landing), [http://localhost:3000/login](http://localhost:3000/login), [http://localhost:3000/cadastro](http://localhost:3000/cadastro) e o app em [http://localhost:3000/painel](http://localhost:3000/painel).

---

## Banco de dados (Supabase)

A tabela principal documentada em `database.sql` é `public.consultas_veiculos`, com:

- Dados do veículo e FIPE em colunas tipadas.
- `dados_leilao` (JSONB).
- `simulacao_viabilidade` (JSONB) — última simulação salva pelo app.

**Importante:** o app usa **`SUPABASE_SERVICE_ROLE_KEY`** em Server Actions para persistir sem depender de políticas RLS permissivas. Em produção, restrinja a exposição dessa chave ao servidor apenas (nunca `NEXT_PUBLIC_`).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack). |
| `npm run build` | Build de produção. |
| `npm run start` | Sobe o servidor após `build`. |
| `npm run lint` | ESLint (config Next.js). |
| `npm run test` | Vitest em modo watch. |
| `npm run test:run` | Vitest uma execução (CI / pré-commit). |

---

## Estrutura do projeto

```
avaliadorPro/
├── database.sql              # Referência DDL Supabase
├── tests/
│   └── unit/                 # Vitest — espelha src (lib, formulario-viabilidade, …)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Landing (marketing, dark)
│   │   ├── login/            # Login (fluxo simulado → `/painel`)
│   │   ├── cadastro/         # Cadastro + `?plano=`
│   │   └── painel/page.tsx   # App + BuscaPlaca (`/painel`)
│   ├── actions/
│   │   ├── veiculo-actions.ts    # Análise/cache veículo + gate plano e limite FIPE
│   │   ├── acesso-actions.ts     # Estado do plano / créditos (UI)
│   │   ├── consultas-risco-actions.ts # Análises premium (créditos)
│   │   └── viabilidade-actions.ts # Persiste simulação (com plano ativo)
│   ├── components/
│   │   ├── BuscaPlaca.tsx
│   │   ├── FormularioViabilidade.tsx
│   │   └── formulario-viabilidade/  # UI modular do formulário
│   └── lib/
│       ├── consultar-placa.ts    # Cliente API Consultar Placa
│       ├── fipe-resolver.ts      # Referência FIPE (Parallelum)
│       ├── usuario-acesso.ts     # Plano, limite mensal FIPE, créditos premium
│       ├── client-id.ts          # UUID anônimo (localStorage)
│       ├── consultas-risco-premium.ts
│       ├── supabase.ts           # Clientes anon + service_role
│       ├── validations.ts
│       └── viabilidade.ts        # Motor de cálculo
├── public/
├── vitest.config.ts
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Variáveis de ambiente

Crie **`.env.local`** na raiz com:

| Variável | Onde roda | Obrigatória | Descrição |
|----------|-----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente + servidor | Sim | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente + servidor | Sim | Chave anônima (pública). |
| `NEXT_PUBLIC_SITE_URL` | Build / redirects | Recomendado | URL pública do site (ex.: `http://localhost:3000` ou produção). Usada em links de confirmação de e-mail (`/auth/callback`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Somente servidor** | Sim | Service role — usada em actions admin; **nunca** exponha no client. |
| `CONSULTAR_PLACA_API_EMAIL` | Servidor | Sim* | E-mail da conta Consultar Placa. |
| `CONSULTAR_PLACA_API_KEY` | Servidor | Sim* | API key Consultar Placa. |
| `API_CONSULTAR_PLACA_TOKEN` | **Somente servidor** | Sim† | Bearer para endpoints premium v2 (`consultarRegistroLeilaoPrime`, sinistro, roubo/furto, gravame). **Nunca** `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_USE_MOCKS` | Build/client | Não | `true` — evita chamada paga à API de placa em dev (dados sandbox). |
| `AVALIADOR_DEV_ACESSO_TOTAL` | Servidor | Não | `true` — **somente local**: ignora tabela `usuario_acesso` e simula plano ativo + limites altos (nunca em produção). |

\*Não obrigatórias se `NEXT_PUBLIC_USE_MOCKS=true` para desenvolvimento.

†Obrigatória para **consultas premium reais** em produção. Com `NEXT_PUBLIC_USE_MOCKS=true`, as consultas premium usam mock determinístico e **não** chamam a API (sem débito de crédito).

**Auth (Supabase):** no painel do projeto, em Authentication → URL Configuration, inclua **Redirect URLs**: `http://localhost:3000/auth/callback` (e o equivalente em produção). Para **Google OAuth**, ative o provider e defina o Client ID/Secret. O middleware protege `/painel`; login e cadastro redirecionam usuários já autenticados.

**Plano e cotas:** com login real, `usuario_acesso.identificador` passa a ser o **UUID do usuário** (`auth.users.id`). O cadastro (e-mail ou Google na primeira vez) **provisiona** a linha com limites conforme o plano da URL (`starter` / `pro` / `premium`). Em fluxo legado sem sessão, ainda vale o UUID em `localStorage` (`avaliadorPro_client_id`). A resolução FIPE incrementa `consultas_fipe_utilizadas` **somente após sucesso**; o mês UTC em `fipe_mes_referencia` reinicia o contador ao virar o mês.

Exemplo mínimo (valores fictícios):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

CONSULTAR_PLACA_API_EMAIL=seu@email.com
CONSULTAR_PLACA_API_KEY=sua_chave
# API_CONSULTAR_PLACA_TOKEN=...   # produção: premium v2 (servidor)

# Opcional em dev:
# NEXT_PUBLIC_USE_MOCKS=true
```

---

## Modo mock (desenvolvimento)

Com `NEXT_PUBLIC_USE_MOCKS=true`, o fluxo usa **dados fixos de sandbox** (ex.: HB20) para **qualquer placa válida** — a chave no banco continua sendo a placa digitada, mas o cenário exibido é o de demonstração. A UI trata todo resultado com `sandboxAtivo` como **veículo de teste** (badge + “Fonte: Sandbox / Simulação”), igual à placa reservada `AAA0000` usada sem a flag só para ensaio pontual. As **consultas premium** também ficam em **mock** sem débito real. A resolução FIPE segue `fipe-resolver` quando há cota. O **middleware** libera `/painel` **sem login**; limites simulados tipo **Premium** **sem gravar** em `usuario_acesso`. Em produção, **não** defina esta flag como `true`.

Útil para UI, viabilidade e testes sem custo de API.

---

## Deploy

1. Conecte o repositório a um provedor (**Vercel**, etc.).
2. Configure **todas** as variáveis de ambiente no painel do provedor (incluindo `SUPABASE_SERVICE_ROLE_KEY` como *secret* de servidor).
3. Rode `npm run build` localmente antes do primeiro deploy para validar erros de TypeScript/build.
4. Garanta que a tabela Supabase exista e que as políticas de segurança estejam alinhadas ao uso de **service role** só no backend.

---

## Segurança

- **Não** commite `.env`, `.env.local` ou chaves em código.
- **Não** prefixe a service role com `NEXT_PUBLIC_`.
- Revise **RLS** no Supabase antes de produção; o exemplo em `database.sql` pode ser permissivo para dev.
- Rotacione chaves se houver vazamento.

---

## Licença

Projeto **privado** (`"private": true` no `package.json`). Ajuste esta seção conforme a licença real do repositório.

---

## Suporte / evolução

- **Panorama do produto, regras de cálculo na tela e backlog sugerido:** [`docs/ESTADO_E_ROADMAP.md`](./docs/ESTADO_E_ROADMAP.md).
- Integração real de **pagamento PIX** e **consulta premium**: hoje há UI e estado local; substituir o fluxo mock por gateway e API conforme produto.
- Testes unitários: **`tests/unit/`** (Vitest). E2E (Playwright etc.) pode ser adicionado depois em `tests/e2e/` ou pasta dedicada.
