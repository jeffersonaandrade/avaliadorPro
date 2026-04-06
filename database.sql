-- ============================================================================
-- Avaliador PRO — schema de referência (Supabase / PostgreSQL)
-- ============================================================================
--
-- Pode colar o arquivo INTEIRO no SQL Editor mesmo se o projeto já existir:
--   • CREATE TABLE IF NOT EXISTS — não recria tabelas.
--   • ADD COLUMN IF NOT EXISTS — só acrescenta colunas que faltam.
--   • CREATE INDEX IF NOT EXISTS — índices idempotentes.
--
-- Bases novas: execute do início ao fim uma vez.
-- Produção: revise RLS (ex.: política anon em consultas_veiculos é só DEV).
--
-- Manutenção: qualquer tabela/coluna nova usada nas Server Actions ou libs
-- Supabase deve ser adicionada aqui E documentada no README.md (§ Banco de dados).
-- ============================================================================

-- Referência: tabela de cache de consultas veiculares (Avaliador PRO)
-- Execute no SQL Editor do Supabase e ajuste políticas RLS para produção.

CREATE TABLE IF NOT EXISTS public.consultas_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Chave natural do cache (uma linha por placa normalizada)
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER NOT NULL,
  fipe TEXT NOT NULL,
  chassi TEXT,
  cor TEXT,
  combustivel TEXT,
  tipo_veiculo TEXT,
  mes_referencia_fipe TEXT,
  aviso_fipe TEXT,
  dados_leilao JSONB NOT NULL DEFAULT '{}'::jsonb,
  simulacao_viabilidade JSONB,
  -- Atualizado a cada nova consulta válida (TTL de 30 dias usa este campo)
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consultas_veiculos IS 'Cache de consultas por placa; criado_em e atualizado_em marcam refresh (TTL 30 dias no backend).';
COMMENT ON COLUMN public.consultas_veiculos.placa IS 'Placa normalizada (7 caracteres, maiúsculas).';
COMMENT ON COLUMN public.consultas_veiculos.dados_leilao IS 'Payload JSON de leilão/sinistro quando disponível.';

CREATE INDEX IF NOT EXISTS idx_consultas_veiculos_criado_em
  ON public.consultas_veiculos (criado_em DESC);

-- Campos adicionais (identificação + FIPE). Execute se a tabela já existir:
ALTER TABLE public.consultas_veiculos
  ADD COLUMN IF NOT EXISTS chassi TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS combustivel TEXT,
  ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS mes_referencia_fipe TEXT,
  ADD COLUMN IF NOT EXISTS aviso_fipe TEXT;

COMMENT ON COLUMN public.consultas_veiculos.mes_referencia_fipe IS 'Mês de referência retornado pela API FIPE (Parallelum), exibido no badge.';
COMMENT ON COLUMN public.consultas_veiculos.aviso_fipe IS 'Aviso quando não há match FIPE (ex.: versão específica).';
COMMENT ON COLUMN public.consultas_veiculos.simulacao_viabilidade IS 'Última simulação de custos, venda sugerida e veredito (JSON). Campos opcionais percentualLeilao, percentualSinistro, percentualRoubo, percentualGravame (% negativos, ex.: −20) alinham ROI ao `calcularValorEvitarPerdaReais` / auditoria.';

ALTER TABLE public.consultas_veiculos
  ADD COLUMN IF NOT EXISTS simulacao_viabilidade JSONB;

-- TTL do cache base (30 dias): app usa coalesce(atualizado_em, criado_em).
ALTER TABLE public.consultas_veiculos
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.consultas_veiculos.atualizado_em IS 'Última atualização dos dados de veículo/FIPE no cache; se null, o app usa criado_em para o TTL.';

ALTER TABLE public.consultas_veiculos ENABLE ROW LEVEL SECURITY;

-- Exemplo DEV: permite anon ler/escrever (NÃO use em produção sem revisão).
-- Em produção prefira service_role só no servidor ou políticas por usuário autenticado.
CREATE POLICY "consultas_veiculos_anon_all_dev"
  ON public.consultas_veiculos
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Cota diária de resoluções FIPE gratuitas (identificador = UUID no localStorage do navegador).
-- Sem esta tabela, o backend ignora a cota e permite todas as consultas (fallback em código).
CREATE TABLE IF NOT EXISTS public.fipe_quota_diaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador TEXT NOT NULL,
  dia DATE NOT NULL,
  contagem INTEGER NOT NULL DEFAULT 0,
  UNIQUE (identificador, dia)
);

CREATE INDEX IF NOT EXISTS idx_fipe_quota_dia ON public.fipe_quota_diaria (dia DESC);

ALTER TABLE public.fipe_quota_diaria ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fipe_quota_diaria IS 'Contagem de resoluções FIPE por identificador anônimo e dia UTC; escrita via service_role.';

