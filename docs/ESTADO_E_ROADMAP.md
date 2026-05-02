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
| Formulário de viabilidade | `FormularioViabilidade.tsx` + blocos `DecisionCard`, `RiskConversionBlock`, `RefinementPanel`, `CalculationDetailsAccordion` (decisão → refinamento → memória de cálculo) |
| Motor de viabilidade (puro) | `src/lib/viabilidade.ts` |
| Ajustes de mercado na UI (FIPE + histórico) | `src/components/formulario-viabilidade/FormularioViabilidade.tsx`, `historico-veiculo.ts` |
| Placa + cache + FIPE | `src/actions/veiculo-actions.ts`, `src/lib/consultar-placa.ts` (`/v2/consultarPrecoFipe`), `src/lib/fetch-timeout-ms.ts` (8s, Netlify Free) |
| Plano / limite FIPE / créditos | `src/lib/usuario-acesso.ts`, `src/actions/acesso-actions.ts` |
| Salvar simulação | `src/actions/viabilidade-actions.ts` |
| Consultas premium | `src/actions/consultas-risco-actions.ts`, `src/lib/consultas-risco-premium.ts`, `src/lib/consultar-placa-premium-v2.ts` |
| Admin / auditoria / antifraude (buffer memória) | `src/app/admin/page.tsx`, `src/lib/consulta-audit-log.ts`, `src/lib/premium-security.ts`, `src/lib/premium-kill-switch.ts`, `src/actions/admin-actions.ts` |
| **Reconciliação financeira (auditoria Supabase)** | `src/app/admin/reconciliacao/page.tsx`, `src/actions/reconciliacao-actions.ts`, `src/lib/reconciliacao-auditoria.ts`, `src/lib/reconciliacao-persistencia.ts` — leitura de `consultas_auditoria_eventos` (KPIs C/D/E, timeline, agrupamento por `request_id`, checagem opcional vs. `consultas_veiculos`). Coluna `request_id` e índices em `database.sql`. |
| **Retenção auditoria + ROI consolidado** | `database.sql`: `metricas_mensais_consolidadas`, RPC `auditoria_retencao_executar()` (transação: UPSERT mensal, anti–silent purge, DELETE INICIO/CACHE após 30d, DELETE geral após 90d). `auditoria-retencao.ts`, `/api/cron/retencao-auditoria`, `instrumentation.ts` opcional. |
| Schema Supabase | `database.sql` |
| Identificação anônima | `localStorage` `avaliadorPro_client_id` — `src/lib/client-id.ts` |

---

## 3. Fluxos implementados

### 3.1 Identificação e acesso

- Cada navegador tem um **UUID** em `localStorage`; o backend usa o mesmo valor como `identificador` em `usuario_acesso`.
- **`getEstadoAcessoAction`**: lê plano, créditos premium, uso/limite FIPE do mês (UTC), vigência de assinatura (`assinaturas`) quando aplicável.
- **Assinaturas** (`assinaturas`, `src/lib/assinaturas.ts`): fonte de verdade do plano pago; `usuario_acesso` mantém consumo e limites sincronizados em `ativarPlanoUsuario`. Legacy: `AVALIADOR_LEGACY_ACESSO_SEM_ASSINATURA` (default `true`) ainda permite gate só por `usuario_acesso` até migração.
- **`AVALIADOR_DEV_ACESSO_TOTAL=true`** (só servidor/local): ignora Supabase e simula plano ativo e limites altos.
- Sem `plano_ativo` na linha do cliente: **overlay** na home e no formulário; não chama APIs pagas de análise de veículo de forma útil (validação no `buscarVeiculoAction`).

### 3.2 Busca por placa (`buscarVeiculoAction`)

1. Valida placa (`placaSchema` — Mercosul e antiga).
2. Exige `identificadorCliente` e **`plano_ativo`**.
3. Se existe linha em **`consultas_veiculos`** para a placa → devolve **cache** (sem novo consumo de API de placa).
4. Senão:
   - Se `NEXT_PUBLIC_USE_MOCKS=true` → dados básicos **perfil sandbox** (padrão HB20 em `dadosBasicosSandbox`, sobrescrevível por `AVALIADOR_MOCKS_SANDBOX_*`; sem Consultar Placa).
   - Senão → **Consultar Placa** (API paga).
