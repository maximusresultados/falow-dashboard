-- Adiciona campos de mapeamento de etapas WTS por empresa
ALTER TABLE crm.companies
  ADD COLUMN IF NOT EXISTS wts_step_orcamento text,
  ADD COLUMN IF NOT EXISTS wts_step_venda     text;

-- Atualiza get_company_meta_config para retornar os novos campos + api_token + api_base_url
CREATE OR REPLACE FUNCTION public.get_company_meta_config(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',                  c.id,
    'name',                c.name,
    'slug',                c.slug,
    'api_base_url',        c.api_base_url,
    'api_token',           c.api_token,
    'meta_pixel_id',       c.meta_pixel_id,
    'meta_access_token',   c.meta_access_token,
    'webhook_secret',      c.webhook_secret,
    'capi_sources',        c.capi_sources,
    'wts_step_orcamento',  c.wts_step_orcamento,
    'wts_step_venda',      c.wts_step_venda
  )
  INTO v_result
  FROM crm.companies c
  WHERE c.slug = p_slug
    AND c.active = true
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Atualiza admin_get_meta_config para retornar os novos campos
CREATE OR REPLACE FUNCTION public.admin_get_meta_config(
  p_rpc_token  text,
  p_company_id int
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_ok     boolean;
  v_result jsonb;
BEGIN
  SELECT value = p_rpc_token INTO v_ok FROM crm.admin_config WHERE key = 'rpc_token';
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  SELECT jsonb_build_object(
    'meta_pixel_id',      c.meta_pixel_id,
    'meta_access_token',  c.meta_access_token,
    'webhook_secret',     c.webhook_secret,
    'capi_sources',       c.capi_sources,
    'wts_step_orcamento', c.wts_step_orcamento,
    'wts_step_venda',     c.wts_step_venda
  )
  INTO v_result
  FROM crm.companies c
  WHERE c.id = p_company_id;

  RETURN v_result;
END;
$$;

-- Atualiza admin_update_meta_config para gravar os novos campos
CREATE OR REPLACE FUNCTION public.admin_update_meta_config(
  p_rpc_token       text,
  p_company_id      int,
  p_pixel_id        text,
  p_access_token    text,
  p_webhook_secret  text,
  p_sources         text[],
  p_step_orcamento  text DEFAULT NULL,
  p_step_venda      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT value = p_rpc_token INTO v_ok FROM crm.admin_config WHERE key = 'rpc_token';
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;

  UPDATE crm.companies SET
    meta_pixel_id       = p_pixel_id,
    meta_access_token   = p_access_token,
    webhook_secret      = p_webhook_secret,
    capi_sources        = p_sources,
    wts_step_orcamento  = p_step_orcamento,
    wts_step_venda      = p_step_venda
  WHERE id = p_company_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
