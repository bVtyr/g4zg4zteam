import type { Metadata } from "next";
import "./globals.css";
import { getCurrentLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Aqbobek Lyceum",
  description: "School portal with analytics, scheduling, notifications and BilimClass integration."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getCurrentLocale();

  return (
    <html lang={locale === "kz" ? "kk" : "ru"}>
      <body>{children}</body>
    </html>
  );
}