5. **Resolução FIPE** (`consultarPrecoFipePorPlaca`): com plano ativo, **só** chama a API se houver cota inclusa **ou** `saldo_pre_pago` ≥ custo do excedente (`podeResolverPrecoFipeComFundos` / `consumo-plano.ts`); caso contrário retorna erro antes da resolução (reutilização de FIPE da linha anterior não exige novo custo). A consulta usa **Consultar Placa v2** (`GET /consultarPrecoFipe?placa=`), salva valor + mês de referência e histórico (`historico_fipe_12m`) em `dados_leilao`. Após **match válido** + upsert: dentro da cota → incrementa **`consultas_fipe_utilizadas`** e `FIPE_CONSUMIDO`; fora da cota → debita **`saldo_pre_pago`**, incrementa **`consultas_excedentes`** e **`valor_total_excedente`** (total debitado no mês), auditoria `FIPE_EXCEDENTE_CONSUMIDO`. Sem match → `aviso_fipe`; valor FIPE pode ficar `"—"`.
6. **Upsert** em `consultas_veiculos` com `dados_leilao` (metadados + futuro histórico).

**Nota:** o cache base em `buscarVeiculoAction` usa **TTL de 30 dias** com `coalesce(atualizado_em, criado_em)`. Cache expirado refaz API/mock, faz upsert com `atualizado_em`/`criado_em` atuais, **preserva** `dados_leilao.consultas_premium` e `simulacao_viabilidade`. É necessário aplicar no Supabase o `ALTER` de `atualizado_em` em `database.sql` se a coluna ainda não existir.

### 3.3 Formulário de viabilidade

- Campos monetários em **centavos** na UI (máscara tipo caixa).
- **Auto-save** com debounce (`DEBOUNCE_MS` = 700 ms) via `salvarSimulacaoViabilidadeAction`, desde que plano ativo.
- Toggle **“incluir referência FIPE na decisão”** (`fipeCarregada`): quando ligado e FIPE válida na consulta, calcula teto, oferta inicial e veredito; quando desligado, persiste só simulação base (sem contexto FIPE no JSON salvo).
- **Exportar relatório PDF** (`ExportReportButton`, `export-pdf.ts`, `TemplateRelatorioPdf`): geração vetorial com `@react-pdf/renderer` (texto selecionável). O painel continua exibindo `RelatorioAnalisePdf` na tela; o download usa os mesmos dados via props. Placa demo ou `sandboxAtivo` → aviso “dados simulados” no relatório.

### 3.4 Consultas premium (risco) — blindagem completa

