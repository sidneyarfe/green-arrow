import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { TopbarProvider } from "@/lib/topbarContext";
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Green Arrow — Cold Mail Engine",
  description: "Plataforma de Cold Mail de alta performance. Orquestre múltiplas instâncias de envio via Google Apps Script.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${dmSans.variable} ${dmMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif", background: 'var(--bg)', color: 'var(--text-2)' }}>
        <TopbarProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </TopbarProvider>
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  );
}

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
}
