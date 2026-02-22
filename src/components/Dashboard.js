"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, Area, AreaChart, Line,
} from "recharts";
import { rpc, parseRpcResponse } from "@/lib/supabase";

// ══════════════════════════════════════════════
// ASSETS
// ══════════════════════════════════════════════

const LOGO_URL = "https://pdolixqxogpwufwunyds.supabase.co/storage/v1/object/public/LOGO%20FALOW%20CRM/LOGO%20FALOWCRM%20-%20OFICIAL%20(1200%20x%20500%20px)%20(3).png";
const ICON_URL = "https://pdolixqxogpwufwunyds.supabase.co/storage/v1/object/public/LOGO%20FALOW%20CRM/ICONE%20-%20FALOWCRM.png";

// ══════════════════════════════════════════════
// FORMATTING
// ══════════════════════════════════════════════

function formatBRL(v) {
  if (v == null || isNaN(v)) return "R$ 0";
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}K`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNum(v) {
  if (v == null || isNaN(v)) return "0";
  return v.toLocaleString("pt-BR");
}

// ══════════════════════════════════════════════
// DESIGN TOKENS
// ══════════════════════════════════════════════

const C = {
  bg: "#06080f", bgAlt: "#0c1017",
  card: "#0f1520", cardHover: "#151d2e",
  border: "#1a2235", borderLight: "#243049",
  text: "#e8ecf4", textMuted: "#7a8baa", textDim: "#4a5772",
  brand: "#4f8aff", brandDark: "#2563eb", brandGlow: "#4f8aff30",
  green: "#22c55e", greenGlow: "#22c55e20",
  red: "#ef4444", redGlow: "#ef444420",
  amber: "#eab308", amberGlow: "#eab30820",
  purple: "#a855f7", cyan: "#06b6d4", rose: "#f43f5e", emerald: "#34d399",
  funnelPalette: ["#06b6d4", "#4f8aff", "#a855f7", "#eab308", "#22c55e", "#34d399", "#f43f5e"],
};

const NUM_FONT = "'Poppins', sans-serif";

// ══════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════

function KPICard({ label, value, icon, color, glow, subtitle }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: h ? C.cardHover : C.card, border: `1px solid ${h ? C.borderLight : C.border}`,
      borderRadius: 14, padding: "22px 24px", position: "relative", overflow: "hidden",
      transition: "all 0.25s ease", transform: h ? "translateY(-3px)" : "none",
      boxShadow: h ? `0 12px 40px ${glow || C.brandGlow}` : "0 2px 8px #0003", cursor: "default",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `${color}06` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</span>
        <span style={{ fontSize: 18, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1, fontFamily: NUM_FONT, letterSpacing: -0.5 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: color || C.textMuted, marginTop: 8, fontWeight: 600 }}>{subtitle}</div>}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, ${color}00)`, opacity: h ? 1 : 0.5, transition: "opacity 0.3s" }} />
    </div>
  );
}

function SectionHeader({ children, icon, subtitle }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 44 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: 0 }}>{children}</h2>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)`, marginLeft: 16 }} />
      </div>
      {subtitle && <p style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 0 30px" }}>{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children, height = 300 }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", overflow: "hidden" }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>}
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function Badge({ text, color }) {
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}25`, fontFamily: NUM_FONT }}>{text}</span>;
}

