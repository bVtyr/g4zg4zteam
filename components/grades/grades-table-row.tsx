import type { GradeSubjectSummary } from "@/lib/bilimclass/gradebook";
import { FinalGradeBadge } from "@/components/grades/final-grade-badge";
import { GradeBadgesGroup } from "@/components/grades/grade-badges-group";
import { GradeCategoryColumns } from "@/components/grades/grade-category-columns";
import { GradePredictionBadge } from "@/components/grades/grade-prediction-badge";
import { cn } from "@/lib/utils";

export function GradesTableRow({
  item,
  selected,
  onSelect
}: {
  item: GradeSubjectSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr className={cn("table-row cursor-pointer transition hover:bg-slate-50", selected && "bg-royal/[0.03]")} onClick={onSelect}>
      <td className="table-cell">
        <div className="font-semibold text-ink">{item.subjectName}</div>
        <div className="mt-1 text-xs text-slate-500">{item.trendLabel}</div>
      </td>
      <td className="table-cell">
        <GradeBadgesGroup items={item.grades} />
      </td>
      <GradeCategoryColumns value={item.categoryStats} />
      <td className="table-cell text-center">
        <GradePredictionBadge value={item.predictedGrade} />
      </td>
      <td className="table-cell text-center">
        <FinalGradeBadge value={item.finalGrade} />
      </td>
    </tr>
  );
}
