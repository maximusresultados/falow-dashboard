const ADMIN_SECRET   = process.env.ADMIN_SECRET;
const ADMIN_RPC_TOKEN = process.env.ADMIN_RPC_TOKEN;
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function callRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (Array.isArray(data) && data.length === 1 && data[0]?.[fn]) return data[0][fn];
  if (!Array.isArray(data) && data?.[fn]) return data[fn];
  return data;
}

function auth(request) {
  return request.headers.get("x-admin-key") === ADMIN_SECRET;
}

export async function GET(request) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const data = await callRpc("admin_list_companies", { p_rpc_token: ADMIN_RPC_TOKEN });
  return Response.json(data);
}

export async function POST(request) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { name, slug, api_base_url, api_token } = await request.json();
  const data = await callRpc("admin_create_company", {
    p_rpc_token: ADMIN_RPC_TOKEN,
    p_name: name,
    p_slug: slug,
    p_api_base_url: api_base_url,
    p_api_token: api_token,
  });
  return Response.json(data);
}
