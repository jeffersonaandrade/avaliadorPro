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

COMMENT ON TABLE public.consultas_veiculos IS 'Cache de consultas por placa; criado_em = última atualização dos dados.';
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

ALTER TABLE public.consultas_veiculos ENABLE ROW LEVEL SECURITY;

-- Exemplo DEV: permite anon ler/escrever (NÃO use em produção sem revisão).
-- Em produção prefira service_role só no servidor ou políticas por usuário autenticado.
CREATE POLICY "consultas_veiculos_anon_all_dev"
  ON public.consultas_veiculos
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
