import { syncCompany } from "@/lib/syncCompany";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getCompanyId(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_dashboard_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ p_token: token }),
  });
  const data = await res.json();
  return typeof data === "number" ? data : (data?.company_id ?? null);
}

export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) return Response.json({ error: "token_required" }, { status: 400 });

    const companyId = await getCompanyId(token);
    if (!companyId) return Response.json({ error: "token_invalido" }, { status: 401 });

    const result = await syncCompany(companyId);
    if (result.error) return Response.json(result, { status: 400 });

    return Response.json(result);
  } catch (e) {
    console.error("sync error:", e);
    return Response.json({ error: "internal_error", detail: e.message }, { status: 500 });
  }
}
