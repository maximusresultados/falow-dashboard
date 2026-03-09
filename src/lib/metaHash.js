import { createHash, timingSafeEqual } from "crypto";

// ── Hashing ───────────────────────────────────────────────────────────────────

export function sha256(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase().trim().replace(/\s+/g, "");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

// ── Normalização de telefone ──────────────────────────────────────────────────
// Remove não-dígitos; adiciona DDI 55 (Brasil) se número curto

export function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

// ── Monta user_data hasheado para a Meta ─────────────────────────────────────
// Regra oficial: fbc, fbp, client_ip_address e client_user_agent NÃO recebem hash

export function buildUserData({
  email,
  phone,
  name,
  city,
  country,
  zip,
  // website-only (sem hash)
  fbc,
  fbp,
  clientIp,
  clientUserAgent,
} = {}) {
  const parts = (name ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? null;
  const lastName  = parts.length > 1 ? parts[parts.length - 1] : null;

  const userData = {};

  if (email)     userData.em      = sha256(email);
  if (phone)     userData.ph      = sha256(normalizePhone(phone));
  if (firstName) userData.fn      = sha256(firstName);
  if (lastName)  userData.ln      = sha256(lastName);
  if (city)      userData.ct      = sha256(city);
  if (country)   userData.country = sha256(country);
  if (zip)       userData.zp      = sha256(String(zip).replace(/\D/g, ""));

  // Campos não hasheados (website)
  if (fbc)             userData.fbc               = fbc;
  if (fbp)             userData.fbp               = fbp;
  if (clientIp)        userData.client_ip_address = clientIp;
  if (clientUserAgent) userData.client_user_agent  = clientUserAgent;

  return userData;
}

// ── Validação HMAC-SHA256 do webhook ─────────────────────────────────────────
// CRM deve enviar: X-Webhook-Signature: sha256=<hex>

export function verifyHmac(rawBody, secret, signatureHeader) {
  if (!signatureHeader || !secret) return false;
  try {
    const expected = createHash("sha256")
      .update(secret)
      .update(rawBody)
      .digest("hex");
    const received = signatureHeader.replace(/^sha256=/, "");
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    );
  } catch {
    return false;
  }
}
