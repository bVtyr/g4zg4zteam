import { RiskBadge } from "@/components/cards/risk-badge";
import { type Locale } from "@/lib/i18n";
import { formatPercent } from "@/lib/utils";

export function TeacherRiskTable({
  items,
  locale
}: {
  items: Array<{
    studentId: string;
    studentName: string;
    className: string;
    riskScore: number;
    highestRisk: {
      subjectName: string;
      trendLabel: string;
      knowledgeGaps?: Array<{ title: string; mastery: number }>;
    } | null;
    explanation: string;
    recommendation: string;
    misses: number;
    avgScore: number | null;
  }>;
  locale: Locale;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-ink">Early warning</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">Ученик</th>
              <th className="px-5 py-3">Ключевой риск</th>
              <th className="px-5 py-3">Почему сейчас</th>
              <th className="px-5 py-3">Следующий шаг</th>
              <th className="px-5 py-3">Средний балл</th>
              <th className="px-5 py-3">Пропуски</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.studentId} className="border-t border-slate-100 align-top">
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{item.studentName}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.className}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{item.highestRisk?.subjectName ?? "Нет данных"}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.highestRisk?.trendLabel ?? "—"}</div>
                  <div className="mt-2">
                    <RiskBadge score={item.riskScore} locale={locale} />
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{item.explanation}</td>
                <td className="px-5 py-4 text-slate-600">{item.recommendation}</td>
                <td className="px-5 py-4">{item.avgScore !== null ? formatPercent(item.avgScore) : "—"}</td>
                <td className="px-5 py-4">{item.misses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

