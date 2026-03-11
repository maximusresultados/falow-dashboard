const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_BASE    = "https://graph.facebook.com";

// ── Envia evento para a Meta Conversions API ──────────────────────────────────
// Retorna { ok, events_received, error }

export async function sendToMeta({ pixelId, accessToken, event, testEventCode }) {
  const url = metaEventsUrl(pixelId, accessToken);

  const body = { data: [event] };
  if (testEventCode) body.test_event_code = testEventCode;

  let res, responseText;
  try {
    res          = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    responseText = await res.text();
  } catch (err) {
    return { ok: false, error: `network_error: ${err.message}` };
  }

  let parsed;
  try { parsed = JSON.parse(responseText); } catch { parsed = { raw: responseText }; }

  if (res.ok) {
    return { ok: true, events_received: parsed.events_received ?? 1, meta_response: parsed };
  }

  const errorDetail = parsed?.error?.message ?? parsed?.error ?? responseText;
  return { ok: false, error: String(errorDetail), meta_response: parsed };
}

// ── Monta URL com access_token como query string (padrão Meta) ────────────────

export function metaEventsUrl(pixelId, accessToken) {
  return `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
}
