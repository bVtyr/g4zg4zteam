import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  contentClassName
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-royal/70">{eyebrow}</div>
          ) : null}
          <h2 className="mt-1 text-[1.35rem] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "danger" | "success";
}) {
  const toneClass =
    tone === "accent"
      ? "border-royal/15 bg-royal/[0.03]"
      : tone === "danger"
        ? "border-danger/15 bg-danger/[0.03]"
        : tone === "success"
          ? "border-success/15 bg-success/[0.03]"
          : "border-slate-200 bg-white";

  return (
    <div className={cn("kpi-card", toneClass)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-2 text-[1.75rem] font-semibold leading-none text-ink">{value}</div>
      {hint ? <div className="mt-2 text-sm text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function LinkPanel({
  href,
  title,
  description
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-royal/20 hover:bg-slate-50"
    >
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="mt-1.5 text-sm leading-6 text-slate-600">{description}</div>
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400 transition group-hover:text-royal" />
    </Link>
  );
}
