"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  label,
  names,
  dark = false
}: {
  locale: Locale;
  label: string;
  names: Record<Locale, string>;
  dark?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs uppercase tracking-[0.2em] ${dark ? "text-white/60" : "text-slate-500"}`}>{label}</span>
      <div className={`inline-flex rounded-full p-1 ${dark ? "bg-white/10" : "bg-slate-100"}`}>
        {(["ru", "kz"] as const).map((item) => (
          <button
            key={item}
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await fetch("/api/preferences/locale", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ locale: item })
                });
                router.refresh();
              })
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              locale === item
                ? dark
                  ? "bg-white text-ink"
                  : "bg-royal text-white"
                : dark
                  ? "text-white/75"
                  : "text-slate-600"
            }`}
          >
            {names[item]}
          </button>
        ))}
      </div>
    </div>
  );
}
