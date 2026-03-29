import type { GradeSubjectSummary } from "@/lib/bilimclass/gradebook";
import { GradesTableRow } from "@/components/grades/grades-table-row";

type Locale = "ru" | "kz";

const copy = {
  ru: {
    subject: "Предмет",
    grades: "Оценки",
    fb: "%ФБ",
    bzhb: "%БЖБ",
    tzhb: "%ТЖБ",
    prediction: "Прогноз",
    final: "Итог",
    empty: "Данные по выбранному периоду пока недоступны."
  },
  kz: {
    subject: "Пән",
    grades: "Бағалар",
    fb: "%ФБ",
    bzhb: "%БЖБ",
    tzhb: "%ТЖБ",
    prediction: "Болжам",
    final: "Қорытынды",
    empty: "Таңдалған кезең бойынша деректер әлі қолжетімсіз."
  }
} as const;

export function GradesTable({
  locale,
  rows,
  selectedSubjectId,
  onSelect
}: {
  locale: Locale;
  rows: GradeSubjectSummary[];
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
}) {
  const t = copy[locale];

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell min-w-[220px]">{t.subject}</th>
              <th className="table-header-cell min-w-[240px]">{t.grades}</th>
              <th className="table-header-cell text-center">{t.fb}</th>
              <th className="table-header-cell text-center">{t.bzhb}</th>
              <th className="table-header-cell text-center">{t.tzhb}</th>
              <th className="table-header-cell text-center">{t.prediction}</th>
              <th className="table-header-cell text-center">{t.final}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <GradesTableRow
                  key={row.subjectId}
                  item={row}
                  selected={selectedSubjectId === row.subjectId}
                  onSelect={() => onSelect(row.subjectId)}
                />
              ))
            ) : (
              <tr className="table-row">
                <td colSpan={7} className="table-cell py-8 text-center text-slate-500">
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