- Tipos persistidos: leilão, sinistro, roubo/furto, gravame, Renainf (`consultas-risco-premium.ts`).
- **Um crédito** ativa os **cinco** de uma vez para **aquela placa** (`ativarBlindagemCompletaAction`). Com todos os blocos **dentro do TTL de 7 dias** em `dados_leilao.consultas_premium`, **não há nova cobrança** nem chamada à API (`blindagemCompletaJaAtiva` + `consultaPremiumTipoFrescaNoBloco`).
- Exige análise da placa em `consultas_veiculos`, plano ativo e **`creditos_premium >= 1`** (em modo mock `NEXT_PUBLIC_USE_MOCKS=true` o crédito não é exigido nem debitado).
- Hit por tipo com **TTL de 7 dias** no fluxo por tipo e no pacote completo (tipos já frescos são pulados no loop da blindagem).
- Produção: **Consultar Placa v2** (`src/lib/consultar-placa-premium-v2.ts`, `consultas-risco-actions.ts`) — **Bearer** `API_CONSULTAR_PLACA_TOKEN` (opcional) ou **Basic** `CONSULTAR_PLACA_API_EMAIL` + `CONSULTAR_PLACA_API_KEY` (mesmo par do `/v2/consultarPlaca`). Timeout **8 s** para rotas premium (Renainf e demais); Leilão Prime usa o mesmo padrão, com **`LEILAO_PRIME_FETCH_TIMEOUT_MS`** opcional para ambientes que permitam esperas longas (a API pode recomendar ~300 s). Retry em rede (500 ms). Parsers e dossiê: `src/lib/api-v2/parsers.ts` — Leilão Prime mapeia classificação, `registro_leiloes`, sinistros/acidentes, parecer técnico, remarketing, danos e peças (IA) conforme a documentação do endpoint (`dossie` em `consultas_premium.leilao`; `evidencias_renainf` espelha Renainf para legado/PDF). Resumo `possui_registro: indisponível` não marca risco constatado; a mensagem ao usuário indica indisponibilidade na fonte.
- **Renainf — débitos por infrações (doc. oficial):** `GET https://api.consultarplaca.com.br/v2/consultarRegistrosInfracoesRenainf?placa=`. Corpo `dados.registro_debitos_por_infracoes_renainf.infracoes_renainf`: `possui_infracoes` (`sim` | `nao` | `indisponivel` — `indisponivel` com resumo dedicado na normalização), `infracoes[]` com `dados_infracao` (incl. `tipo_auto_infracao`), `aplicacao` (ex. `unidade_medida`, limites e medições) e `eventos` (datas). **Regra do provedor:** só infrações em aberto no órgão autuador ou já executadas (multa emitida); confirmação de pagamento junto ao órgão. `parsearRenainfDossie` → dossiê `kind: renainf`; `BlocoRenainf` + `renainfLinhas` / seção débitos no PDF.
- **Gravame (doc. oficial):** `GET https://api.consultarplaca.com.br/v2/consultarGravame?placa=`. Corpo `dados.gravame`: `possui_gravame` = `sim` | `nao` | `indisponivel`; `registro` objeto (agente financeiro CNPJ/nome, `data_registro`, `situacao`, e quando consta também `placa`, `chassi`, `uf_placa` do veículo no registro) ou `null`. Resumo `indisponivel` distingue de “sem registro ativo”. Dossiê: `parsearGravameDossie` → persistência `kind: gravame` com `registro_placa` / `registro_chassi` / `registro_uf_placa`; UI `BlocoGravame` e `gravameLinhas` no PDF.
- **Sinistro perda total (doc. oficial):** `GET https://api.consultarplaca.com.br/v2/consultarSinistroComPerdaTotal?placa=`. Corpo `dados.registro_sinistro_com_perda_total`: `possui_registro` = `sim` | `nao` | `indisponivel`; `registro` = string (ex. `"CONSTA INDENIZAÇÃO INTEGRAL"` quando `sim`, vazio quando `nao`/`indisponivel`). Dossiê persistido: `{ kind: "sinistro", registro }` (`serializarDossieParaPersistencia`); UI/PDF: texto do registro em `BlocoSinistro` / `sinistroLinhas`.
- **Roubo/furto (doc. oficial):** `GET https://api.consultarplaca.com.br/v2/consultarHistoricoRouboFurto?placa=` (Mercosul ou antiga). Corpo `dados.historico_roubo_furto.registros_roubo_furto`: `possui_registro` = `sim` | `nao` | `indisponivel` (no app, só `sim` vira “constatado” — `constatadoTriStateConsultaPlaca`); `registros` = array de itens com `boletim_ocorrencia`, `data_boletim_ocorrencia`, `tipo_ocorrencia`, `uf_ocorrencia`. `PATHS_PREMIUM_V2.roubo_furto` e `estruturaMinimaPorTipo`/`parsearRouboFurtoDossie` seguem esse contrato.
- Placa **`AAA0000`**: placa de teste do provedor Consultar Placa; com **Bearer ou email+key** configurados, as consultas premium chamam a **API v2** e o dossiê/PDF refletem a resposta real (sem JSON mockado no repositório). Sem nenhuma dessas credenciais e com `NEXT_PUBLIC_USE_MOCKS=true`, premium usa só o mock determinístico leve (`mockConsultarRiscoApiDeterministico`).
- `NEXT_PUBLIC_USE_MOCKS=true` **e sem** Bearer nem `CONSULTAR_PLACA_API_EMAIL`+`KEY`: premium em mock determinístico (todas as placas); **sem débito** de crédito.
- Preço por unidade de crédito por plano: `planos-marketing.ts` (`precoCreditoPremiumAvulso`); página **`/creditos`** (autenticada como o painel).

### 3.5 PIX / histórico premium (UI)

- Modal único de blindagem com chave mock (`PIX_CHAVE_MOCK`); fluxo apenas para UX até integração real. Sem preço “picado” por tipo na UI.

### 3.6 Centro de comando (`/admin`) e proteção premium