function DataTable({ columns, data, emptyMsg = "Sem dados" }) {
  if (!data?.length) return <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>{emptyMsg}</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
        <thead><tr>{columns.map((col, i) => (
          <th key={i} style={{ padding: "10px 14px", textAlign: col.align || "left", color: C.textDim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, borderBottom: `2px solid ${C.border}`, background: C.card }}>{col.label}</th>
        ))}</tr></thead>
        <tbody>{data.map((row, ri) => (
          <tr key={ri} style={{ transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {columns.map((col, ci) => (
              <td key={ci} style={{ padding: "11px 14px", textAlign: col.align || "left", color: col.color ? col.color(row) : C.text, borderBottom: `1px solid ${C.border}40`, fontWeight: col.bold ? 700 : 400, fontFamily: col.mono ? NUM_FONT : "inherit", fontSize: 12 }}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return <button onClick={onClick} style={{
    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s",
    background: active ? `linear-gradient(135deg, ${C.brand}, ${C.brandDark})` : "transparent",
    color: active ? "#fff" : C.textMuted, boxShadow: active ? `0 4px 16px ${C.brandGlow}` : "none",
  }}>{children}</button>;
}

function PanelSelect({ panels, selected, onChange }) {
  return (
    <select
      value={selected || ""}
      onChange={e => onChange(e.target.value || null)}
      style={{
        padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
        background: C.card, color: C.text, fontSize: 12, fontWeight: 600,
        cursor: "pointer", outline: "none", minWidth: 180,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a8baa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: 32,
      }}
    >
      <option value="" style={{ background: C.card }}>📋 Todos os painéis</option>
      {panels.map(p => (
        <option key={p.title} value={p.title} style={{ background: C.card }}>{p.title}</option>
      ))}
    </select>
  );
}

function CTooltip({ active, payload, label, isCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: `${C.card}f0`, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 32px #000a" }}>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 700, marginTop: 2, fontFamily: NUM_FONT }}>{p.name}: {isCurrency ? formatBRL(p.value) : formatNum(p.value)}</div>)}
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

export default function Dashboard({ token }) {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [overdue, setOverdue] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [invalidToken, setInvalidToken] = useState(false);
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);

  // Fetch panels list (once)
  useEffect(() => {
    async function loadPanels() {
      const raw = await rpc("dashboard_panels", token);
      const p = parseRpcResponse(raw, "dashboard_panels");
      if (Array.isArray(p)) setPanels(p);
    }
    loadPanels();
  }, [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const errs = [];
    const panel = selectedPanel;

    const [kpiRaw, funnelRaw, evoRaw, rankRaw, overdueRaw] = await Promise.all([
      rpc("dashboard_kpis", token, panel),
      rpc("dashboard_funnel", token, panel),
      rpc("dashboard_evolution", token, panel),
      rpc("dashboard_ranking", token, panel),
      rpc("dashboard_overdue", token, panel),
    ]);

    // KPIs
    const k = parseRpcResponse(kpiRaw, "dashboard_kpis");
    if (k && typeof k === "object" && !Array.isArray(k)) {
      if (k.error === "token_invalido") { setInvalidToken(true); setLoading(false); return; }
      setCompanyName(k.company_name || "");
      setKpis({
        ativos: parseInt(k.ativos) || 0, valorPipeline: parseFloat(k.valor_pipeline) || 0,
        atrasados: parseInt(k.atrasados) || 0, ticketMedio: parseFloat(k.ticket_medio) || 0,
        ganhos: parseInt(k.ganhos) || 0, perdidos: parseInt(k.perdidos) || 0,
        receita: parseFloat(k.receita) || 0, taxaConversao: parseFloat(k.taxa_conversao) || 0,
      });
    } else errs.push("KPIs");

    const f = parseRpcResponse(funnelRaw, "dashboard_funnel");
    if (Array.isArray(f)) setFunnel(f.map(i => ({ etapa: i.etapa, position: parseInt(i.position) || 0, total: parseInt(i.total) || 0, valor: parseFloat(i.valor) || 0 })));
    else errs.push("Funil");

    const e = parseRpcResponse(evoRaw, "dashboard_evolution");
    if (Array.isArray(e)) setEvolution(e.map(i => ({ mes: i.mes, criados: parseInt(i.criados) || 0, ganhos: parseInt(i.ganhos) || 0, perdidos: parseInt(i.perdidos) || 0 })));
    else errs.push("Evolução");

    const r = parseRpcResponse(rankRaw, "dashboard_ranking");
    if (Array.isArray(r)) setRanking(r.map(i => ({ responsavel: i.responsavel, total: parseInt(i.total) || 0, ganhos: parseInt(i.ganhos) || 0, perdidos: parseInt(i.perdidos) || 0, receita: parseFloat(i.receita) || 0, taxa: parseFloat(i.taxa) || 0 })));
    else errs.push("Ranking");

    const o = parseRpcResponse(overdueRaw, "dashboard_overdue");
    if (Array.isArray(o)) setOverdue(o.map(i => ({ codigo: i.codigo || "—", titulo: i.titulo || "—", responsavel: i.responsavel || "—", etapa: i.etapa || "—", valor: parseFloat(i.valor) || 0, dias: parseInt(i.dias) || 0 })));
    else setOverdue([]);

    setErrors(errs);
    setLastSync(new Date());
    setLoading(false);
  }, [token, selectedPanel]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, 5 * 60 * 1000); return () => clearInterval(id); }, [fetchData]);

  const pieData = useMemo(() => {
    if (!kpis) return [];
    return [{ name: "Ganhos", value: kpis.ganhos, color: C.green }, { name: "Perdidos", value: kpis.perdidos, color: C.red }, { name: "Pipeline", value: kpis.ativos, color: C.brand }].filter(d => d.value > 0);
  }, [kpis]);

  const rankCols = [
    { key: "responsavel", label: "Responsável", bold: true },
    { key: "total", label: "Total", align: "center" },
    { key: "ganhos", label: "Ganhos", align: "center", color: () => C.green },
    { key: "perdidos", label: "Perdidos", align: "center", color: () => C.red },
    { key: "receita", label: "Receita", align: "right", mono: true, render: r => formatBRL(r.receita) },
    { key: "taxa", label: "Conversão", align: "center", render: r => <Badge text={r.taxa ? `${r.taxa}%` : "—"} color={r.taxa >= 50 ? C.green : r.taxa >= 25 ? C.amber : C.red} /> },
  ];

  const overdueCols = [
    { key: "codigo", label: "Código", mono: true, color: () => C.brand },
    { key: "titulo", label: "Título", bold: true },
    { key: "responsavel", label: "Responsável" },
    { key: "etapa", label: "Etapa" },
    { key: "valor", label: "Valor", align: "right", mono: true, render: r => formatBRL(r.valor) },
    { key: "dias", label: "Atraso", align: "center", render: r => <Badge text={`${r.dias}d`} color={r.dias > 7 ? C.red : C.amber} /> },
  ];

  // Invalid token
  if (invalidToken) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, maxWidth: 440, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⛔</div>
        <img src={LOGO_URL} alt="FalowCRM" style={{ height: 32, marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>Token inválido ou expirado.<br />Entre em contato com o administrador.</div>
      </div>
    </div>
  );

  // Loading
  if (loading && !kpis) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <img src={LOGO_URL} alt="FalowCRM" style={{ height: 40, marginBottom: 20 }} />
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 24 }}>Carregando dados...</div>
      <div style={{ display: "flex", gap: 8 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: C.brand, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
      <style>{`@keyframes pulse{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══ HEADER ═══ */}
      <header style={{ background: `${C.bgAlt}e8`, borderBottom: `1px solid ${C.border}`, padding: "12px 28px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <img src={LOGO_URL} alt="FalowCRM" style={{ height: 42, display: "block" }} />
            {companyName && <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 3 }}>{companyName}</div>}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 3, background: `${C.card}80`, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>📊 Visão Geral</TabBtn>
            <TabBtn active={tab === "funnel"} onClick={() => setTab("funnel")}>🔻 Funil</TabBtn>
            <TabBtn active={tab === "team"} onClick={() => setTab("team")}>👥 Equipe</TabBtn>
            <TabBtn active={tab === "alerts"} onClick={() => setTab("alerts")}>🚨 Alertas</TabBtn>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PanelSelect panels={panels} selected={selectedPanel} onChange={setSelectedPanel} />
            {errors.length > 0 && <span style={{ fontSize: 10, color: C.amber }}>⚠️ {errors.join(", ")}</span>}
            <button onClick={fetchData} disabled={loading} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", color: C.textMuted, fontSize: 11, fontWeight: 600, opacity: loading ? 0.5 : 1 }}>{loading ? "⏳" : "🔄"}</button>
            {lastSync && <div style={{ fontSize: 10, color: C.textDim }}>{lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>}
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: errors.length ? C.amber : C.green, boxShadow: `0 0 8px ${errors.length ? C.amber : C.green}` }} />
          </div>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 28px 60px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && kpis && (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 14 }}>
            <KPICard label="Cards Ativos" value={formatNum(kpis.ativos)} icon="📋" color={C.brand} glow={C.brandGlow} subtitle="No pipeline" />
            <KPICard label="Valor Pipeline" value={formatBRL(kpis.valorPipeline)} icon="💰" color={C.amber} glow={C.amberGlow} />
            <KPICard label="Atrasados" value={formatNum(kpis.atrasados)} icon="⏰" color={C.red} glow={C.redGlow} subtitle={kpis.atrasados > 0 ? "⚡ Ação necessária" : "✓ Tudo em dia"} />
            <KPICard label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} icon="🎯" color={C.purple} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 14, marginTop: 14 }}>
            <KPICard label="Ganhos" value={formatNum(kpis.ganhos)} icon="✅" color={C.green} glow={C.greenGlow} />
            <KPICard label="Perdidos" value={formatNum(kpis.perdidos)} icon="❌" color={C.red} glow={C.redGlow} />
            <KPICard label="Receita Total" value={formatBRL(kpis.receita)} icon="🏆" color={C.emerald} />
            <KPICard label="Conversão" value={`${kpis.taxaConversao || 0}%`} icon="📈" color={C.cyan} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "5fr 2fr", gap: 14, marginTop: 20 }}>
            <ChartCard title="📈 Evolução Mensal" height={280}>
              {evolution?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution}>
                    <defs>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.brand} stopOpacity={0.3} /><stop offset="100%" stopColor={C.brand} stopOpacity={0} /></linearGradient>
                      <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.3} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="mes" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} />
                    <Tooltip content={<CTooltip />} />
                    <Area type="monotone" dataKey="criados" stroke={C.brand} strokeWidth={2} fill="url(#gC)" name="Criados" />
                    <Area type="monotone" dataKey="ganhos" stroke={C.green} strokeWidth={2} fill="url(#gG)" name="Ganhos" />
                    <Line type="monotone" dataKey="perdidos" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} name="Perdidos" />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.textMuted }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textDim }}>Dados insuficientes</div>}
            </ChartCard>
            <ChartCard title="📊 Distribuição" height={280}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>{pieData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip content={<CTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} formatter={v => <span style={{ color: C.text }}>{v}</span>} /></PieChart>
                </ResponsiveContainer>
              ) : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textDim }}>Sem dados</div>}
            </ChartCard>
          </div>
        </>)}

        {/* FUNNEL */}
        {tab === "funnel" && (<>
          <SectionHeader icon="🔻" subtitle={selectedPanel ? `Painel: ${selectedPanel}` : "Todos os painéis"}>Funil de Vendas</SectionHeader>
          {funnel?.length > 0 ? (<>
            <ChartCard title="Cards por Etapa" height={Math.max(250, funnel.length * 45)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} /><XAxis type="number" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} /><YAxis type="category" dataKey="etapa" width={170} tick={{ fill: C.text, fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: C.border }} />
                  <Tooltip content={<CTooltip />} /><Bar dataKey="total" radius={[0, 6, 6, 0]} name="Cards">{funnel.map((_, i) => <Cell key={i} fill={C.funnelPalette[i % C.funnelPalette.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <div style={{ height: 14 }} />
            <ChartCard title="Valor por Etapa (R$)" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="etapa" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={{ stroke: C.border }} angle={-20} textAnchor="end" height={65} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} tickFormatter={v => formatBRL(v)} />
                  <Tooltip content={<CTooltip isCurrency />} /><Bar dataKey="valor" radius={[6, 6, 0, 0]} name="Valor">{funnel.map((_, i) => <Cell key={i} fill={C.funnelPalette[i % C.funnelPalette.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Detalhamento</div>
              <DataTable columns={[
                { key: "etapa", label: "Etapa", bold: true }, { key: "total", label: "Cards", align: "center" },
                { key: "valor", label: "Valor", align: "right", mono: true, render: r => formatBRL(r.valor) },
                { key: "pct", label: "% Total", align: "center", render: r => { const t = funnel.reduce((s, f) => s + f.total, 0); return t > 0 ? `${(r.total * 100 / t).toFixed(1)}%` : "0%"; } },
              ]} data={funnel} />
            </div>
          </>) : <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>Nenhum dado no funil</div>}
        </>)}

        {/* TEAM */}
        {tab === "team" && (<>
          <SectionHeader icon="👥" subtitle="Desempenho individual">Performance da Equipe</SectionHeader>
          {ranking?.length > 0 ? (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginBottom: 20 }}>
              {ranking.slice(0, 4).map((r, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, borderLeft: `3px solid ${[C.amber, "#aab", "#cd7f32", C.brand][i]}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{["🥇", "🥈", "🥉", "4️⃣"][i]}</span>
                    <Badge text={r.taxa ? `${r.taxa}%` : "—"} color={r.taxa >= 50 ? C.green : C.amber} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{r.responsavel}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.green, fontFamily: NUM_FONT }}>{formatBRL(r.receita)}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>{r.ganhos} ganhos · {r.perdidos} perdidos · {r.total} total</div>
                </div>
              ))}
            </div>
            <ChartCard title="Receita por Responsável" height={Math.max(180, ranking.length * 40)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranking} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} /><XAxis type="number" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} tickFormatter={v => formatBRL(v)} /><YAxis type="category" dataKey="responsavel" width={130} tick={{ fill: C.text, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                  <Tooltip content={<CTooltip isCurrency />} /><Bar dataKey="receita" radius={[0, 6, 6, 0]} fill={C.green} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Ranking Completo</div>
              <DataTable columns={rankCols} data={ranking} />
            </div>
          </>) : <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>Sem dados de responsáveis</div>}
        </>)}

        {/* ALERTS */}
        {tab === "alerts" && (<>
          <SectionHeader icon="🚨" subtitle="Cards atrasados e valores em risco">Alertas e Atrasos</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 14, marginBottom: 20 }}>
            <KPICard label="Atrasados" value={formatNum(overdue?.length || 0)} icon="⏰" color={C.red} glow={C.redGlow} />
            <KPICard label="Valor em Risco" value={formatBRL(overdue?.reduce((s, o) => s + o.valor, 0) || 0)} icon="💸" color={C.amber} glow={C.amberGlow} />
            <KPICard label="Maior Atraso" value={`${overdue?.length ? Math.max(...overdue.map(o => o.dias)) : 0}d`} icon="📅" color={C.red} />
            <KPICard label="Média Atraso" value={`${overdue?.length ? Math.round(overdue.reduce((s, o) => s + o.dias, 0) / overdue.length) : 0}d`} icon="📊" color={C.amber} />
          </div>
          {overdue?.length > 0 ? (<>
            <ChartCard title="Atrasados por Responsável" height={Math.max(150, Object.keys(overdue.reduce((a, o) => { a[o.responsavel] = 1; return a; }, {})).length * 40)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(overdue.reduce((acc, o) => { acc[o.responsavel] = (acc[o.responsavel] || 0) + 1; return acc; }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} /><XAxis type="number" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} /><YAxis type="category" dataKey="name" width={130} tick={{ fill: C.text, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                  <Tooltip content={<CTooltip />} /><Bar dataKey="count" radius={[0, 6, 6, 0]} fill={C.red} name="Atrasados" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Detalhamento — Cards Atrasados</div>
              <DataTable columns={overdueCols} data={overdue} />
            </div>
          </>) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Nenhum card atrasado!</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>Todos os cards estão dentro do prazo.</div>
            </div>
          )}
        </>)}

        {/* FOOTER */}
        <div style={{ marginTop: 60, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={LOGO_URL} alt="FalowCRM" style={{ height: 16, opacity: 0.5 }} />
          <div style={{ fontSize: 10, color: C.textDim }}>Powered by Supabase</div>
        </div>
      </main>
    </div>
  );
}
