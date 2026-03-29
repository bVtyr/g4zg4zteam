import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RiskBadge({ score, label, locale = "ru" }: { score: number; label?: string; locale?: Locale }) {
  const tone = score >= 60 ? "bg-danger/15 text-danger" : score >= 30 ? "bg-warning/15 text-warning" : "bg-success/15 text-success";
  return <span className={cn("pill", tone)}>{label ?? `${Math.round(score)} ${locale === "kz" ? "тәуекел" : "риск"}`}</span>;
}
