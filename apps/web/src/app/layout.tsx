import type { Metadata, Viewport } from "next";
import Script from "next/script";

import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ParticipantAuthProvider } from "@/providers/participant-auth-provider";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: "QR Yoklama",
  description: "QR tabanlı yoklama ve katılım yönetim sistemi",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0071e3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`}
        </Script>
        <QueryProvider>
          <AuthProvider>
            <ParticipantAuthProvider>{children}</ParticipantAuthProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
