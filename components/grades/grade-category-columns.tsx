import type { GradeCategoryStats } from "@/lib/bilimclass/gradebook";
import { formatPercent } from "@/lib/utils";

function renderValue(value: number | null) {
  return value === null ? "—" : formatPercent(value);
}

export function GradeCategoryColumns({
  value
}: {
  value: GradeCategoryStats;
}) {
  return (
    <>
      <td className="table-cell text-center">{renderValue(value.formative)}</td>
      <td className="table-cell text-center">{renderValue(value.summative)}</td>
      <td className="table-cell text-center">{renderValue(value.term)}</td>
    </>
  );
}
