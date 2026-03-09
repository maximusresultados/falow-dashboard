const ADMIN_SECRET    = process.env.ADMIN_SECRET;
const ADMIN_RPC_TOKEN = process.env.ADMIN_RPC_TOKEN;
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function auth(request) {
  return request.headers.get("x-admin-key") === ADMIN_SECRET;
}

async function callRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (Array.isArray(data) && data.length === 1 && data[0]?.[fn]) return data[0][fn];
  if (!Array.isArray(data) && data?.[fn]) return data[fn];
  return data;
}

// GET /api/admin/meta/[company_id]
// Retorna config Meta + últimos 20 logs da empresa
export async function GET(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const company_id = Number(params.company_id);

  const [config, logs] = await Promise.all([
    callRpc("admin_get_meta_config",   { p_rpc_token: ADMIN_RPC_TOKEN, p_company_id: company_id }),
    callRpc("admin_list_capi_logs",    { p_rpc_token: ADMIN_RPC_TOKEN, p_company_id: company_id, p_limit: 20 }),
  ]);

  return Response.json({ config, logs });
}

// PUT /api/admin/meta/[company_id]
// Salva/atualiza config Meta da empresa
export async function PUT(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const company_id = Number(params.company_id);
  const { meta_pixel_id, meta_access_token, webhook_secret, capi_sources } = await request.json();

  const data = await callRpc("admin_update_meta_config", {
    p_rpc_token:      ADMIN_RPC_TOKEN,
    p_company_id:     company_id,
    p_pixel_id:       meta_pixel_id,
    p_access_token:   meta_access_token,
    p_webhook_secret: webhook_secret,
    p_sources:        capi_sources ?? ["website", "whatsapp"],
  });

  return Response.json(data);
}
