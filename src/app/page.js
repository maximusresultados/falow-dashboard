"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";

function DashboardWithToken() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div style={{
        minHeight: "100vh", background: "#06080f", display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: "#0f1520", border: "1px solid #1a2235", borderRadius: 16,
          padding: 48, maxWidth: 440, textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#e8ecf4", marginBottom: 8 }}>
            <span style={{ color: "#4f8aff" }}>Falow</span>CRM
          </div>
          <div style={{ fontSize: 14, color: "#7a8baa", lineHeight: 1.6 }}>
            Acesso não autorizado.<br />
            Utilize o link fornecido pela sua empresa para acessar o dashboard.
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard token={token} />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#06080f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4f8aff", fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Carregando...</div>
      </div>
    }>
      <DashboardWithToken />
    </Suspense>
  );
}
