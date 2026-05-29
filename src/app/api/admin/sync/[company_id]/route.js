import { syncCompany } from "@/lib/syncCompany";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function auth(request) {
  return request.headers.get("x-admin-key") === ADMIN_SECRET;
}

export async function POST(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const companyId = parseInt(params.company_id, 10);
    const result = await syncCompany(companyId);

    if (result.error === "company_not_found") return Response.json(result, { status: 404 });
    if (result.error === "no_api_token")      return Response.json(result, { status: 400 });
    if (result.error === "wts_panels_failed") return Response.json(result, { status: 502 });

    return Response.json(result);
  } catch (e) {
    console.error("sync error:", e);
    return Response.json({ error: "internal_error", detail: e.message }, { status: 500 });
  }
}
