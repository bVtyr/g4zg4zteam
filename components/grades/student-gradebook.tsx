"use client";

import { useEffect, useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import type { GradebookView } from "@/lib/bilimclass/gradebook";
import { GradeLegend } from "@/components/grades/grade-legend";
import { GradesPeriodSelect } from "@/components/grades/grades-period-select";
import { GradesTable } from "@/components/grades/grades-table";
import { GradesTabs } from "@/components/grades/grades-tabs";
import { SubjectGradeDetailsDrawer } from "@/components/grades/subject-grade-details-drawer";

const copy = {
  ru: {
    title: "Успеваемость из BilimClass",
    subtitle:
      "Табличный журнал по предметам, периодам и итоговым оценкам в рабочем формате, близком к BilimClass.",
    empty: "Подключите BilimClass и выполните первую синхронизацию, чтобы загрузить журнал оценок.",
    loading: "Загрузка оценок...",
    refreshError: "Не удалось обновить данные BilimClass."
  },
  kz: {
    title: "BilimClass үлгерімі",
    subtitle:
      "BilimClass логикасына жақын жұмыс форматындағы пәндер, кезеңдер және қорытынды бағалар журналы.",
    empty: "Бағалар журналын жүктеу үшін BilimClass аккаунтын қосып, алғашқы синхрондауды орындаңыз.",
    loading: "Бағалар жүктеліп жатыр...",
    refreshError: "BilimClass деректерін жаңарту мүмкін болмады."
  }
} as const;

export function StudentGradebook({
  locale,
  initialData,
  connected
}: {
  locale: Locale;
  initialData: GradebookView;
  connected: boolean;
}) {
  const t = copy[locale];
  const [view, setView] = useState(initialData);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialData.rows[0]?.subjectId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setView(initialData);
    setSelectedSubjectId(initialData.rows[0]?.subjectId ?? null);
  }, [initialData]);

  const selectedItem = view.rows.find((row) => row.subjectId === selectedSubjectId) ?? view.rows[0] ?? null;

  function reload(next: { tab?: "grades" | "year"; periodKey?: string | null }) {
    startTransition(async () => {
      setError(null);

      const tab = next.tab ?? view.activeTab;
      const params = new URLSearchParams({
        locale,
        tab
      });

      const periodKey = next.periodKey ?? (tab === "year" ? null : view.activePeriodKey);
      if (periodKey) {
        params.set("periodKey", periodKey);
      }

      const response = await fetch(`/api/student/bilimclass/grades?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        setError(t.refreshError);
        return;
      }

      const nextView = payload as GradebookView;
      setView(nextView);
      setSelectedSubjectId(nextView.rows[0]?.subjectId ?? null);
    });
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">{t.title}</h3>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GradesTabs
            tabs={view.tabs}
            activeTab={view.activeTab}
            onChange={(tab) => reload({ tab, periodKey: tab === "year" ? null : view.activePeriodKey })}
          />
          {view.activeTab === "grades" ? (
            <GradesPeriodSelect
              periods={view.periods}
              activePeriodKey={view.activePeriodKey}
              emptyLabel="—"
              disabled={!connected || isPending}
              onChange={(periodKey) => reload({ periodKey })}
            />
          ) : null}
        </div>
      </div>

      {!connected && !view.rows.length ? (
        <div className="py-8 text-sm text-slate-500">{t.empty}</div>
      ) : (
        <div className="mt-4 grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="space-y-4">
            {isPending ? <div className="text-sm text-slate-500">{t.loading}</div> : null}
            {error ? <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}
            <GradesTable
              locale={locale}
              rows={view.rows}
              selectedSubjectId={selectedSubjectId}
              onSelect={setSelectedSubjectId}
            />
            <GradeLegend items={view.legend} note={view.dataSource.strategyNote} />
          </div>
          <SubjectGradeDetailsDrawer locale={locale} item={selectedItem} />
        </div>
      )}
    </div>
  );
}