- **Kill switch:** `PREMIUM_API_KILL_SWITCH=true` ou toggle em memória (somente com `NEXT_PUBLIC_USE_MOCKS=true` via `alternarKillSwitchPremiumDemoAction`) bloqueia `consultarRiscoPremiumAction` e `ativarBlindagemCompletaAction` em modo real.
- **Rate limit (por usuário, em memória):** até 5 consultas premium por minuto; acima de 20 na hora → cooldown de 30 minutos. **Blindagem completa** consome **uma** tentativa de rate limit por ativação (não uma por tipo). **Anti-enumeração:** três placas no padrão antigo sequencial (ex.: AAA0001, AAA0002, AAA0003) → bloqueio ~1 h para auditoria. Em **modo demo público** as checagens são desligadas (`isPublicDemoMocksMode`).
- **Ordem financeira (produção):** após sucesso da API v2 → **débito de crédito** → **persistência** em `consultas_veiculos`. Falhas geram logs `[INCONSISTENCIA_FINANCEIRA]` no servidor.
- **Auditoria:** buffer circular em memória (`consulta-audit-log.ts`) + persistência opcional em **`consultas_auditoria_eventos`** no Supabase (`consulta-audit-supabase.ts`, script em `database.sql`): eventos `CONSULTA_INICIO`, `CONSULTA_SUCESSO`, `CONSULTA_ERRO`, `CONSULTA_TIMEOUT`, `CACHE_HIT`, `API_CALL` (HTTP externo após resposta), `CREDITO_CONSUMIDO`, `FIPE_*` e campos `tipo_risco_detectado` / `valor_evitar_perda` / flags de persistência pós-débito (`persistencia_falhou_apos_debito` quando débito ocorreu e gravação falhou). **ROI comercial:** banner e somas “valor protegido” usam só `CREDITO_CONSUMIDO` **confiável**; o admin `/admin/reconciliacao` exibe também ROI **em verificação** (suspeito). KPIs “ao vivo” no admin somam o buffer; em demo a UI usa mocks + dois alertas simulados de uso suspeito.

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

**Oferta máxima sugerida** (`calcularFaixaNegociacao`) — âncora = **venda realista** (no painel: FIPE × (1 + ajuste manual + impacto risco); sem esse dado no servidor: `fipeParaNegociacao`):

- `ofertaMaximaSugerida = max(0, arredondar(vendaRealista / (1 + pctLucro/100) − custosFixos))`
- `custosFixos` = reparos + transporte + documentação + **multasDebitosManual** + outros

**Oferta inicial (ancoragem)**:

- `g = pctGorduraNegociacao` limitado a 0…100% (padrão 10% = `GORDURA_NEGOCIACAO_PADRAO`)
- `ofertaInicialAncoragem = max(0, arredondar(ofertaMaximaSugerida × (1 − g/100)))`

**Multas**: valor **manual** (`multasDebitosManual` no formulário); não há desconto automático de Renainf no teto.

**Margem real projetada** (`calcularLucroEMargemProjecao`):

- `lucroProjetado = vendaRealista − precoPedido − reparos − documentação − multas − transporte − outros`
- `margemRealProjecaoPct = (lucroProjetado / (precoPedido + reparos + documentação)) × 100` quando o denominador > 0

**Veredito (semáforo)** — `vereditoPorMargemRealProjecao(margemRealProjecaoPct)`:

- &lt; 5% ou prejuízo → **arriscado**
- 5% … 15% → **atencao**
- &gt; 15% → **viavel**

As cores 🔴🟡🟢 só aparecem quando `vereditoDadosCompletosParaSemaforo` é verdadeiro: contexto FIPE na decisão, venda realista &gt; 0, **preço de compra** &gt; 0 e todos os custos operacionais (reparos, transporte, documentação, multas, outros) finitos e ≥ 0, além de lucro % válido.

A função `calcularVeredito` (FIPE vs custo/venda da simulação base) permanece no código para referência legada; o painel e o PDF usam o semáforo por margem.

*(Rótulos em `motor-viabilidade-ui.ts` e `VereditoViabilidade.tsx`.)*

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

Na UI (**Ajustar estratégia → Impactos de histórico**), Leilão / Sinistro / Roubo / Gravame podem ser editados em % (padrão −20, −15, −10, −5); Renainf segue 0% na FIPE (multas entram no campo manual).

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
| FIPE Consultar Placa (`/v2/consultarPrecoFipe`) | Real; consulta por placa (com histórico) |
| Plano / cotas / créditos | Real (Supabase + service role) |
| Consultas premium (leilão etc.) | **API real** Consultar Placa v2 (servidor); **mock** com `NEXT_PUBLIC_USE_MOCKS`; cache 7 dias; timeout **8 s** em todas as rotas premium usadas no app (`fetch-timeout-ms.ts`, alinhado ao Netlify Free) |
| PIX | **Só UI** |
| Autenticação usuário (login) | **Não** — só UUID anônimo |
| TTL cache 30 dias (veículo) | **`buscarVeiculoAction`** — coluna `atualizado_em` (opcional no DDL; fallback `criado_em`). |
| Testes automatizados | **Vitest** — pasta **`tests/unit/`** (viabilidade, `viabilidade-formulario-calculos`, validações, histórico, consultas premium). Rodar: `npm run test:run`. |

---

## 7. Decisões arquiteturais e débito técnico consciente

### 7.1 Gestão de timeout em consultas premium (limites do Netlify)

