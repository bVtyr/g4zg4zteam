import { RiskBadge } from "@/components/cards/risk-badge";
import { type Locale, getDictionary } from "@/lib/i18n";
import { formatPercent } from "@/lib/utils";

export function TeacherRiskTable({
  items,
  locale
}: {
  items: Array<{
    studentName: string;
    className: string;
    highestRisk: {
      subjectName: string;
      riskScore: number;
      trend: string;
      explanation: string;
      knowledgeGaps?: Array<{ title: string; mastery: number }>;
    };
    misses: number;
    avgScore: number | null;
  }>;
  locale: Locale;
}) {
  const copy = getDictionary(locale);

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-ink">{locale === "kz" ? "Ерте ескерту жүйесі" : "Система раннего предупреждения"}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">{copy.teacher.student}</th>
              <th className="px-5 py-3">{copy.common.class}</th>
              <th className="px-5 py-3">{copy.common.subject}</th>
              <th className="px-5 py-3">{copy.common.risk}</th>
              <th className="px-5 py-3">{copy.common.average}</th>
              <th className="px-5 py-3">{copy.teacher.misses}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.studentName}-${item.highestRisk?.subjectName ?? "no-risk"}`} className="border-t border-slate-100">
                <td className="px-5 py-4 font-medium text-ink">{item.studentName}</td>
                <td className="px-5 py-4">{item.className}</td>
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{item.highestRisk?.subjectName ?? copy.common.notAvailable}</div>
                  <div className="text-xs text-slate-500">{item.highestRisk?.trend ?? copy.common.notAvailable}</div>
                  {item.highestRisk?.knowledgeGaps?.[0] ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {item.highestRisk.knowledgeGaps[0].title}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <RiskBadge score={item.highestRisk?.riskScore ?? 0} locale={locale} />
                </td>
                <td className="px-5 py-4">{item.avgScore !== null ? formatPercent(item.avgScore) : copy.common.notAvailable}</td>
                <td className="px-5 py-4">{item.misses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
