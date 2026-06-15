-- Adiciona won_at em crm.cards: data em que o card entrou na etapa de vitória
ALTER TABLE crm.cards ADD COLUMN IF NOT EXISTS won_at timestamptz;

-- Backfill: cards já em etapa de vitória recebem won_at = updated_at
UPDATE crm.cards
SET won_at = updated_at
WHERE step_phase = 'FINAL'
  AND step_title NOT ILIKE '%perd%'
  AND won_at IS NULL
  AND updated_at IS NOT NULL;

-- RPC chamada após cada sync para manter won_at consistente
CREATE OR REPLACE FUNCTION public.admin_update_won_at(
  p_rpc_token  text,
  p_company_id int
) RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM crm.admin_config WHERE key = 'rpc_token' AND value = p_rpc_token
  ) THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;

  -- Seta won_at na primeira vez que o card entra em vitória (não sobrescreve)
  UPDATE crm.cards
  SET won_at = COALESCE(won_at, updated_at)
  WHERE company_id  = p_company_id
    AND step_phase  = 'FINAL'
    AND step_title NOT ILIKE '%perd%';

  -- Limpa won_at se o card saiu da etapa de vitória
  UPDATE crm.cards
  SET won_at = NULL
  WHERE company_id = p_company_id
    AND (step_phase IS NULL OR step_phase != 'FINAL' OR step_title ILIKE '%perd%');

  RETURN json_build_object('ok', true);
END;
$$;

-- Atualiza dashboard_ranking para usar won_at e incluir detalhes por venda
DROP FUNCTION IF EXISTS public.dashboard_ranking(text, text, text);

CREATE OR REPLACE FUNCTION public.dashboard_ranking(
  p_token  text,
  p_panel  text DEFAULT NULL,
  p_period text DEFAULT 'mes'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id int;
  v_start      timestamptz;
BEGIN
  SELECT company_id INTO v_company_id
  FROM crm.dashboard_tokens
  WHERE token = p_token AND active = true
  LIMIT 1;
  IF v_company_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  v_start := CASE p_period
    WHEN 'dia'    THEN date_trunc('day',   now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    WHEN 'semana' THEN date_trunc('week',  now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    WHEN 'mes'    THEN date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    WHEN 'ano'    THEN date_trunc('year',  now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    ELSE               date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
  END;

  RETURN (
    SELECT COALESCE(jsonb_agg(row ORDER BY receita DESC NULLS LAST, ganhos DESC, total DESC), '[]'::jsonb)
    FROM (
      SELECT
        c.responsible_user_name AS responsavel,

        -- total: cards criados no período
        COUNT(*) FILTER (WHERE c.created_at >= v_start) AS total,

        -- ganhos: cards cuja data de venda (won_at) está no período
        COUNT(*) FILTER (
          WHERE c.step_phase = 'FINAL'
            AND c.step_title NOT ILIKE '%perd%'
            AND c.won_at >= v_start
        ) AS ganhos,

        -- perdidos: por updated_at (não temos lost_at ainda)
        COUNT(*) FILTER (
          WHERE c.step_phase = 'FINAL'
            AND c.step_title ILIKE '%perd%'
            AND c.updated_at >= v_start
        ) AS perdidos,

        -- receita: valor dos ganhos no período
        COALESCE(SUM(c.monetary_amount) FILTER (
          WHERE c.step_phase = 'FINAL'
            AND c.step_title NOT ILIKE '%perd%'
            AND c.won_at >= v_start
        ), 0) AS receita,

        -- taxa: ganhos / (ganhos + perdidos) no período
        ROUND(
          100.0
          * COUNT(*) FILTER (
              WHERE c.step_phase = 'FINAL' AND c.step_title NOT ILIKE '%perd%' AND c.won_at >= v_start
            )
          / NULLIF(
              COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.step_title NOT ILIKE '%perd%' AND c.won_at >= v_start)
              + COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.step_title ILIKE '%perd%' AND c.updated_at >= v_start),
              0
            ),
          1
        ) AS taxa,

        -- detalhe dos ganhos: lista ordenada pela data da venda
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'title',  c.title,
              'valor',  c.monetary_amount,
              'won_at', to_char(c.won_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
            ) ORDER BY c.won_at DESC
          ) FILTER (
            WHERE c.step_phase = 'FINAL'
              AND c.step_title NOT ILIKE '%perd%'
              AND c.won_at >= v_start
          ),
          '[]'::jsonb
        ) AS ganhos_detalhe

      FROM crm.cards c
      JOIN crm.panels p ON c.panel_id = p.id
      WHERE c.company_id = v_company_id
        AND NOT c.archived
        AND c.responsible_user_name IS NOT NULL
        AND p.title != 'Minhas tarefas'
        AND (p_panel IS NULL OR p.title = p_panel)
        AND (
          c.created_at >= v_start
          OR (c.step_phase = 'FINAL' AND c.won_at  >= v_start)
          OR (c.step_phase = 'FINAL' AND c.updated_at >= v_start)
        )
      GROUP BY c.responsible_user_name
      HAVING
        COUNT(*) FILTER (WHERE c.created_at >= v_start) > 0
        OR COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.won_at >= v_start) > 0
        OR COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.updated_at >= v_start) > 0
    ) row
  );
END;
$$;