-- ---------------------------------------------------------------------------
-- B2B: acesso por plano, limite mensal de resoluções FIPE e créditos premium
-- (substitui o modelo freemium / cota diária para produção.)
--
-- IMPORTANTE: execute SEMPRE este bloco CREATE TABLE antes de INSERT na
-- usuario_acesso. Se aparecer "relation usuario_acesso does not exist", é
-- porque esta parte ainda não foi rodada no SQL Editor.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuario_acesso (
  identificador TEXT PRIMARY KEY,
  plano_ativo BOOLEAN NOT NULL DEFAULT false,
  consultas_fipe_utilizadas INTEGER NOT NULL DEFAULT 0,
  consultas_fipe_limite INTEGER NOT NULL DEFAULT 100,
  fipe_mes_referencia TEXT NOT NULL DEFAULT '',
  creditos_premium INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.usuario_acesso IS 'Por identificador de cliente (localStorage até auth real): plano, cota FIPE mensal UTC e créditos premium.';
COMMENT ON COLUMN public.usuario_acesso.fipe_mes_referencia IS 'YYYY-MM UTC; ao mudar o mês, o app zera consultas_fipe_utilizadas.';
COMMENT ON COLUMN public.usuario_acesso.creditos_premium IS 'Saldo para blindagem completa (leilão, sinistro, roubo, gravame, Renainf); debitado após gravação bem-sucedida.';

CREATE INDEX IF NOT EXISTS idx_usuario_acesso_atualizado
  ON public.usuario_acesso (atualizado_em DESC);

ALTER TABLE public.usuario_acesso ENABLE ROW LEVEL SECURITY;

-- Auditoria de consultas premium (eventos CONSULTA_*, CACHE_HIT, CREDITO_CONSUMIDO).
-- Escrita via service_role nas Server Actions; RLS conforme sua política.
CREATE TABLE IF NOT EXISTS public.consultas_auditoria_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_id TEXT NOT NULL,
  placa TEXT NOT NULL,
  evento TEXT NOT NULL,
  tipo_consulta TEXT,
  detalhe TEXT,
  valor_evitar_perda NUMERIC(14, 2),
  tipo_risco_detectado TEXT
);

