import { syncCompany, listCompanies } from "@/lib/syncCompany";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const companies = await listCompanies();

  const settled = await Promise.allSettled(
    companies.map(co =>
      syncCompany(co.id)
        .then(result => ({ id: co.id, name: co.name, ...result }))
        .catch(e  => ({ id: co.id, name: co.name, error: e.message }))
    )
  );

  const results = settled.map(s => s.value ?? s.reason);

  console.log("sync-cron:", JSON.stringify({ synced_at: new Date().toISOString(), results }));

  return Response.json({
    ok: true,
    synced_at: new Date().toISOString(),
    companies: results,
  });
}
