import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RiskBadge({ score, label }: { score: number; label?: string; locale?: Locale }) {
  const tone = score >= 60 ? "bg-danger/15 text-danger" : score >= 30 ? "bg-warning/15 text-warning" : "bg-success/15 text-success";
  const fallback = score >= 60 ? `${Math.round(score)} риск` : score >= 30 ? `${Math.round(score)} контроль` : `${Math.round(score)} стабильно`;
  return <span className={cn("pill", tone)}>{label ?? fallback}</span>;
}

