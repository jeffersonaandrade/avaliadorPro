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

### Onde está a verdade do schema

| Artefato | Função |
|----------|--------|
| [`database.sql`](./database.sql) | DDL **idempotente** para criar/atualizar tabelas e colunas (pode colar o arquivo inteiro no SQL Editor mesmo com base já existente). |
| Esta secção | Inventário do que o **código atual** espera; deve permanecer alinhada ao `database.sql`. |

**Regra de projeto:** ao introduzir tabela ou coluna usada em Server Actions / `supabaseAdmin`, atualize **sempre** `database.sql` **e** esta secção do README (e políticas RLS, se mudarem o modelo de acesso). A regra também está em `.cursor/rules/avaliador-pro-stack.mdc`.

### Uso da `service_role`

O app usa **`SUPABASE_SERVICE_ROLE_KEY`** em Server Actions para persistir sem depender de políticas RLS permissivas. Em produção, restrinja a exposição dessa chave ao servidor apenas (nunca `NEXT_PUBLIC_`).

### Tabelas e colunas (referência)

#### `public.consultas_veiculos`

Cache por placa; usada em `veiculo-actions`, `viabilidade-actions`, `consultas-risco-actions`, reconciliação (leitura).

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `placa` | TEXT | UNIQUE, normalizada (7 chars, maiúsculas) |
| `marca`, `modelo`, `ano` | TEXT / INTEGER | Obrigatórios na criação |
| `fipe` | TEXT | Referência exibida / parseada |
| `chassi`, `cor`, `combustivel`, `tipo_veiculo` | TEXT | Opcionais |
| `mes_referencia_fipe`, `aviso_fipe` | TEXT | Metadados FIPE |
| `dados_leilao` | JSONB | Default `{}`; premium, histórico, etc. |
| `simulacao_viabilidade` | JSONB | Simulação + veredito; JSON pode incluir `percentualLeilao`, `percentualSinistro`, `percentualRoubo`, `percentualGravame` (ROI alinhado ao audit) |
| `criado_em` | TIMESTAMPTZ | Default `now()` |
| `atualizado_em` | TIMESTAMPTZ | Opcional; TTL 30 dias do cache usa `coalesce(atualizado_em, criado_em)` |

#### `public.usuario_acesso`

Plano, cota FIPE mensal e créditos premium; `usuario-acesso.ts`, `provision-usuario-acesso.ts`, auth callback.

| Coluna | Tipo | Notas |
|--------|------|--------|
| `identificador` | TEXT | PK — UUID local ou `auth.users.id` |
| `plano_ativo` | BOOLEAN | Default `false` |
| `consultas_fipe_utilizadas`, `consultas_fipe_limite` | INTEGER | Cota mensal |
| `fipe_mes_referencia` | TEXT | `YYYY-MM` UTC; troca de mês zera utilização |
| `creditos_premium` | INTEGER | Blindagem / consultas premium |
| `atualizado_em` | TIMESTAMPTZ | Default `now()` |

#### `public.consultas_auditoria_eventos`

Trail de auditoria premium; `consulta-audit-supabase.ts`, reconciliação admin, métricas `valor_evitar_perda`.

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | UUID | PK |
| `criado_em` | TIMESTAMPTZ | Default `now()` |
| `cliente_id` | TEXT | Identificador do cliente |
| `placa` | TEXT | |
| `evento` | TEXT | Ex.: `CONSULTA_INICIO`, `CONSULTA_SUCESSO`, `CREDITO_CONSUMIDO`, … |
| `tipo_consulta`, `detalhe` | TEXT | Opcionais |
| `valor_evitar_perda` | NUMERIC(14,2) | Opcional; ROI auditável |
| `tipo_risco_detectado` | TEXT | Opcional |
| `request_id` | TEXT | Opcional; correlaciona eventos da mesma operação |
| `persistencia_falhou_apos_debito` | BOOLEAN | Default `false`; em `CREDITO_CONSUMIDO`, `true` classifica ROI como suspeito |
| `blindagem_persistencia_falhou_apos_debito` | BOOLEAN | Idem para fluxo blindagem |

