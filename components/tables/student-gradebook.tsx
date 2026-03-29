import { ScoreType } from "@prisma/client";
import { type Locale } from "@/lib/i18n";
import { cn, formatPercent } from "@/lib/utils";

type GradebookRow = {
  subjectId: string;
  subjectName: string;
  scoreType: ScoreType;
  averageScore: number | null;
  currentRawScore: string | null;
  currentNormalizedScore: number | null;
  finalScore: number | null;
  riskScore: number;
  status: "strong" | "stable" | "risk";
  statusLabel: string;
  trendLabel: string;
  periods: Array<{
    id: string;
    label: string;
    rawScore: string | null;
    normalizedScore: number | null;
    finalScore: number | null;
    recordedAt: Date;
  }>;
  attendance: {
    totalMissCount: number;
    missingWithoutReason: number;
    missingBySick: number;
    missingDue: number;
    missingByAnotherReason: number;
  } | null;
};

const copy = {
  ru: {
    title: "Оценки из BilimClass",
    subtitle: "История по периодам, текущий результат, риск и посещаемость по каждому предмету.",
    current: "Текущая",
    average: "Средний результат",
    final: "Итог",
    attendance: "Пропуски",
    unexcused: "Без причины",
    periods: "Периоды",
    noData: "Данных по BilimClass пока нет. Подключите аккаунт и выполните первую синхронизацию.",
    noScore: "Без оценки"
  },
  kz: {
    title: "BilimClass бағалары",
    subtitle: "Әр пән бойынша кезеңдер тарихы, ағымдағы нәтиже, тәуекел және қатысу деректері.",
    current: "Ағымдағы",
    average: "Орташа нәтиже",
    final: "Қорытынды",
    attendance: "Босатулар",
    unexcused: "Себепсіз",
    periods: "Кезеңдер",
    noData: "BilimClass деректері әлі жоқ. Аккаунтты қосып, алғашқы синхрондауды орындаңыз.",
    noScore: "Бағасыз"
  }
} as const;

function scoreTone(score: number | null) {
  if (score === null) {
    return "bg-slate-100 text-slate-500";
  }

  if (score >= 80) {
    return "bg-success/15 text-success";
  }

  if (score >= 60) {
    return "bg-warning/15 text-warning";
  }

  return "bg-danger/15 text-danger";
}

function renderScore(row: GradebookRow) {
  if (row.scoreType === ScoreType.no_score) {
    return null;
  }

  if (row.currentRawScore !== null) {
    return row.currentRawScore;
  }

  if (row.currentNormalizedScore !== null) {
    return formatPercent(row.currentNormalizedScore);
  }

  return "—";
}

export function StudentGradebook({
  locale,
  rows
}: {
  locale: Locale;
  rows: GradebookRow[];
}) {
  const t = copy[locale];

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-ink">{t.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
        </div>
      </div>

      {!rows.length ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500">
          {t.noData}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map((row) => (
            <div key={row.subjectId} className="rounded-3xl border border-slate-200/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-ink">{row.subjectName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className={cn("pill", scoreTone(row.currentNormalizedScore))}>
                      {row.scoreType === ScoreType.no_score ? t.noScore : `${t.current}: ${renderScore(row)}`}
                    </span>
                    <span className="pill bg-slate-100 text-slate-600">
                      {t.average}: {row.averageScore !== null ? formatPercent(row.averageScore) : "—"}
                    </span>
                    <span className="pill bg-royal/10 text-royal">{row.statusLabel}</span>
                    <span className="text-slate-500">{row.trendLabel}</span>
                  </div>
                </div>
                <div className="grid gap-2 text-right text-sm text-slate-500">
                  <div>
                    {t.final}: <span className="font-semibold text-ink">{row.finalScore !== null ? formatPercent(row.finalScore) : "—"}</span>
                  </div>
                  <div>
                    {t.attendance}: <span className="font-semibold text-ink">{row.attendance?.totalMissCount ?? 0}</span>
                  </div>
                  <div>
                    {t.unexcused}: <span className="font-semibold text-danger">{row.attendance?.missingWithoutReason ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.periods}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.periods.map((period) => (
                    <div key={period.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <div className="font-medium text-ink">{period.label}</div>
                      <div className="mt-1 text-slate-500">
                        {period.rawScore ?? (period.normalizedScore !== null ? formatPercent(period.normalizedScore) : "—")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
