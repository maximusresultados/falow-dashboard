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

// PUT /api/admin/companies/[company_id]
export async function PUT(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const company_id = Number(params.company_id);
  const { name, slug, api_base_url, api_token } = await request.json();

  const data = await callRpc("admin_update_company", {
    p_rpc_token:    ADMIN_RPC_TOKEN,
    p_company_id:   company_id,
    p_name:         name        || null,
    p_slug:         slug        || null,
    p_api_base_url: api_base_url || null,
    p_api_token:    api_token   || null,
  });

  return Response.json(data);
}