CREATE INDEX IF NOT EXISTS idx_consultas_auditoria_cliente_criado
  ON public.consultas_auditoria_eventos (cliente_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_consultas_auditoria_placa_criado
  ON public.consultas_auditoria_eventos (placa, criado_em DESC);

COMMENT ON TABLE public.consultas_auditoria_eventos IS 'Trail de auditoria: início/sucesso/erro/timeout de consultas premium, cache hit e consumo de crédito.';
COMMENT ON COLUMN public.consultas_auditoria_eventos.valor_evitar_perda IS 'Opcional: valor em R$ associado ao ROI / perda evitada (preenchimento futuro ou job).';
COMMENT ON COLUMN public.consultas_auditoria_eventos.tipo_risco_detectado IS 'Resumo textual dos tipos com indício constatado (ex.: leilao,sinistro).';

ALTER TABLE public.consultas_auditoria_eventos ENABLE ROW LEVEL SECURITY;

-- Reconciliação: correlacionar INICIO → SUCESSO → CRÉDITO na mesma operação.
ALTER TABLE public.consultas_auditoria_eventos
  ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_consultas_auditoria_request_id
  ON public.consultas_auditoria_eventos (request_id)
  WHERE request_id IS NOT NULL AND request_id <> '';

CREATE INDEX IF NOT EXISTS idx_consultas_auditoria_evento_criado
  ON public.consultas_auditoria_eventos (evento, criado_em DESC);

COMMENT ON COLUMN public.consultas_auditoria_eventos.request_id IS 'UUID da operação (mesmo valor em todos os eventos da mesma consulta/blindagem).';

-- ROI confiável vs suspeito (eventos CREDITO_CONSUMIDO); default false = confiável.
ALTER TABLE public.consultas_auditoria_eventos
  ADD COLUMN IF NOT EXISTS persistencia_falhou_apos_debito BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blindagem_persistencia_falhou_apos_debito BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.consultas_auditoria_eventos.persistencia_falhou_apos_debito IS 'Se true em CREDITO_CONSUMIDO: ROI entra em “suspeito” (métricas comerciais devem ignorar).';
COMMENT ON COLUMN public.consultas_auditoria_eventos.blindagem_persistencia_falhou_apos_debito IS 'Se true em CREDITO_CONSUMIDO: idem persistência blindagem.';

-- ---------------------------------------------------------------------------
-- Retenção + métricas mensais (ROI preservado em agregação antes de DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.metricas_mensais_consolidadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  total_consultas INTEGER NOT NULL DEFAULT 0,
  total_creditos INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0,
  total_timeouts INTEGER NOT NULL DEFAULT 0,
  valor_total_protegido NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_metricas_mensais_cliente_mes
  ON public.metricas_mensais_consolidadas (cliente_id, mes_referencia DESC);

COMMENT ON TABLE public.metricas_mensais_consolidadas IS 'Agregação mensal por cliente a partir de consultas_auditoria_eventos; ROI (valor_total_protegido) só soma CREDITO_CONSUMIDO.';
COMMENT ON COLUMN public.metricas_mensais_consolidadas.mes_referencia IS 'YYYY-MM (UTC, alinhado ao to_char do job).';

ALTER TABLE public.metricas_mensais_consolidadas ENABLE ROW LEVEL SECURITY;

/* Uma transação: agrega eventos com criado_em < now()-30d (upsert idempotente);
   aborta se houver grupos na origem e 0 linhas afetadas (anti silent purge);
   só então DELETE leve (INICIO/CACHE_HIT >30d) e DELETE total >90d. */
CREATE OR REPLACE FUNCTION public.auditoria_retencao_executar()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src INTEGER;
  v_ins INTEGER;
  v_del1 INTEGER;
  v_del2 INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*)::int, 0)
  INTO v_src
  FROM (
    SELECT 1
    FROM public.consultas_auditoria_eventos
    WHERE criado_em < (NOW() AT TIME ZONE 'UTC') - INTERVAL '30 days'
    GROUP BY
      cliente_id,
      to_char((criado_em AT TIME ZONE 'UTC'), 'YYYY-MM')
  ) AS grupos;

  INSERT INTO public.metricas_mensais_consolidadas (
    cliente_id,
    mes_referencia,
    total_consultas,
    total_creditos,
    total_erros,
    total_timeouts,
    valor_total_protegido,
    updated_at
  )
  SELECT
    cliente_id,
    to_char((criado_em AT TIME ZONE 'UTC'), 'YYYY-MM') AS mes_ref,
    (COUNT(*) FILTER (WHERE evento = 'CONSULTA_SUCESSO'))::int,
    (COUNT(*) FILTER (WHERE evento = 'CREDITO_CONSUMIDO'))::int,
    (COUNT(*) FILTER (WHERE evento = 'CONSULTA_ERRO'))::int,
    (COUNT(*) FILTER (WHERE evento = 'CONSULTA_TIMEOUT'))::int,
    COALESCE(
      SUM(valor_evitar_perda) FILTER (WHERE evento = 'CREDITO_CONSUMIDO'),
      0
    )::numeric(14, 2),
    (NOW() AT TIME ZONE 'UTC')
  FROM public.consultas_auditoria_eventos
  WHERE criado_em < (NOW() AT TIME ZONE 'UTC') - INTERVAL '30 days'
  GROUP BY
    cliente_id,
    to_char((criado_em AT TIME ZONE 'UTC'), 'YYYY-MM')
  ON CONFLICT (cliente_id, mes_referencia) DO UPDATE SET
    total_consultas = EXCLUDED.total_consultas,
    total_creditos = EXCLUDED.total_creditos,
    total_erros = EXCLUDED.total_erros,
    total_timeouts = EXCLUDED.total_timeouts,
    valor_total_protegido = EXCLUDED.valor_total_protegido,
    updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_ins = ROW_COUNT;

  IF v_src > 0 AND COALESCE(v_ins, 0) = 0 THEN
    RAISE EXCEPTION
      'auditoria_retencao: agregação não aplicou linhas (origem % grupos) — DELETE cancelado',
      v_src;
  END IF;

  DELETE FROM public.consultas_auditoria_eventos
  WHERE evento IN ('CONSULTA_INICIO', 'CACHE_HIT')
    AND criado_em < (NOW() AT TIME ZONE 'UTC') - INTERVAL '30 days';
  GET DIAGNOSTICS v_del1 = ROW_COUNT;

  DELETE FROM public.consultas_auditoria_eventos
  WHERE criado_em < (NOW() AT TIME ZONE 'UTC') - INTERVAL '90 days';
  GET DIAGNOSTICS v_del2 = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'source_distinct_groups', v_src,
    'upsert_row_count', COALESCE(v_ins, 0),
    'deleted_inicio_cache_30d', COALESCE(v_del1, 0),
    'deleted_all_90d', COALESCE(v_del2, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auditoria_retencao_executar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auditoria_retencao_executar() TO service_role;

-- Exemplo DEV: service_role no backend ignora RLS; política abaixo só se usar cliente anon direto na tabela.
-- CREATE POLICY "usuario_acesso_service_only" ON public.usuario_acesso FOR ALL TO service_role USING (true) WITH CHECK (true);
