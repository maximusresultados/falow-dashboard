"use client";
import { useState, useCallback } from "react";

const C = {
  bg: "#06080f", bgAlt: "#0c1017",
  card: "#0f1520", cardHover: "#151d2e",
  border: "#1a2235", borderLight: "#243049",
  text: "#e8ecf4", textMuted: "#7a8baa", textDim: "#4a5772",
  brand: "#4f8aff", brandGlow: "#4f8aff30",
  green: "#22c55e", greenGlow: "#22c55e20",
  red: "#ef4444", redGlow: "#ef444420",
  amber: "#eab308", amberGlow: "#eab30820",
  purple: "#a855f7", purpleGlow: "#a855f720",
};

const LOGO_URL = "https://pdolixqxogpwufwunyds.supabase.co/storage/v1/object/public/LOGO%20FALOW%20CRM/LOGO%20FALOWCRM%20-%20OFICIAL%20(1200%20x%20500%20px)%20(3).png";

// ── Componentes base ──────────────────────────────────────────────────────────

function Input({ label, value, onChange, placeholder, type = "text", required, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bgAlt,
          color: C.text, fontSize: 13, outline: "none",
          boxSizing: "border-box", transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = C.brand}
        onBlur={e => e.target.style.borderColor = C.border}
      />
      {hint && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function CopyButton({ text, id, copied, onCopy }) {
  const active = copied === id;
  return (
    <button
      onClick={() => onCopy(text, id)}
      style={{
        padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
        border: `1px solid ${active ? C.green : C.border}`,
        background: active ? C.greenGlow : "transparent",
        color: active ? C.green : C.textMuted,
        transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >{active ? "✓ Copiado" : "Copiar"}</button>
  );
}

// ── Seção Meta CAPI por empresa ───────────────────────────────────────────────

function MetaCapiSection({ company, adminKey }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState("");
  const [logs, setLogs]       = useState([]);
  const [config, setConfig]   = useState({
    meta_pixel_id:     "",
    meta_access_token: "",
    webhook_secret:    "",
    capi_sources:      ["website", "whatsapp"],
  });

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/crm/${company.slug}`
    : `/api/webhooks/crm/${company.slug}`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2500);
  };

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/admin/meta/${company.id}`, {
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      if (data.config && !data.config.error) {
        setConfig({
          meta_pixel_id:     data.config.meta_pixel_id     ?? "",
          meta_access_token: data.config.meta_access_token ?? "",
          webhook_secret:    data.config.webhook_secret    ?? "",
          capi_sources:      data.config.capi_sources      ?? ["website", "whatsapp"],
        });
      }
      if (Array.isArray(data.logs)) setLogs(data.logs);
    } catch {
      setError("Erro ao carregar configuração");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res  = await fetch(`/api/admin/meta/${company.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body:    JSON.stringify(config),
      });
      const data = await res.json();
      if (data?.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError("Erro ao salvar");
      }
    } catch {
      setError("Erro de conexão");
    }
    setSaving(false);
  };

  const generateSecret = () => {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    const secret = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
    setConfig(c => ({ ...c, webhook_secret: secret }));
  };

  const toggleSource = (src) => {
    setConfig(c => ({
      ...c,
      capi_sources: c.capi_sources.includes(src)
        ? c.capi_sources.filter(s => s !== src)
        : [...c.capi_sources, src],
    }));
  };

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
      {/* Toggle button */}
      <button
        onClick={handleOpen}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          color: C.brand, fontSize: 12, fontWeight: 700, padding: 0,
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: 4, background: C.brandGlow,
          fontSize: 10, transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>▼</span>
        Meta CAPI
        {company.meta_pixel_id && (
          <span style={{ fontSize: 10, color: C.green, background: C.greenGlow, padding: "1px 7px", borderRadius: 10 }}>configurado</span>
        )}
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ fontSize: 12, color: C.textDim, padding: "12px 0" }}>Carregando...</div>
          ) : (
            <>
              {/* Campos de configuração */}
              <Input
                label="Pixel ID"
                value={config.meta_pixel_id}
                onChange={v => setConfig(c => ({ ...c, meta_pixel_id: v }))}
                placeholder="Ex: 1234567890123456"
              />
              <Input
                label="Access Token"
                value={config.meta_access_token}
                onChange={v => setConfig(c => ({ ...c, meta_access_token: v }))}
                placeholder="EAAxxxxxxxx..."
                type="password"
              />

              {/* Webhook Secret */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>
                  Webhook Secret
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={config.webhook_secret}
                    onChange={e => setConfig(c => ({ ...c, webhook_secret: e.target.value }))}
                    placeholder="Gere ou cole seu secret"
                    style={{
                      flex: 1, padding: "9px 12px", borderRadius: 8,
                      border: `1px solid ${C.border}`, background: C.bgAlt,
                      color: C.text, fontSize: 12, outline: "none", fontFamily: "monospace",
                    }}
                  />
                  <button
                    onClick={generateSecret}
                    style={{
                      padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      border: `1px solid ${C.brand}50`, background: C.brandGlow,
                      color: C.brand, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >Gerar</button>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                  Enviado pelo CRM no header <code style={{ color: C.textMuted }}>X-Webhook-Signature: sha256=...</code>
                </div>
              </div>

              {/* Fontes habilitadas */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                  Fontes Habilitadas
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { key: "website",   label: "Formulário",  icon: "🌐", color: C.brand,  glow: C.brandGlow  },
                    { key: "whatsapp",  label: "WhatsApp",    icon: "💬", color: C.green,  glow: C.greenGlow  },
                  ].map(({ key, label, icon, color, glow }) => {
                    const active = config.capi_sources.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleSource(key)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          border: `1px solid ${active ? color + "60" : C.border}`,
                          background: active ? glow : "transparent",
                          color: active ? color : C.textDim,
                          cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        {icon} {label}
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: active ? color : C.border,
                          flexShrink: 0,
                        }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Webhook URL */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  Webhook URL
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{
                    flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "8px 12px", fontSize: 11, color: C.textMuted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFamily: "monospace",
                  }}>
                    {webhookUrl}
                  </div>
                  <CopyButton text={webhookUrl} id={`wh-${company.id}`} copied={copied} onCopy={copy} />
                </div>
              </div>

              {/* Erro / sucesso */}
              {error && (
                <div style={{ fontSize: 12, color: C.red, padding: "7px 10px", background: C.redGlow, borderRadius: 6, marginBottom: 10 }}>
                  ⚠ {error}
                </div>
              )}
              {saved && (
                <div style={{ fontSize: 12, color: C.green, padding: "7px 10px", background: C.greenGlow, borderRadius: 6, marginBottom: 10 }}>
                  ✓ Configuração salva
                </div>
              )}

              {/* Botão salvar */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%", padding: "9px", borderRadius: 8, border: "none",
                  background: C.brand, color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", opacity: saving ? 0.6 : 1, transition: "opacity 0.2s",
                  marginBottom: logs.length > 0 ? 16 : 0,
                }}
              >{saving ? "Salvando..." : "Salvar Configuração"}</button>

              {/* Logs recentes */}
              {logs.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                    Eventos Recentes
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {logs.slice(0, 8).map(log => {
                      const isWhatsApp = log.source === "whatsapp";
                      const isSuccess  = log.status === "success";
                      const date       = new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                      return (
                        <div
                          key={log.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 10px", borderRadius: 6,
                            background: isSuccess ? C.greenGlow : C.redGlow,
                            border: `1px solid ${isSuccess ? C.green + "30" : C.red + "30"}`,
                          }}
                        >
                          <span style={{ fontSize: 13 }}>{isWhatsApp ? "💬" : "🌐"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{log.event_name}</span>
                          <span style={{ fontSize: 10, color: C.textDim }}>{date}</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: isSuccess ? C.green : C.red }}>
                            {isSuccess ? "✓" : "✗"}
                          </span>
                          {!isSuccess && log.error_detail && (
                            <span style={{ fontSize: 10, color: C.red, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {log.error_detail}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página Admin ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminKey, setAdminKey]     = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [companies, setCompanies]   = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [form, setForm]             = useState({ name: "", slug: "", api_base_url: "https://api.wts.chat/", api_token: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]   = useState("");
  const [newCompany, setNewCompany] = useState(null);
  const [copied, setCopied]         = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const apiCall = useCallback(async (method, body = null) => {
    const res = await fetch("/api/admin/companies", {
      method,
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  }, [adminKey]);

  const handleLogin = async () => {
    if (!adminKey) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const data = await apiCall("GET");
      if (data?.error === "unauthorized") {
        setLoginError("Senha incorreta");
      } else if (Array.isArray(data)) {
        setCompanies(data);
        setAuthenticated(true);
      } else {
        setLoginError("Erro ao conectar. Verifique as configurações.");
      }
    } catch {
      setLoginError("Erro de conexão");
    }
    setLoginLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.api_token) {
      setFormError("Preencha todos os campos obrigatórios (*)");
      return;
    }
    setFormLoading(true);
    setFormError("");
    setNewCompany(null);
    try {
      const data = await apiCall("POST", form);
      if (data?.error) {
        setFormError(data.error === "slug_exists" ? "Esse slug já está em uso" : "Erro ao cadastrar empresa");
      } else {
        setNewCompany(data);
        setForm({ name: "", slug: "", api_base_url: "https://api.wts.chat/", api_token: "" });
        const list = await apiCall("GET");
        if (Array.isArray(list)) setCompanies(list);
      }
    } catch {
      setFormError("Erro de conexão");
    }
    setFormLoading(false);
  };

  const handleDelete = async (co) => {
    if (!window.confirm(`Deletar "${co.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(co.id);
    try {
      await apiCall("DELETE", { company_id: co.id });
      setCompanies(prev => prev.filter(c => c.id !== co.id));
    } catch {
      alert("Erro ao deletar empresa");
    }
    setDeletingId(null);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2500);
  };

  const dashUrl = (token) =>
    typeof window !== "undefined" ? `${window.location.origin}?token=${token}` : `?token=${token}`;

  const setField = key => val => setForm(f => ({ ...f, [key]: val }));

  const handleNameChange = val => {
    setForm(f => ({
      ...f,
      name: val,
      slug: f.slug === "" || f.slug === slugify(f.name) ? slugify(val) : f.slug,
    }));
  };

  function slugify(str) {
    return str.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 24px 64px #000a" }}>
          <img src={LOGO_URL} alt="FalowCRM" style={{ height: 30, display: "block", marginBottom: 28 }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Painel Admin</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 28 }}>Acesso restrito ao administrador</div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Senha</label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8,
              border: `1px solid ${loginError ? C.red : C.border}`,
              background: C.bgAlt, color: C.text, fontSize: 14,
              outline: "none", boxSizing: "border-box", marginBottom: 10,
            }}
          />
          {loginError && <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>⚠ {loginError}</div>}
          <button
            onClick={handleLogin}
            disabled={loginLoading || !adminKey}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: C.brand, color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", opacity: loginLoading || !adminKey ? 0.5 : 1, transition: "opacity 0.2s",
            }}
          >{loginLoading ? "Verificando..." : "Entrar"}</button>
        </div>
      </div>
    );
  }

  // ─── ADMIN ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.card }}>
        <img src={LOGO_URL} alt="FalowCRM" style={{ height: 26 }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: C.brand, background: C.brandGlow, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.brand}40`, letterSpacing: 1 }}>ADMIN</span>
        <div style={{ marginLeft: "auto", fontSize: 13, color: C.textMuted }}>
          {companies.length} empresa{companies.length !== 1 ? "s" : ""} cadastrada{companies.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={() => { setAuthenticated(false); setAdminKey(""); }}
          style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}
        >Sair</button>
      </div>

      <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Lista de empresas ────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Empresas Cadastradas</div>

          {newCompany && (
            <div style={{ background: C.greenGlow, border: `1px solid ${C.green}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>✓ {newCompany.name} cadastrada com sucesso!</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 280 }}>
                <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {dashUrl(newCompany.token)}
                </div>
                <CopyButton text={dashUrl(newCompany.token)} id="new" copied={copied} onCopy={copy} />
              </div>
            </div>
          )}

          {companies.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textDim, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
              Nenhuma empresa cadastrada ainda
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {companies.map(co => {
                const token = co.tokens?.[0]?.token;
                const url   = token ? dashUrl(token) : null;
                return (
                  <div key={co.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                    {/* Cabeçalho da empresa */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: url ? 10 : 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: co.active ? C.green : C.red, flexShrink: 0 }} />
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{co.name}</div>
                      <div style={{ fontSize: 11, color: C.textDim, background: C.border, padding: "2px 8px", borderRadius: 6, marginLeft: 2 }}>{co.slug}</div>
                      <div style={{ marginLeft: "auto", fontSize: 11, color: C.textDim }}>{co.api_base_url}</div>
                      <button
                        onClick={() => handleDelete(co)}
                        disabled={deletingId === co.id}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          border: `1px solid ${C.red}60`, background: C.redGlow,
                          color: C.red, transition: "all 0.2s", opacity: deletingId === co.id ? 0.5 : 1,
                        }}
                      >{deletingId === co.id ? "..." : "Deletar"}</button>
                    </div>

                    {/* URL do dashboard */}
                    {url && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 0 }}>
                        <div style={{ flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {url}
                        </div>
                        <CopyButton text={url} id={co.id} copied={copied} onCopy={copy} />
                      </div>
                    )}

                    {/* Seção Meta CAPI */}
                    <MetaCapiSection company={co} adminKey={adminKey} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Formulário nova empresa ──────────────────────────────── */}
        <div style={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, height: "fit-content", position: "sticky", top: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 22 }}>Nova Empresa</div>

          <Input label="Nome da empresa" value={form.name} onChange={handleNameChange} placeholder="Ex: Global Química" required />
          <Input label="Slug" value={form.slug} onChange={setField("slug")} placeholder="Ex: global-quimica" required />
          <Input label="API Token (WTS/FalowCRM)" value={form.api_token} onChange={setField("api_token")} placeholder="pn_xxxxxxxxxxxxx" type="password" required />
          <Input label="API Base URL" value={form.api_base_url} onChange={setField("api_base_url")} placeholder="https://api.wts.chat/" />

          {formError && (
            <div style={{ fontSize: 12, color: C.red, marginBottom: 12, padding: "8px 10px", background: C.redGlow, borderRadius: 6 }}>⚠ {formError}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={formLoading}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: C.brand, color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", opacity: formLoading ? 0.5 : 1, transition: "opacity 0.2s",
            }}
          >{formLoading ? "Cadastrando..." : "Cadastrar Empresa"}</button>
        </div>

      </div>
    </div>
  );
}
