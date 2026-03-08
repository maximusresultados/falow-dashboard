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
  amber: "#eab308",
};

const LOGO_URL = "https://pdolixqxogpwufwunyds.supabase.co/storage/v1/object/public/LOGO%20FALOW%20CRM/LOGO%20FALOWCRM%20-%20OFICIAL%20(1200%20x%20500%20px)%20(3).png";

function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
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

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", api_base_url: "https://api.wts.chat/", api_token: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [newCompany, setNewCompany] = useState(null);
  const [copied, setCopied] = useState("");

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

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2500);
  };

  const dashUrl = (token) =>
    typeof window !== "undefined" ? `${window.location.origin}?token=${token}` : `?token=${token}`;

  const setField = key => val => setForm(f => ({ ...f, [key]: val }));

  // Auto-slug from name
  const handleNameChange = val => {
    setForm(f => ({
      ...f,
      name: val,
      slug: f.slug === "" || f.slug === slugify(f.name)
        ? slugify(val)
        : f.slug,
    }));
  };

  function slugify(str) {
    return str.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
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
          {loginError && (
            <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>⚠ {loginError}</div>
          )}
          <button
            onClick={handleLogin}
            disabled={loginLoading || !adminKey}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: C.brand, color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", opacity: loginLoading || !adminKey ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >{loginLoading ? "Verificando..." : "Entrar"}</button>
        </div>
      </div>
    );
  }

  // ─── ADMIN ──────────────────────────────────────────────────────────────────
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

        {/* ── Companies list ─────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Empresas Cadastradas</div>

          {/* New company success banner */}
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
                const url = token ? dashUrl(token) : null;
                return (
                  <div key={co.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: url ? 10 : 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: co.active ? C.green : C.red, flexShrink: 0 }} />
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{co.name}</div>
                      <div style={{ fontSize: 11, color: C.textDim, background: C.border, padding: "2px 8px", borderRadius: 6, marginLeft: 2 }}>{co.slug}</div>
                      <div style={{ marginLeft: "auto", fontSize: 11, color: C.textDim }}>{co.api_base_url}</div>
                    </div>
                    {url && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {url}
                        </div>
                        <CopyButton text={url} id={co.id} copied={copied} onCopy={copy} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Add company form ───────────────────────────────────── */}
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
