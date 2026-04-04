# Avaliador PRO — estado do produto, regras e roadmap

Documento vivo: panorama do que o sistema faz hoje, **como os números são calculados** na tela e **o que falta** para evolução.

---

## 1. Visão em uma frase

SaaS B2B para **consulta por placa** (dados do veículo + referência FIPE), **simulação de viabilidade de compra** (teto de negociação, veredito, cenários) e **análises premium simuladas** (leilão, sinistro, etc.), com **acesso por plano** e **cotas** no Supabase.

---

## 2. Stack e arquivos-chave

| Área | Onde está |
|------|-----------|
| Landing (marketing, dark) | `src/app/page.tsx`, `src/components/landing/RadarAnimation.tsx`, `src/lib/planos-marketing.ts` |
| Auth | `src/app/login/`, `src/app/cadastro/`, `src/actions/auth-actions.ts`, `middleware.ts`, `src/app/auth/callback/route.ts`, `src/utils/supabase/*` (`@supabase/ssr`) |
| Painel (app + busca) | `src/app/painel/page.tsx`, `src/components/BuscaPlaca.tsx` |
| Formulário de viabilidade | `src/components/formulario-viabilidade/FormularioViabilidade.tsx` |
| Motor de viabilidade (puro) | `src/lib/viabilidade.ts` |
| Ajustes de mercado na UI (FIPE + histórico) | `src/components/formulario-viabilidade/FormularioViabilidade.tsx`, `historico-veiculo.ts` |
| Placa + cache + FIPE | `src/actions/veiculo-actions.ts`, `src/lib/consultar-placa.ts`, `src/lib/fipe-resolver.ts`, `src/lib/fetch-timeout-ms.ts` (8s, Netlify Free) |
| Plano / limite FIPE / créditos | `src/lib/usuario-acesso.ts`, `src/actions/acesso-actions.ts` |
| Salvar simulação | `src/actions/viabilidade-actions.ts` |
| Consultas premium | `src/actions/consultas-risco-actions.ts`, `src/lib/consultas-risco-premium.ts`, `src/lib/consultar-placa-premium-v2.ts` |
| Schema Supabase | `database.sql` |
| Identificação anônima | `localStorage` `avaliadorPro_client_id` — `src/lib/client-id.ts` |

---

## 3. Fluxos implementados

### 3.1 Identificação e acesso

- Cada navegador tem um **UUID** em `localStorage`; o backend usa o mesmo valor como `identificador` em `usuario_acesso`.
- **`getEstadoAcessoAction`**: lê plano, créditos premium, uso/limite FIPE do mês (UTC).
- **`AVALIADOR_DEV_ACESSO_TOTAL=true`** (só servidor/local): ignora Supabase e simula plano ativo e limites altos.
- Sem `plano_ativo` na linha do cliente: **overlay** na home e no formulário; não chama APIs pagas de análise de veículo de forma útil (validação no `buscarVeiculoAction`).

### 3.2 Busca por placa (`buscarVeiculoAction`)

1. Valida placa (`placaSchema` — Mercosul e antiga).
2. Exige `identificadorCliente` e **`plano_ativo`**.
3. Se existe linha em **`consultas_veiculos`** para a placa → devolve **cache** (sem novo consumo de API de placa).
4. Senão:
   - Se `NEXT_PUBLIC_USE_MOCKS=true` → dados básicos **HB20 sandbox** (sem Consultar Placa).
   - Senão → **Consultar Placa** (API paga).
5. **Resolução FIPE** (`resolverPrecoFipe`): só se `podeUsarConsultaFipe` (plano + limite mensal). Contador **`consultas_fipe_utilizadas`** incrementa **apenas após match válido**. Se limite estourado → `aviso_fipe` com mensagem de limite; valor FIPE pode ficar `"—"`.
6. **Upsert** em `consultas_veiculos` com `dados_leilao` (metadados + futuro histórico).

**Nota:** o cache base em `buscarVeiculoAction` usa **TTL de 30 dias** com `coalesce(atualizado_em, criado_em)`. Cache expirado refaz API/mock, faz upsert com `atualizado_em`/`criado_em` atuais, **preserva** `dados_leilao.consultas_premium` e `simulacao_viabilidade`. É necessário aplicar no Supabase o `ALTER` de `atualizado_em` em `database.sql` se a coluna ainda não existir.

