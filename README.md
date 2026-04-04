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

- **Busca por placa** — normalização, cache em banco (TTL / reconsulta conforme regras em `veiculo-actions`).
- **Exibição** — marca, modelo, ano, FIPE, chassi, cor, combustível, tipo, avisos de FIPE, mês de referência.
- **Formulário de viabilidade** — custos operacionais, preço pedido pelo vendedor (comparação com teto), lucro desejado, ajuste FIPE para negociação, gordura de negociação.
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

   Abra [http://localhost:3000](http://localhost:3000).

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

---

## Estrutura do projeto

```
avaliadorPro/
├── database.sql              # Referência DDL Supabase
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx          # Home + BuscaPlaca
│   ├── actions/
│   │   ├── veiculo-actions.ts    # Busca/cache veículo
│   │   └── viabilidade-actions.ts # Persiste simulação
│   ├── components/
│   │   ├── BuscaPlaca.tsx
│   │   └── FormularioViabilidade.tsx
│   └── lib/
│       ├── consultar-placa.ts    # Cliente API Consultar Placa
│       ├── fipe-resolver.ts      # FIPE
│       ├── supabase.ts           # Clientes anon + service_role
│       ├── validations.ts
│       └── viabilidade.ts        # Motor de cálculo
├── public/
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
| `SUPABASE_SERVICE_ROLE_KEY` | **Somente servidor** | Sim | Service role — usada em actions admin; **nunca** exponha no client. |
| `CONSULTAR_PLACA_API_EMAIL` | Servidor | Sim* | E-mail da conta Consultar Placa. |
| `CONSULTAR_PLACA_API_KEY` | Servidor | Sim* | API key Consultar Placa. |
| `NEXT_PUBLIC_USE_MOCKS` | Build/client | Não | `true` — evita chamada paga à API de placa em dev (dados sandbox). |

\*Não obrigatórias se `NEXT_PUBLIC_USE_MOCKS=true` para desenvolvimento.

Exemplo mínimo (valores fictícios):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

CONSULTAR_PLACA_API_EMAIL=seu@email.com
CONSULTAR_PLACA_API_KEY=sua_chave

# Opcional em dev:
# NEXT_PUBLIC_USE_MOCKS=true
```

---

## Modo mock (desenvolvimento)

Com `NEXT_PUBLIC_USE_MOCKS=true`, o fluxo de busca usa **dados fixos de sandbox** (ex.: HB20) em vez de consumir créditos da **Consultar Placa**. A resolução FIPE pode seguir conforme `fipe-resolver` e cache.

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

- Integração real de **pagamento PIX** e **consulta premium**: hoje há UI e estado local; substituir o fluxo mock por gateway e API conforme produto.
- Testes automatizados: pasta e scripts podem ser adicionados (`vitest`, `playwright`, etc.) — não inclusos por padrão neste README.
