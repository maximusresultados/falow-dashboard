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

// GET /api/admin/receita/[company_id]
// Retorna etapas finais disponíveis + receita_steps configurados
export async function GET(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const company_id = Number(params.company_id);
  const data = await callRpc("admin_list_final_steps", {
    p_rpc_token: ADMIN_RPC_TOKEN,
    p_company_id: company_id,
  });
  return Response.json(data);
}

// PUT /api/admin/receita/[company_id]
// Salva receita_steps da empresa
export async function PUT(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const company_id = Number(params.company_id);
  const { receita_steps } = await request.json();
  const data = await callRpc("admin_update_receita_steps", {
    p_rpc_token:  ADMIN_RPC_TOKEN,
    p_company_id: company_id,
    p_steps:      receita_steps ?? [],
  });
  return Response.json(data);
}