Índices documentados no `database.sql`: `(cliente_id, criado_em)`, `(placa, criado_em)`, `(request_id)` parcial, `(evento, criado_em)`.

#### `public.metricas_mensais_consolidadas`

Agregação mensal por cliente antes da limpeza de `consultas_auditoria_eventos` (retenção). Preenchida pela função SQL `auditoria_retencao_executar()` (ver `database.sql`). `valor_total_protegido` soma apenas eventos `CREDITO_CONSUMIDO`.

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | UUID | PK |
| `cliente_id` | TEXT | |
| `mes_referencia` | TEXT | `YYYY-MM` (UTC) |
| `total_consultas` | INTEGER | Contagem `CONSULTA_SUCESSO` no período agregado |
| `total_creditos` | INTEGER | `CREDITO_CONSUMIDO` |
| `total_erros` | INTEGER | `CONSULTA_ERRO` |
| `total_timeouts` | INTEGER | `CONSULTA_TIMEOUT` |
| `valor_total_protegido` | NUMERIC(14,2) | Soma `valor_evitar_perda` só em `CREDITO_CONSUMIDO` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Retenção:** após aplicar o DDL, agende `GET` ou `POST` em `/api/cron/retencao-auditoria` com `Authorization: Bearer <CRON_SECRET>` (diário). O arquivo [`vercel.json`](./vercel.json) inclui exemplo de cron às 05:00 UTC. Opcional: `RETENCAO_AUDITORIA_ON_STARTUP=true` roda uma vez ao subir o servidor (via `instrumentation.ts`).

#### `public.fipe_quota_diaria` (legado)

Definida no `database.sql` para modelo freemium diário. **O código atual em `src/` não referencia esta tabela**; o fluxo ativo usa cota **mensal** em `usuario_acesso`. Pode existir no banco sem impacto; remoção futura é decisão de produto.

### Auth e outros objetos Supabase

Tabelas **`auth.users`** e recursos geridos pelo painel Supabase (Auth) **não** estão no `database.sql` deste repositório; o app consome-as via `@supabase/ssr` conforme a documentação Supabase.

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
| `NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO` | Build/client | Não | Placa tratada como “demonstração” na UI quando **não** há `NEXT_PUBLIC_USE_MOCKS` (badge, PDF). Padrão `AAA0000` se ausente ou formato inválido. |
| `AVALIADOR_MOCKS_SANDBOX_MARCA` | Servidor | Não | Com mocks ligados, sobrescreve marca do perfil sandbox (FIPE / `dadosBasicosSandbox`). |
| `AVALIADOR_MOCKS_SANDBOX_MODELO` | Servidor | Não | Idem — modelo. |
| `AVALIADOR_MOCKS_SANDBOX_ANO_MODELO` | Servidor | Não | Idem — ano modelo (1950 … ano atual + 1). |
| `AVALIADOR_MOCKS_SANDBOX_CHASSI` | Servidor | Não | Idem — chassi. |
| `AVALIADOR_MOCKS_SANDBOX_COR` | Servidor | Não | Idem — cor. |
| `AVALIADOR_MOCKS_SANDBOX_COMBUSTIVEL` | Servidor | Não | Idem — combustível. |
| `AVALIADOR_MOCKS_SANDBOX_TIPO_VEICULO` | Servidor | Não | Idem — tipo de veículo (ex. Automovel). |
| `AVALIADOR_DEV_ACESSO_TOTAL` | Servidor | Não | `true` — **somente local**: ignora tabela `usuario_acesso` e simula plano ativo + limites altos (nunca em produção). |
| `CRON_SECRET` | Servidor | Para cron | Segredo compartilhado com o agendador (ex.: Vercel Cron); obrigatório para `/api/cron/retencao-auditoria` responder 200. |
| `RETENCAO_AUDITORIA_ON_STARTUP` | Servidor | Não | `true` — executa `auditoria_retencao_executar` ao iniciar o Node (instrumentation); use com cautela. |

