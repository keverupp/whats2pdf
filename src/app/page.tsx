import { headers } from "next/headers";
import { WhatsAppConverter } from "@/components/whatsapp-converter";
import { detectPreferredLocale } from "@/lib/i18n";

export default async function Home() {
  const requestHeaders = await headers();
  const initialLocale = detectPreferredLocale(requestHeaders.get("accept-language"));
  return <WhatsAppConverter initialLocale={initialLocale} />;
}