### 3.3 Formulário de viabilidade

- Campos monetários em **centavos** na UI (máscara tipo caixa).
- **Auto-save** com debounce (`DEBOUNCE_MS` = 700 ms) via `salvarSimulacaoViabilidadeAction`, desde que plano ativo.
- Toggle **“incluir referência FIPE na decisão”** (`fipeCarregada`): quando ligado e FIPE válida na consulta, calcula teto, oferta inicial e veredito; quando desligado, persiste só simulação base (sem contexto FIPE no JSON salvo).

### 3.4 Consultas premium (risco)

- Tipos: leilão, sinistro, roubo/furto, gravame (`consultas-risco-premium.ts`).
- Exige análise da placa já existente em `consultas_veiculos`, plano ativo e **`creditos_premium >= 1`** (em modo mock `NEXT_PUBLIC_USE_MOCKS=true` o crédito não é exigido nem debitado).
- Se já existe resultado salvo em `dados_leilao.consultas_premium[tipo]` com **TTL de 7 dias** → **retorna cache sem debitar** nem chamar API.
- Produção: **Consultar Placa v2** (`src/lib/consultar-placa-premium-v2.ts`, `consultas-risco-actions.ts`) — Bearer `API_CONSULTAR_PLACA_TOKEN`, timeout **8 s** (ver §7), retry em rede, validação e normalização para `mergeFlagsComConsultasPremium`.
- `NEXT_PUBLIC_USE_MOCKS=true`: resposta **mock** determinística; grava em JSON; **sem débito** de crédito.
- UI: preços exibidos são **rótulos** (`constants.ts`); cobrança real ainda não integrada a gateway.

### 3.5 PIX / histórico premium (UI)

- Modal com chave mock (`PIX_CHAVE_MOCK`); fluxo apenas para UX até integração real.

---

## 4. Regras de cálculo (o que aparece na tela)

### 4.1 Custos e simulação base — `calcularSimulacaoBase` (`viabilidade.ts`)

**Custo total operacional** (sempre):

`custoTotal = reparos + transporte + documentação + outrosCustos`

O **preço pedido pelo vendedor** **não** entra no custo total.

**Modo A — Cost-plus** (`precoVendaEsperado` = 0 ou inválido):

- `precoVendaSugerido = arredondar(custoTotal × (1 + pctLucroDesejado/100))` (2 casas)
- `lucroEstimado = precoVendaSugerido − custoTotal`
- `margemSobreCustosOperacionaisPct = (lucroEstimado / custoTotal) × 100` se custo > 0

**Modo B — Market-minus** (`precoVendaEsperado` > 0):

- `precoCompraAlvo = max(0, arredondar(precoVendaEsperado / (1 + p/100) − custosOperacionais))`  
  onde `p = max(0, pctLucroDesejado)`
- `lucroEstimado = arredondar(precoVendaEsperado − (precoCompraAlvo + custosOperacionais))`
- `precoVendaSugerido` exposto no resultado da simulação base = **preço de venda esperado** informado

### 4.2 FIPE na decisão — `calcularViabilidade`

Usa o mesmo `custoTotal` e `precoVendaSugerido` da simulação base.

**Margem % sobre FIPE tabela** (para o veredito e painel “meta interna”):

`margemRealSobreFipePct = ((precoVendaSugerido − fipeReferencia) / fipeReferencia) × 100`  
(se FIPE parseável e > 0)

**Referência para negociação (teto)** — combina **ajuste manual %** com limites −100% … +100%:

`fipeParaNegociacao = arredondar(fipeReferencia × (1 + ajusteFipePct/100))`

**Oferta máxima sugerida** (`calcularFaixaNegociacao`):

- `custoTotalMaximo = fipeParaNegociacao / (1 + pctLucro/100)` com `pct = max(0, pctLucroDesejado)`
- `custosFixos` = mesma soma reparos+transporte+doc+outros
- `ofertaMaximaSugerida = max(0, arredondar(custoTotalMaximo − custosFixos))`

**Oferta inicial (ancoragem)**:

- `g = pctGorduraNegociacao` limitado a 0…100% (padrão 10% = `GORDURA_NEGOCIACAO_PADRAO`)
- `ofertaInicialAncoragem = max(0, arredondar(ofertaMaximaSugerida × (1 − g/100)))`

**Veredito** (`calcularVeredito`) — comparações com **FIPE tabela original** (não a “venda realista” da UI):