- **Contexto:** a API da *Consultar Placa* (em especial *Leilão Prime*) pode recomendar timeout da ordem de **até 300 segundos** por causa do processamento (ex.: imagens). O projeto, porém, está pensado para rodar inicialmente no **Netlify (plano Free)**, onde as *Server Functions* têm *hard limit* de **10 segundos** de execução.
- **Decisão atual (MVP):** *graceful degradation*: **`FETCH_TIMEOUT_MS_EXTERNAL` = 8000 ms** para Consultar Placa básica, **todas** as rotas premium v2 (inclui Leilão Prime e Renainf) e FIPE (`/v2/consultarPrecoFipe`). A API de leilão pode recomendar esperas maiores; no Netlify Free priorizamos não estourar o teto da função — se a API não responder a tempo, cancelamos do nosso lado, **não debitamos crédito** e a UI exibe aviso amigável. Para leilão confiável em produção, avaliar *background jobs* ou hospedagem com funções longas (ver roadmap abaixo).
- **Roadmap para escala:** quando a lentidão da API de leilão virar métrica relevante em produção, a arquitetura deve evoluir para **Netlify Background Functions** (até ~15 minutos de execução), com **rotina de *polling* no front-end** (ex.: consultar o Supabase a cada *X* segundos até o JSON da resposta estar gravado).

### 7.2 Plano de evolução (timeouts premium — decisão futura)

- **Curto prazo (atual):** timeout único de **8 s** em todas as rotas premium no servidor, para caber no teto do Netlify Free; aceita-se maior taxa de timeout no **Leilão Prime** até haver infraestrutura adequada.
- **Médio prazo:** fila assíncrona (job + webhook ou polling): cliente dispara blindagem → worker com **5–15 min** → grava `consultas_veiculos` → UI notifica; crédito continua **só após sucesso da API**, antes da persistência.
- **Alternativa:** hospedar **API Routes** / Edge em provedor com limite de execução alto (VPS, Fly.io, AWS Lambda com timeout estendido) **só** para Leilão Prime, mantendo o restante em 8 s.
- **Métrica de gatilho:** quando **timeout de leilão** > *X*% das tentativas pagas em 7 dias, priorizar a fila assíncrona ou o endpoint dedicado.

### 7.3 KPI `valor_evitar_perda` (produto)

- **Fonte única:** `src/lib/valor-evitar-perda.ts` — `calcularValorEvitarPerdaReais` (FIPE × ajuste de mercado vs. FIPE × (ajuste + impacto de risco)). Renainf segue o fator padrão da UI; leilão/sinistro/roubo/gravame usam **`percentualLeilao` / `percentualSinistro` / `percentualRoubo` / `percentualGravame`** em `simulacao_viabilidade` quando existirem; senão, os mesmos decimais de `FATORES_RISCO` (`historico-veiculo.ts`).
- **Persistência dos %:** o auto-save (`salvarSimulacaoViabilidadeAction`) grava sempre os quatro percentuais (com fallback aos padrões). A UI e o PDF usam o **mesmo** cálculo (`FormularioViabilidade` + `RelatorioAnalisePdf` via `perdaHistoricoReais`), sem fórmula paralela no React.
- **Débito premium:** uma variável `valorEvitarPerda` por fluxo alimenta `CREDITO_CONSUMIDO` e o retorno das actions (`valorEvitarPerdaReais` em `consultarRiscoPremiumAction` / `ativarBlindagemCompletaAction`).
- Persistido em `consultas_auditoria_eventos.valor_evitar_perda` nos eventos **`CREDITO_CONSUMIDO`** (soma mensal: `obterValorProtegidoMesAction` / banner “valor protegido este mês”).

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
- [ ] **PRD — RLS em `consultas_veiculos` (bloqueador de segurança):** a política **`consultas_veiculos_anon_all_dev`** (`database.sql`) dá a `anon` leitura/escrita total (`USING/WITH CHECK true`) — **OK só em DEV/MVP**. Antes de produção: **remover ou substituir** por uma destas linhas (definir com produto):
  - **Recomendado:** sem acesso `anon` direto à tabela; **apenas `service_role`** nas Server Actions (cliente nunca fala com a tabela no browser).
  - **Alternativa:** `TO authenticated` com `USING` / `WITH CHECK` alinhados ao dono do registro (ex. `auth.uid()` mapeado ao cliente), se o app passar a usar Supabase Auth no cliente para cache.
  - **Maturidade extra:** políticas diferentes por ambiente (SQL de deploy PROD vs script local DEV), para não depender de “sorte” ao colar `database.sql`.
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
