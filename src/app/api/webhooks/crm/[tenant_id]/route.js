import { mapCrmPayload } from "@/lib/metaMapper";
import { sendToMeta }    from "@/lib/metaCapi";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── POST /api/webhooks/crm/[tenant_id] ───────────────────────────────────────
export async function POST(request, { params }) {
  const { tenant_id } = params;

  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  // Normaliza o envelope do WTS (pode vir direto ou wrapped em array)
  const wtsBody = normalizeWtsPayload(payload);
  if (!wtsBody) {
    return Response.json({ error: "unsupported_format" }, { status: 400 });
  }

  // Só processa mudança de etapa
  if (wtsBody.eventType !== "PANEL_CARD_STEP_CHANGE") {
    return Response.json({ received: true, skipped: true }, { status: 200 });
  }

  // Busca config da empresa pelo slug
  const company = await fetchCompanyBySlug(tenant_id);
  if (!company) {
    return Response.json({ error: "tenant_not_found" }, { status: 404 });
  }

  // Verifica se este stepTitle está mapeado para algum evento
  const stepTitle = wtsBody.content?.stepTitle ?? "";
  const eventName = resolveStepEvent(stepTitle, company);
  if (!eventName) {
    // Etapa não configurada — ignora silenciosamente
    return Response.json({ received: true, skipped: true }, { status: 200 });
  }

  // Responde 200 imediatamente; processamento é assíncrono
  void processWtsEvent({ company, wtsBody, eventName, tenant_id });

  return Response.json({ received: true }, { status: 200 });
}

// ── Processamento assíncrono ──────────────────────────────────────────────────

async function processWtsEvent({ company, wtsBody, eventName, tenant_id }) {
  let status      = "error";
  let errorDetail = null;
  let metaResp    = null;

  try {
    const contactId = wtsBody.content?.contacts?.[0]?.id;
    if (!contactId) throw new Error("contact_id ausente no webhook");

    // Busca dados completos do contato na API WTS
    const wtsContact = await fetchWtsContact(company, contactId);
    if (!wtsContact) throw new Error("contato não encontrado na API WTS");

    // Monta payload normalizado para o mapper
    const crmPayload = buildCrmPayload({ wtsBody, wtsContact, eventName });

    // Mapeia para formato Meta CAPI
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
      console.info(`[CAPI][${tenant_id}] ✓ ${eventName} (${stepTitle(wtsBody)}) → events_received=${result.events_received}`);
    } else {
      errorDetail = result.error;
      console.error(`[CAPI][${tenant_id}] ✗ ${eventName} → ${result.error}`);
    }
  } catch (err) {
    errorDetail = err.message;
    console.error(`[CAPI][${tenant_id}] Erro: ${err.message}`);
  }

  await insertLog({
    companyId:    company.id,
    tenantId:     tenant_id,
    source:       "wts",
    eventName,
    status,
    errorDetail,
    metaResponse: metaResp,
    crmPayload:   { step: wtsBody.content?.stepTitle, card: wtsBody.content?.key },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Suporta payload direto { eventType, ... } ou wrapped [{ body: { eventType, ... } }]
function normalizeWtsPayload(payload) {
  if (payload?.eventType) return payload;
  if (Array.isArray(payload) && payload[0]?.body?.eventType) return payload[0].body;
  return null;
}

function stepTitle(wtsBody) {
  return wtsBody.content?.stepTitle ?? "?";
}

// Compara stepTitle (case-insensitive) com os steps configurados na empresa
function resolveStepEvent(title, company) {
  const t = title.trim().toLowerCase();
  if (company.wts_step_orcamento && t === company.wts_step_orcamento.trim().toLowerCase()) {
    return "Lead";
  }
  if (company.wts_step_venda && t === company.wts_step_venda.trim().toLowerCase()) {
    return "Purchase";
  }
  return null;
}

// Busca contato completo na API WTS pelo ID
async function fetchWtsContact(company, contactId) {
  const baseUrl = (company.api_base_url ?? "https://api.wts.chat").replace(/\/$/, "");
  try {
    const res = await fetch(`${baseUrl}/core/v1/contact/${contactId}`, {
      headers: { "Authorization": `Bearer ${company.api_token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

// Converte "+55|62991338898" → "5562991338898"
function parseWtsPhone(phoneNumber) {
  if (!phoneNumber) return null;
  return phoneNumber.replace(/[+|]/g, "");
}

// Monta o payload no formato esperado pelo metaMapper
function buildCrmPayload({ wtsBody, wtsContact, eventName }) {
  const content = wtsBody.content ?? {};
  const utm     = wtsContact.utm ?? {};

  const payload = {
    source:     "whatsapp",
    event:      eventName === "Lead" ? "lead_created" : "deal_won",
    event_time: wtsBody.date
      ? Math.floor(new Date(wtsBody.date).getTime() / 1000)
      : undefined,
    contact: {
      email: wtsContact.email    ?? null,
      phone: parseWtsPhone(wtsContact.phoneNumber),
      name:  wtsContact.name     ?? wtsContact.nameWhatsapp ?? null,
    },
  };

  if (content.monetaryAmount) {
    payload.value = content.monetaryAmount;
  }

  // ctwa_clid: presente quando o lead veio de anúncio Click-to-WhatsApp
  if (utm.clid) {
    payload.ctwa_clid = utm.clid;
  }

  return payload;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

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
      p_company_id:    companyId,
      p_tenant_id:     tenantId,
      p_source:        source,
      p_event_name:    eventName,
      p_status:        status,
      p_error_detail:  errorDetail,
      p_meta_response: metaResponse ? JSON.stringify(metaResponse) : null,
      p_crm_payload:   crmPayload   ? JSON.stringify(crmPayload)   : null,
    }),
  }).catch(err => console.error(`[CAPI] Falha ao gravar log: ${err.message}`));
}
