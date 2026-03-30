"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { getScheduleSectionCopy } from "@/lib/schedule/copy";
import { scheduleSectionItems } from "@/lib/schedule/navigation";
import { cn } from "@/lib/utils";

export function ScheduleSidebarSection({
  locale,
  currentPath
}: {
  locale: "ru" | "kz";
  currentPath: string;
}) {
  const copy = getScheduleSectionCopy(locale);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
        <CalendarDays className="h-4 w-4" />
        {copy.section}
      </div>
      <div className="space-y-1">
        {scheduleSectionItems.map((item) => {
          const active = item.href === "/admin/schedule" ? currentPath === item.href : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
          const label =
            item.key === "resources"
              ? locale === "kz"
                ? "Resources"
                : "Ресурсы"
              : copy[item.key];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <span>{label}</span>
              <ChevronRight className={cn("h-4 w-4 opacity-60", active && "opacity-100")} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
