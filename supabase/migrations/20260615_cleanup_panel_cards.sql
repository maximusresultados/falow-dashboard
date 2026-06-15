-- Remove cards órfãos de um painel (cards que existem no Supabase mas não mais no WTS)
CREATE OR REPLACE FUNCTION public.admin_cleanup_panel_cards(
  p_rpc_token    text,
  p_panel_id     int,
  p_external_ids text[]
) RETURNS json
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE v_deleted int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM crm.admin_config WHERE key = 'rpc_token' AND value = p_rpc_token
  ) THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;

  DELETE FROM crm.cards
  WHERE panel_id = p_panel_id
    AND external_id IS NOT NULL
    AND (
      cardinality(p_external_ids) = 0
      OR NOT (external_id::text = ANY(p_external_ids))
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN json_build_object('ok', true, 'deleted', v_deleted);
END;
$$;
