import { buildUserData } from "./metaHash";

// ── Mapeamento de eventos CRM → nomes Meta ────────────────────────────────────

const EVENT_MAP = {
  lead_created:    "Lead",
  form_submitted:  "Lead",
  contact_created: "Contact",
  chat_started:    "Contact",
  deal_won:        "Purchase",
  deal_lost:       "CustomEvent_DealLost",
  page_view:       "PageView",
};

// ── Mapper principal ──────────────────────────────────────────────────────────
// Retorna o evento formatado para a Meta CAPI ou lança erro se dados inválidos.

export function mapCrmPayload(crmBody) {
  const source  = (crmBody.source ?? "website").toLowerCase();
  const contact = crmBody.contact ?? crmBody.data ?? {};

  if (source === "whatsapp") {
    return buildWhatsAppEvent(crmBody, contact);
  }
  return buildWebsiteEvent(crmBody, contact);
}

// ── Cenário B: Campanhas de WhatsApp ─────────────────────────────────────────
// action_source = "business_messaging"
// Telefone é estritamente obrigatório.
// Cookies/IP de browser são ignorados.

function buildWhatsAppEvent(crmBody, contact) {
  const phone = contact.phone ?? contact.telefone ?? contact.whatsapp;
  if (!phone) {
    throw Object.assign(
      new Error("Campo 'phone' obrigatório para eventos de WhatsApp."),
      { code: "PHONE_REQUIRED" }
    );
  }

  return {
    event_name:    resolveEventName(crmBody.event),
    event_time:    crmBody.event_time ?? unixNow(),
    action_source: "system_generated",
    user_data:     buildUserData({
      email:    contact.email,
      phone,
      name:     contact.name ?? contact.nome,
      city:     contact.city ?? contact.cidade,
      country:  contact.country ?? "br",
      zip:      contact.zip ?? contact.cep,
      ctwaClid: crmBody.ctwa_clid,
    }),
    ...customData(crmBody),
  };
}

// ── Cenário A: Campanhas de Formulário (Website) ──────────────────────────────
// action_source = "website"
// Captura cookies _fbc/_fbp, IP e user-agent do payload do CRM.
// E-mail é o campo de correspondência principal.

function buildWebsiteEvent(crmBody, contact) {
  return {
    event_name:       resolveEventName(crmBody.event),
    event_time:       crmBody.event_time ?? unixNow(),
    action_source:    "system_generated",
    event_source_url: crmBody.page_url ?? null,
    user_data:        buildUserData({
      email:           contact.email,
      phone:           contact.phone ?? contact.telefone,
      name:            contact.name ?? contact.nome,
      city:            contact.city ?? contact.cidade,
      country:         contact.country ?? "br",
      zip:             contact.zip ?? contact.cep,
      fbc:             crmBody._fbc,
      fbp:             crmBody._fbp,
      clientIp:        crmBody.client_ip,
      clientUserAgent: crmBody.client_user_agent,
    }),
    ...customData(crmBody),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveEventName(event) {
  if (!event) return "Lead";
  return EVENT_MAP[event.toLowerCase()] ?? event;
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function customData(crmBody) {
  const data = {
    event_source:       "crm",
    lead_event_source:  "FalowCRM",
  };
  if (crmBody.value) {
    data.value    = Number(crmBody.value);
    data.currency = crmBody.currency ?? "BRL";
  }
  return { custom_data: data };
}