- Sem FIPE válida → `indefinido`
- `rCusto = custoTotal / fipeReferencia` — se `rCusto >= 0.82` → **arriscado**
- `rVenda = precoVendaSugerido / fipeReferencia` — se `rVenda > 1` → **arriscado**
- Se `rVenda <= 0.9` → **viavel**
- Caso contrário → **atencao**

*(Os rótulos explicativos estão em `motor-viabilidade-ui.ts`.)*

### 4.3 “Venda realista de mercado” e margem vs FIPE no painel — só na UI

Quando `fipeCarregada` e FIPE válida:

1. **Flags de histórico** em `dados_leilao` (varredura recursiva de chaves, `historico-veiculo.ts`) + **merge** com resultados das consultas premium (`mergeFlagsComConsultasPremium`).
2. **Impacto agregado** (soma dos fatores ativos, piso −50%):

| Fator | Peso (sobre 1.0) |
|-------|------------------|
| Leilão | −20% |
| Sinistro | −15% |
| Roubo/furto | −10% |
| Gravame | −5% |

`impactoTotal = max(-0.5, soma dos fatores true)`

3. `ajusteTotalMercadoUi = (ajusteFipePct/100) + impactoTotal`
4. **`vendaRealista = max(0, fipeReferencia × (1 + ajusteTotalMercadoUi))`** → exibida como “Venda realista de mercado” (`baseVenda` arredondado).

**Margem vs referência FIPE (tabela)** no painel inferior:

`margemRealMercadoVsFipePct = ((baseVenda − fipeReferencia) / fipeReferencia) × 100`

Ou seja: essa margem usa **venda realista (FIPE + ajustes UI)**, enquanto o **veredito** usa **`precoVendaSugerido`** (custo × lucro ou venda esperada) vs FIPE — **são conceitos diferentes**.

### 4.4 Cenário pessimista (resumo / barras)

Implementação testável em `src/lib/viabilidade-formulario-calculos.ts` (`calcularCenarioPessimista`).

- **Custo pessimista:** se há risco estrutural (algum flag de histórico/premium) → `custoTotal × 1.05`; senão → `× 1.1`
- **Venda pessimista:** com risco → `baseVenda × 0.95`; senão → `× 0.9`
- **Lucro pessimista** = `vendaPessimista − custoPessimista`; margem % sobre custo pessimista

### 4.5 Comparação pedido × teto

- `deltaNegociacao = precoPedido − ofertaMaximaSugerida`
- Alertas quando pedido > teto (com teto válido)

### 4.6 Alertas de contexto (`constants.ts` + `viabilidade-formulario-calculos.ts`)

- **Lucro elevado:** aviso se `pctLucro > 20%` (`LUCRO_ELEVADO_LIMITE_PCT`) — `isLucroDesejadoElevado`
- **Venda esperada vs FIPE:** `calcularAlertasDesvioVendaEsperadaFipe` — comparação **estrita** aos limiares  
  - acima de +20% da FIPE → alerta (`DESVIO_VENDA_ACIMA_FIPE`)  
  - abaixo de −30% → alerta (`DESVIO_VENDA_ABAIXO_FIPE`)

### 4.7 Limites e padrões numéricos

- Lucro desejado ao persistir: clamp **0…500%** (`viabilidade-actions.ts`)
- Gordura negociação: **0…100%**
- Entrada monetária: até **99.999.999.999,99** em centavos (`MAX_CENTAVOS_MOEDA`)
- Padrão lucro na UI: **15%** (`PCT_PADRAO`)

---

## 5. Persistência (Supabase)

| Tabela | Uso |
|--------|-----|
| `consultas_veiculos` | Cache por placa: dados veículo, FIPE texto, `mes_referencia_fipe`, `aviso_fipe`, `dados_leilao` (JSON), `simulacao_viabilidade` (JSON) |
| `usuario_acesso` | `plano_ativo`, contador mensal FIPE (`fipe_mes_referencia` YYYY-MM UTC, `consultas_fipe_utilizadas`, `consultas_fipe_limite`), `creditos_premium` |
| `fipe_quota_diaria` | Legado / freemium; modelo atual é **mensal** em `usuario_acesso` |

---

## 6. O que é real vs mock

