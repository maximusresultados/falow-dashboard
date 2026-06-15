-- Corrige dashboard_ranking: ganhos/perdidos filtrados por updated_at
-- (quando o card foi movido para etapa final) em vez de created_at
-- (quando o card foi criado). Isso faz os ganhos do período refletirem
-- quando a venda foi fechada, não quando o lead entrou no pipeline.
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

        -- ganhos: cards movidos para etapa de vitória no período (por updated_at)
        COUNT(*) FILTER (
          WHERE c.step_phase = 'FINAL'
            AND c.step_title NOT ILIKE '%perd%'
            AND c.updated_at >= v_start
        ) AS ganhos,

        -- perdidos: cards movidos para etapa de perda no período (por updated_at)
        COUNT(*) FILTER (
          WHERE c.step_phase = 'FINAL'
            AND c.step_title ILIKE '%perd%'
            AND c.updated_at >= v_start
        ) AS perdidos,

        -- receita: valor dos ganhos no período
        COALESCE(SUM(c.monetary_amount) FILTER (
          WHERE c.step_phase = 'FINAL'
            AND c.step_title NOT ILIKE '%perd%'
            AND c.updated_at >= v_start
        ), 0) AS receita,

        -- taxa: ganhos / (ganhos + perdidos) no período
        ROUND(
          100.0
          * COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.step_title NOT ILIKE '%perd%' AND c.updated_at >= v_start)
          / NULLIF(COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.updated_at >= v_start), 0),
          1
        ) AS taxa

      FROM crm.cards c
      JOIN crm.panels p ON c.panel_id = p.id
      WHERE c.company_id = v_company_id
        AND NOT c.archived
        AND c.responsible_user_name IS NOT NULL
        AND p.title != 'Minhas tarefas'
        AND (p_panel IS NULL OR p.title = p_panel)
        AND (
          c.created_at >= v_start
          OR (c.step_phase = 'FINAL' AND c.updated_at >= v_start)
        )
      GROUP BY c.responsible_user_name
      HAVING
        COUNT(*) FILTER (WHERE c.created_at >= v_start) > 0
        OR COUNT(*) FILTER (WHERE c.step_phase = 'FINAL' AND c.updated_at >= v_start) > 0
    ) row
  );
END;
$$;
