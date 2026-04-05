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
COMMENT ON COLUMN public.consultas_veiculos.simulacao_viabilidade IS 'Última simulação de custos, venda sugerida e veredito (JSON).';

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

-- Exemplo DEV: service_role no backend ignora RLS; política abaixo só se usar cliente anon direto na tabela.
-- CREATE POLICY "usuario_acesso_service_only" ON public.usuario_acesso FOR ALL TO service_role USING (true) WITH CHECK (true);
