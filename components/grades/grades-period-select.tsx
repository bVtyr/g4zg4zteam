import type { GradebookView } from "@/lib/bilimclass/gradebook";

export function GradesPeriodSelect({
  periods,
  activePeriodKey,
  disabled,
  onChange,
  emptyLabel
}: {
  periods: GradebookView["periods"];
  activePeriodKey: string | null;
  disabled?: boolean;
  onChange: (next: string) => void;
  emptyLabel: string;
}) {
  return (
    <select
      value={activePeriodKey ?? ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || !periods.length}
      className="field-select min-w-[180px]"
    >
      {!periods.length ? <option value="">{emptyLabel}</option> : null}
      {periods.map((period) => (
        <option key={period.key} value={period.key}>
          {period.label}
        </option>
      ))}
    </select>
  );
}
