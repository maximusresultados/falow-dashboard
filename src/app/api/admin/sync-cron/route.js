import { syncCompany, listCompanies } from "@/lib/syncCompany";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const companies = await listCompanies();
  const results   = [];

  for (const co of companies) {
    try {
      const result = await syncCompany(co.id);
      results.push({ id: co.id, name: co.name, ...result });
    } catch (e) {
      results.push({ id: co.id, name: co.name, error: e.message });
    }
  }

  console.log("sync-cron:", JSON.stringify({ synced_at: new Date().toISOString(), results }));

  return Response.json({
    ok: true,
    synced_at: new Date().toISOString(),
    companies: results,
  });
}
