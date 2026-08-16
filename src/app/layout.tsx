import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { detectPreferredLocale, dictionaries } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const locale = detectPreferredLocale(requestHeaders.get("accept-language"));
  const { metaTitle, metaDescription, htmlLang } = dictionaries[locale];
  return {
    title: metaTitle,
    description: metaDescription,
    applicationName: "Whats2PDF",
    openGraph: {
      type: "website",
      siteName: "Whats2PDF",
      title: metaTitle,
      description: metaDescription,
      locale: htmlLang.replace("-", "_"),
    },
    twitter: {
      card: "summary",
      title: metaTitle,
      description: metaDescription,
    },
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
