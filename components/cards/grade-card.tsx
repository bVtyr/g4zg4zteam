import { ScoreType } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import { RiskBadge } from "@/components/cards/risk-badge";
import { type Locale, getDictionary, translateScoreType } from "@/lib/i18n";
import { formatPercent } from "@/lib/utils";

export function GradeCard({
  item,
  locale
}: {
  item: {
    subjectName: string;
    averageScore: number | null;
    riskScore: number;
    trend: string;
    trendLabel?: string;
    status: "strong" | "stable" | "risk";
    statusLabel?: string;
    scoreType: ScoreType;
    probabilityFail: number;
  };
  locale: Locale;
}) {
  const copy = getDictionary(locale);

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{translateScoreType(locale, item.scoreType)}</div>
          <h3 className="mt-1.5 text-base font-semibold text-ink">{item.subjectName}</h3>
        </div>
        <RiskBadge score={item.riskScore} label={item.statusLabel ?? item.status} locale={locale} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-slate-500">{copy.common.average}</div>
          <div className="mt-1 text-xl font-semibold text-ink">
            {item.averageScore !== null ? formatPercent(item.averageScore) : copy.common.notAvailable}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-slate-500">{copy.common.probabilityFail}</div>
          <div className="mt-1 text-xl font-semibold text-ink">{formatPercent(item.probabilityFail)}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>{copy.common.trend}: {item.trendLabel ?? item.trend}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}
