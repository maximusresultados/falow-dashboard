const ADMIN_SECRET    = process.env.ADMIN_SECRET;
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_RPC_TOKEN = process.env.ADMIN_RPC_TOKEN;

function auth(request) {
  return request.headers.get("x-admin-key") === ADMIN_SECRET;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function callRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}


// ── WTS API helpers ───────────────────────────────────────────────────────────

function baseUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/\/$/, "");
}

async function wtsGet(apiBaseUrl, apiToken, path, queryParams) {
  const params = new URLSearchParams();
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (Array.isArray(v)) v.forEach(item => params.append(k, item));
      else params.append(k, v);
    }
  }
  const qs  = params.toString();
  const url = `${baseUrl(apiBaseUrl)}/crm/v1/${path}${qs ? "?" + qs : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`WTS GET ${path}: HTTP ${res.status} — ${detail.slice(0, 200)}`);
  }
  return res.json();
}

async function wtsPost(apiBaseUrl, apiToken, path, body) {
  const url = `${baseUrl(apiBaseUrl)}/crm/v1/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`WTS POST ${path}: HTTP ${res.status} — ${detail.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchAllPanels(apiBaseUrl, apiToken) {
  const panels = [];
  let page = 1;
  while (true) {
    const data = await wtsGet(apiBaseUrl, apiToken, "panel", {
      IncludeDetails: ["steps", "tags"],
      PageNumber: page,
      PageSize: 100,
    });
    const items = data?.items ?? [];
    panels.push(...items);
    if (items.length < 100) break;
    page++;
    if (page > 20) break;
  }
  return panels;
}

async function fetchAllCards(apiBaseUrl, apiToken, panelId) {
  const cards = [];
  let page = 1;
  while (true) {
    const data = await wtsGet(apiBaseUrl, apiToken, "panel/card", {
      PanelId:        panelId,
      PageNumber:     page,
      PageSize:       100,
      IncludeDetails: ["StepTitle", "StepPhase", "ResponsibleUser", "Contacts"],
      IncludeArchived: true,
    });
    const items = data?.items ?? [];
    cards.push(...items);
    if (!data?.hasMorePages) break;
    page++;
    if (page > 50) break;
  }
  return cards;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapPanel(p, companyId) {
  return {
    external_id: p.id,
    title:       p.title       ?? null,
    description: p.description ?? null,
    archived:    p.archived    ?? false,
    scope:       p.scope       ?? null,
    company_id:  companyId,
    synced_at:   new Date().toISOString(),
  };
}

function mapStep(s, panelInternalId, companyId) {
  return {
    external_id:         s.id,
    panel_id:            panelInternalId,
    title:               s.title              ?? null,
    position:            s.position           ?? null,
    is_initial:          s.isInitial          ?? s.is_initial ?? false,
    is_final:            s.isFinal            ?? s.is_final   ?? false,
    card_count:          s.cardCount          ?? s.card_count ?? null,
    overdue_card_count:  s.overdueCardCount   ?? s.overdue_card_count ?? null,
    monetary_amount:     s.monetaryAmount     ?? s.monetary_amount ?? null,
    company_id:          companyId,
    synced_at:           new Date().toISOString(),
  };
}

function mapTag(t, panelInternalId, companyId) {
  return {
    external_id: t.id,
    panel_id:    panelInternalId,
    name:        t.name       ?? null,
    name_color:  t.nameColor  ?? t.name_color ?? null,
    bg_color:    t.bgColor    ?? t.bg_color   ?? null,
    company_id:  companyId,
  };
}

function mapCard(c, panelInternalId, stepIdMap, companyId) {
  const stepInternalId = stepIdMap[c.stepId ?? c.step_id] ?? null;
  return {
    external_id:           c.id,
    panel_id:              panelInternalId,
    step_id:               stepInternalId,
    step_title:            c.stepTitle           ?? c.step_title           ?? null,
    step_phase:            c.stepPhase           ?? c.step_phase           ?? null,
    title:                 c.title               ?? null,
    description:           c.description         ?? null,
    card_number:           c.number              ?? c.cardNumber          ?? c.card_number ?? null,
    card_key:              c.key                 ?? c.cardKey             ?? c.card_key    ?? null,
    monetary_amount:       c.monetaryAmount      ?? c.monetary_amount      ?? null,
    responsible_user_id:   c.responsibleUserId   ?? c.responsible_user_id  ?? null,
    responsible_user_name: c.responsibleUser?.name ?? c.responsibleUserName ?? c.responsible_user_name ?? null,
    contact_ids:           c.contactIds          ?? c.contact_ids          ?? null,
    contact_name:          c.contacts?.[0]?.name ?? c.contactName         ?? c.contact_name ?? null,
    tag_ids:               c.tagIds              ?? c.tag_ids              ?? null,
    due_date:              c.dueDate             ?? c.due_date             ?? null,
    is_overdue:            c.isOverdue           ?? c.is_overdue           ?? false,
    archived:              c.archived            ?? false,
    created_at:            c.createdAt           ?? c.created_at           ?? null,
    updated_at:            c.updatedAt           ?? c.updated_at           ?? null,
    company_id:            companyId,
    synced_at:             new Date().toISOString(),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request, { params }) {
  if (!auth(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const companyId = parseInt(params.company_id, 10);

    // 1. Busca credenciais da empresa
    const companies = await callRpc("admin_list_companies", { p_rpc_token: ADMIN_RPC_TOKEN });
    const co = Array.isArray(companies) ? companies.find(c => c.id === companyId) : null;
    if (!co) return Response.json({ error: "company_not_found" }, { status: 404 });

    let apiToken   = co.api_token;
    let apiBaseUrl = co.api_base_url ?? "https://api.wts.chat/";
    if (!/^https?:\/\//i.test(apiBaseUrl)) apiBaseUrl = "https://" + apiBaseUrl;

    if (!apiToken) return Response.json({ error: "no_api_token" }, { status: 400 });

    // 2. Busca painéis da WTS
    let panels;
    try {
      panels = await fetchAllPanels(apiBaseUrl, apiToken);
    } catch (e) {
      return Response.json({ error: "wts_panels_failed", detail: e.message }, { status: 502 });
    }

    const stats = { panels: 0, steps: 0, tags: 0, cards: 0 };
    const cardErrors = [];

    for (const panel of panels) {
      // 3. Upsert painel + etapas + etiquetas via RPC
      const syncResult = await callRpc("admin_sync_panel", {
        p_rpc_token:  ADMIN_RPC_TOKEN,
        p_company_id: companyId,
        p_panel:      panel,
      });

      if (syncResult?.error) {
        throw new Error(`admin_sync_panel: ${syncResult.error}`);
      }

      const panelInternalId = syncResult?.panel_id;
      if (!panelInternalId) continue;
      stats.panels++;

      const stepMap = syncResult?.step_map ?? {};
      stats.steps += Object.keys(stepMap).length;
      stats.tags  += (panel.tags ?? []).length;

      // 4. Busca e upsert cards via RPC (paginado)
      try {
        const cards = await fetchAllCards(apiBaseUrl, apiToken, panel.id);
        if (cards.length) {
          const cardRows = cards.map(c => mapCard(c, panelInternalId, stepMap, companyId));
          for (let i = 0; i < cardRows.length; i += 200) {
            const res = await callRpc("admin_upsert_cards", {
              p_rpc_token: ADMIN_RPC_TOKEN,
              p_cards:     cardRows.slice(i, i + 200),
            });
            if (res?.error) throw new Error(`admin_upsert_cards: ${res.error}`);
          }
          stats.cards += cardRows.length;
        }
      } catch (e) {
        cardErrors.push({ panel: panel.title, error: e.message });
      }
    }

    return Response.json({
      ok: true,
      synced: stats,
      ...(cardErrors.length ? { card_errors: cardErrors } : {}),
    });

  } catch (e) {
    console.error("sync error:", e);
    return Response.json({ error: "internal_error", detail: e.message }, { status: 500 });
  }
}
