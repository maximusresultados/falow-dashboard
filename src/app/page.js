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
          <img src="https://pdolixqxogpwufwunyds.supabase.co/storage/v1/object/public/LOGO%20FALOW%20CRM/LOGO%20FALOWCRM%20-%20OFICIAL%20(1200%20x%20500%20px)%20(3).png" alt="FalowCRM" style={{ height: 42, marginBottom: 20 }} />
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
