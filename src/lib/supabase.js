const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function rpc(fnName, dashboardToken) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ p_token: dashboardToken }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[FalowCRM] RPC ${fnName} HTTP ${res.status}:`, errText);
      return null;
    }

    const raw = await res.json();
    return raw;
  } catch (e) {
    console.error(`[FalowCRM] RPC ${fnName} error:`, e);
    return null;
  }
}

export function parseRpcResponse(raw, fnName) {
  if (raw === null || raw === undefined) return null;
  let data = raw;
  if (Array.isArray(data) && data.length === 1 && data[0]?.[fnName]) data = data[0][fnName];
  if (!Array.isArray(data) && data?.[fnName]) data = data[fnName];
  return data;
}