\*Não obrigatórias se `NEXT_PUBLIC_USE_MOCKS=true` para desenvolvimento.

†Obrigatória para **consultas premium reais** (API v2 com Bearer). **Sem** esse token e com `NEXT_PUBLIC_USE_MOCKS=true`, premium usa mock determinístico. **Com** token definido, premium chama a API v2 mesmo em modo mocks.

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
# Placa “demo” na UI (sem mocks): padrão AAA0000 se omitir
# NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO=AAA0000
# Perfil FIPE/sandbox (só com mocks): HB20 padrão se omitir
# AVALIADOR_MOCKS_SANDBOX_MARCA=HYUNDAI
```

---

## Modo mock (desenvolvimento)

Com `NEXT_PUBLIC_USE_MOCKS=true`, o fluxo usa **dados fixos de sandbox** (perfil padrão HB20, sobrescrevível por `AVALIADOR_MOCKS_SANDBOX_*`) para **qualquer placa válida** — a chave no banco continua sendo a placa digitada, mas o cenário exibido é o de demonstração. A UI trata todo resultado com `sandboxAtivo` como **veículo de teste** (badge + “Fonte: Sandbox / Simulação”), no mesmo espírito da placa de demonstração configurável (`NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO`, padrão `AAA0000`) usada **sem** a flag só para ensaio pontual. As **consultas premium** ficam em **mock** só quando **não** há `API_CONSULTAR_PLACA_TOKEN` no servidor; com o token definido, premium chama a **API Consultar Placa v2** mesmo em modo mocks (inclui placa sandbox do provedor com retorno real). A resolução FIPE segue `fipe-resolver` quando há cota. O **middleware** libera `/painel` **sem login**; limites simulados tipo **Premium** **sem gravar** em `usuario_acesso`. Em produção, **não** defina esta flag como `true`.

**FIPE (Parallelum) ≠ placa teste Consultar Placa:** a referência FIPE **não** é consultada por placa. O `fipe-resolver` envia **marca, modelo, ano modelo, combustível e tipo de veículo** à API Parallelum. Com mocks ligados, esses atributos vêm do **perfil sandbox** em `veiculo-actions.ts` (`dadosBasicosSandbox`: HB20 por padrão, opcionalmente via `AVALIADOR_MOCKS_SANDBOX_*`), não de `NEXT_PUBLIC_AVALIADOR_PLACA_DEMONSTRACAO`. Uma placa sandbox do provedor Consultar Placa (ex. documentação `AAA0000` ou a que você configurar no env) serve aos **endpoints Consultar Placa** (básico / v2); **não** substitui nem alimenta diretamente o contrato da FIPE. O modo teste fixa o **conjunto marca/modelo/ano** (customizável) adequado ao matching FIPE.

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

- **KPI de valor:** cada débito premium bem-sucedido pode registrar **`valor_evitar_perda`** na tabela Supabase **`consultas_auditoria_eventos`** (evento `CREDITO_CONSUMIDO`). O banner **“valor protegido este mês”** soma apenas ROI **confiável** (persistência confirmada); a reconciliação admin mostra também o ROI **em verificação**. Ver [`docs/ESTADO_E_ROADMAP.md`](./docs/ESTADO_E_ROADMAP.md) §7.3.
- **Panorama do produto, regras de cálculo na tela e backlog sugerido:** [`docs/ESTADO_E_ROADMAP.md`](./docs/ESTADO_E_ROADMAP.md).
- Integração real de **pagamento PIX** e **consulta premium**: hoje há UI e estado local; substituir o fluxo mock por gateway e API conforme produto.
- Testes unitários: **`tests/unit/`** (Vitest). E2E (Playwright etc.) pode ser adicionado depois em `tests/e2e/` ou pasta dedicada.