| Item | Estado |
|------|--------|
| Consultar Placa | Real (com env vars); substituível por mock HB20 |
| FIPE Parallelum (`fipe-resolver`) | Real; matching heurístico por marca/modelo/ano |
| Plano / cotas / créditos | Real (Supabase + service role) |
| Consultas premium (leilão etc.) | **API real** Consultar Placa v2 (servidor); **mock** com `NEXT_PUBLIC_USE_MOCKS`; cache 7 dias; timeout 8 s (Netlify Free — ver §7) |
| PIX | **Só UI** |
| Autenticação usuário (login) | **Não** — só UUID anônimo |
| TTL cache 30 dias (veículo) | **`buscarVeiculoAction`** — coluna `atualizado_em` (opcional no DDL; fallback `criado_em`). |
| Testes automatizados | **Vitest** — pasta **`tests/unit/`** (viabilidade, `viabilidade-formulario-calculos`, validações, histórico, consultas premium). Rodar: `npm run test:run`. |

---

## 7. Decisões arquiteturais e débito técnico consciente

### 7.1 Gestão de timeout em consultas premium (limites do Netlify)

- **Contexto:** a API da *Consultar Placa* (em especial *Leilão Prime*) pode recomendar timeout da ordem de **até 300 segundos** por causa do processamento (ex.: imagens). O projeto, porém, está pensado para rodar inicialmente no **Netlify (plano Free)**, onde as *Server Functions* têm *hard limit* de **10 segundos** de execução.
- **Decisão atual (MVP):** adotamos *graceful degradation* (“suicídio controlado”): chamadas HTTP externas no servidor usam `AbortController` com o mesmo teto **`FETCH_TIMEOUT_MS_EXTERNAL` = 8000 ms** (`src/lib/fetch-timeout-ms.ts`) — Consultar Placa básica, premium v2 e FIPE Parallelum. Se a API não responder a tempo, a requisição é cancelada do nosso lado; no premium o crédito **não é debitado**, e a UI pode exibir aviso amigável (sobrecarga / tente de novo).
- **Roadmap para escala:** quando a lentidão da API de leilão virar métrica relevante em produção, a arquitetura deve evoluir para **Netlify Background Functions** (até ~15 minutos de execução), com **rotina de *polling* no front-end** (ex.: consultar o Supabase a cada *X* segundos até o JSON da resposta estar gravado).

---

## 8. Roadmap / backlog sugerido

Priorize conforme negócio; itens não estão ordenados.

- [ ] **Auth real** (Supabase Auth ou outro) e ligar `usuario_acesso` a `user_id` em vez de só UUID local.
- [x] **TTL de cache base (30 dias)** em `veiculo-actions.ts` + `atualizado_em` em `database.sql`.
- [x] **TTL cache premium** (7 dias em `consultas_premium` + hit sem débito).
- [x] **Integração API real** para consultas premium (v2); pendente: **preço dinâmico** e reconciliação fina com rótulos da UI.
- [ ] **Pagamento** (PIX/assinatura) e provisionamento automático de `usuario_acesso`.
- [ ] **Webhook / job** para sincronizar limites e faturamento.
- [x] **Testes unitários (Vitest)** em `tests/unit/` — viabilidade, `viabilidade-formulario-calculos`, `validations`, `historico-veiculo`, `consultas-risco-premium`.
- [ ] **Testes de integração** (actions com Supabase/API mockados) e **E2E** (Playwright) na busca.
- [ ] **RLS endurecida** em produção; revisar política `anon` em `consultas_veiculos`.
- [ ] **Unificar semântica** “margem vs FIPE” vs veredito (documentar na UI se mantiver dois conceitos).
- [ ] **Observabilidade**: logs estruturados, métricas de uso FIPE/premium.
- [ ] **Remover ou isolar** `fipe_quota_diaria` se não for mais usada.

---

## 9. Referência rápida de constantes (código)

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `LIMIAR_CUSTO_PROXIMO_FIPE` | 0.82 | custo/FIPE ≥ isso → arriscado |
| `LIMIAR_VENDA_VIAVEL` | 0.9 | venda/FIPE ≤ isso → viável (com folga) |
| `GORDURA_NEGOCIACAO_PADRAO` | 10 | % entre oferta máx e inicial |
| `AJUSTE_FIPE_PCT_MIN/MAX` | −100 / 100 | slider manual sobre FIPE |

---

*Última revisão alinhada ao repositório em abril/2026.*
