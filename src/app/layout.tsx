import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { detectPreferredLocale, dictionaries } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const locale = detectPreferredLocale(requestHeaders.get("accept-language"));
  return {
    title: dictionaries[locale].metaTitle,
    description: dictionaries[locale].metaDescription,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f5c50",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = detectPreferredLocale(requestHeaders.get("accept-language"));
  return (
    <html lang={dictionaries[locale].htmlLang}>
      <body>{children}</body>
    </html>
  );
}
