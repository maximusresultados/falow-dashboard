import { verifyHmac }   from "@/lib/metaHash";
import { mapCrmPayload } from "@/lib/metaMapper";
import { sendToMeta, metaEventsUrl } from "@/lib/metaCapi";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RPC_TOKEN    = process.env.ADMIN_RPC_TOKEN;

// ── POST /api/webhooks/crm/[tenant_id] ───────────────────────────────────────
export async function POST(request, { params }) {
  const { tenant_id } = params;

  // 1. Lê raw body (necessário para validação HMAC)
  const rawBody = await request.text();
  let crmPayload;
  try {
    crmPayload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  // 2. Busca config da empresa pelo slug
  const company = await fetchCompanyBySlug(tenant_id);
  if (!company) {
    return Response.json({ error: "tenant_not_found" }, { status: 404 });
  }

  // 3. Valida assinatura HMAC-SHA256
  const signature = request.headers.get("x-webhook-signature");
  if (company.webhook_secret && !verifyHmac(rawBody, company.webhook_secret, signature)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  // 4. Valida source antes de responder
  const source = (crmPayload.source ?? "website").toLowerCase();
  const allowedSources = company.capi_sources ?? ["website", "whatsapp"];
  if (!allowedSources.includes(source)) {
    return Response.json(
      { error: "source_not_allowed", allowed: allowedSources },
      { status: 400 }
    );
  }

  // 5. Validação antecipada para WhatsApp (antes do 200)
  if (source === "whatsapp") {
    const contact = crmPayload.contact ?? crmPayload.data ?? {};
    const phone   = contact.phone ?? contact.telefone ?? contact.whatsapp;
    if (!phone) {
      return Response.json(
        { error: "phone_required", message: "Campo phone obrigatório para source=whatsapp" },
        { status: 400 }
      );
    }
  }

  // 6. Responde 200 imediatamente ao CRM
  // O processamento continua de forma assíncrona (fire-and-forget)
  void processEvent({ company, crmPayload, source, tenant_id });

  return Response.json({ received: true }, { status: 200 });
}

// ── Processamento assíncrono ──────────────────────────────────────────────────

async function processEvent({ company, crmPayload, source, tenant_id }) {
  const eventName = crmPayload.event ?? "lead_created";
  let status      = "error";
  let errorDetail = null;
  let metaResp    = null;

  try {
    // Mapeia payload CRM → Meta CAPI
    const metaEvent = mapCrmPayload(crmPayload);

    // Envia para a Meta
    const result = await sendToMeta({
      pixelId:     company.meta_pixel_id,
      accessToken: company.meta_access_token,
      event:       metaEvent,
    });

    metaResp = result.meta_response ?? null;

    if (result.ok) {
      status = "success";
      console.info(`[CAPI][${tenant_id}] ✓ ${metaEvent.event_name} (${source}) → events_received=${result.events_received}`);
    } else {
      errorDetail = result.error;
      console.error(`[CAPI][${tenant_id}] ✗ ${metaEvent.event_name} (${source}) → ${result.error}`);
    }
  } catch (err) {
    errorDetail = err.message;
    console.error(`[CAPI][${tenant_id}] Erro interno: ${err.message}`);
  }

  // Grava log no Supabase
  await insertLog({
    companyId:   company.id,
    tenantId:    tenant_id,
    source,
    eventName,
    status,
    errorDetail,
    metaResponse: metaResp,
    crmPayload:   sanitizePayload(crmPayload),
  });
}

// ── Helpers Supabase ──────────────────────────────────────────────────────────

async function fetchCompanyBySlug(slug) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_company_meta_config`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error) return null;
  return data;
}

async function insertLog({ companyId, tenantId, source, eventName, status, errorDetail, metaResponse, crmPayload }) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_capi_log`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      p_company_id:   companyId,
      p_tenant_id:    tenantId,
      p_source:       source,
      p_event_name:   eventName,
      p_status:       status,
      p_error_detail: errorDetail,
      p_meta_response: metaResponse ? JSON.stringify(metaResponse) : null,
      p_crm_payload:   crmPayload ? JSON.stringify(crmPayload) : null,
    }),
  }).catch(err => console.error(`[CAPI] Falha ao gravar log: ${err.message}`));
}

// Remove dados sensíveis do payload antes de gravar no log
function sanitizePayload(payload) {
  const safe = { ...payload };
  const contact = safe.contact ? { ...safe.contact } : null;
  if (contact?.email)    contact.email    = "***";
  if (contact?.phone)    contact.phone    = "***";
  if (contact?.telefone) contact.telefone = "***";
  if (contact) safe.contact = contact;
  return safe;
}
