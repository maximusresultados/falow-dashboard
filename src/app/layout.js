export const metadata = {
  title: "FalowCRM Analytics",
  description: "Dashboard analítico de CRM",
  icons: { icon: "https://pdolixqxogpwufwunyds.supabase.co/storage/v1/object/public/LOGO%20FALOW%20CRM/ICONE%20-%20FALOWCRM.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#06080f" }}>
        {children}
      </body>
    </html>
  );
}
