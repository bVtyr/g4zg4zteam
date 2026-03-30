"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScheduleIssueStack } from "@/components/schedule/schedule-issue-stack";
import { ScheduleOverviewMetrics } from "@/components/schedule/schedule-overview-metrics";
import { ScheduleResponsiveGrid } from "@/components/schedule/schedule-responsive-grid";

type DraftBatch = {
  id: string;
  status: string;
  classIds: string[];
  activeDays: number[];
  maxLessonsPerDay?: number;
  scheduleProfile?: string;
  respectManualLocked?: boolean;
  optimization?: {
    preset?: string;
    advancedOptions?: {
      backtrackingLimit?: number | unknown;
      avoidLateSlotsForJuniors?: boolean | unknown;
      preferRoomStability?: boolean | unknown;
      allowSameSubjectMultipleTimesPerDay?: boolean | unknown;
    } | null;
  } | null;
  statistics: {
    placedLessons: number;
    preservedLessons: number;
    totalLessons: number;
    activeClassCount: number;
    totalSelectedClasses: number;
  } | null;
  conflicts: Array<any>;
  unplaced: Array<any>;
  notes: string[];
  entries: Array<any>;
  weeklyRequirements?: {
    summary: {
      requirementCount: number;
      requiredLessons: number;
      actualLessons: number;
      matched: number;
      missing: number;
      overflow: number;
      issues: number;
    };
    issues: Array<{
      key: string;
      className: string;
      classGroupName: string | null;
      subjectName: string;
      requiredCount: number;
      actualCount: number;
      difference: number;
      source: "template" | "assignment" | "schedule-only";
      severity: "warning" | "error";
    }>;
  };
};

export function ScheduleGeneratorWorkbench({
  locale,
  initialFilters,
  dashboard,
  classes,
  maxSlotCount,
  timeSlots,
  initialDraft,
  initialDraftComparison,
  initialDraftHealth
}: {
  locale: "ru" | "kz";
  initialFilters: {
    schoolYear: string;
    term: string;
  };
  dashboard: {
    totalClasses: number;
    activeEntries: number;
    conflicts: number;
    unplacedLessons: number;
    lastGenerationAt: Date | string | null;
    lastAppliedAt: Date | string | null;
  };
  classes: Array<{ id: string; name: string; gradeLevel: number }>;
  maxSlotCount: number;
  timeSlots: Array<{ slotNumber: number; startTime: string; endTime: string }>;
  initialDraft: DraftBatch | null;
  initialDraftComparison: {
    moved: number;
    unchanged: number;
    added: number;
    removed: number;
    preserved: number;
  } | null;
  initialDraftHealth: Record<string, number> | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [schoolYear, setSchoolYear] = useState(initialFilters.schoolYear);
  const [term, setTerm] = useState(initialFilters.term);
  const [scheduleProfile, setScheduleProfile] = useState<"database" | "default">(
    initialDraft?.scheduleProfile === "default" ? "default" : "database"
  );
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    initialDraft?.classIds?.length ? initialDraft.classIds : classes.map((item) => item.id)
  );
  const [activeDays, setActiveDays] = useState<number[]>(initialDraft?.activeDays?.length ? initialDraft.activeDays : [1, 2, 3, 4, 5]);
  const [maxLessonsPerDay, setMaxLessonsPerDay] = useState(initialDraft?.maxLessonsPerDay ?? Math.min(7, maxSlotCount));
  const [respectManualLocked, setRespectManualLocked] = useState(initialDraft?.respectManualLocked ?? true);
  const [optimizationPreset, setOptimizationPreset] = useState<"balanced" | "teacher_friendly" | "compact">(
    initialDraft?.optimization?.preset === "teacher_friendly"
      ? "teacher_friendly"
      : initialDraft?.optimization?.preset === "compact"
        ? "compact"
        : "balanced"
  );
  const [autoApply, setAutoApply] = useState(false);
  const [backtrackingLimit, setBacktrackingLimit] = useState(
    typeof initialDraft?.optimization?.advancedOptions?.backtrackingLimit === "number"
      ? initialDraft.optimization.advancedOptions.backtrackingLimit
      : 15000
  );
  const [avoidLateSlotsForJuniors, setAvoidLateSlotsForJuniors] = useState(
    typeof initialDraft?.optimization?.advancedOptions?.avoidLateSlotsForJuniors === "boolean"
      ? initialDraft.optimization.advancedOptions.avoidLateSlotsForJuniors
      : true
  );
  const [preferRoomStability, setPreferRoomStability] = useState(
    typeof initialDraft?.optimization?.advancedOptions?.preferRoomStability === "boolean"
      ? initialDraft.optimization.advancedOptions.preferRoomStability
      : true
  );
  const [allowSameSubjectMultipleTimesPerDay, setAllowSameSubjectMultipleTimesPerDay] = useState(
    typeof initialDraft?.optimization?.advancedOptions?.allowSameSubjectMultipleTimesPerDay ===
      "boolean"
      ? initialDraft.optimization.advancedOptions.allowSameSubjectMultipleTimesPerDay
      : false
  );
  const [draft, setDraft] = useState<DraftBatch | null>(initialDraft);
  const [feedback, setFeedback] = useState<string | null>(null);
  const visibleDraftComparison =
    draft && initialDraft && draft.id === initialDraft.id ? initialDraftComparison : null;
  const visibleDraftHealth =
    draft && initialDraft && draft.id === initialDraft.id ? initialDraftHealth : null;

  const copy = {
    generate: "Собрать draft",
    generating: "Идёт генерация...",
    apply: "Опубликовать расписание",
    export: "Экспорт в Excel",
    selectAll: "Выбрать все",
    clear: "Очистить",
    advanced: "Расширенные настройки",
    import: "Импорт из Excel",
    importHint: "При необходимости можно загрузить существующее расписание из файла.",
    importRun: "Импортировать",
    successGenerate: "Draft обновлён.",
    successApply: "Расписание опубликовано в системе.",
    successImport: "Импорт Excel завершён.",
    failed: "Не удалось выполнить действие.",
    schoolYear: "Учебный год",
    term: "Период",
    profile: "Профиль слотов",
    days: "Рабочие дни",
    lessons: "Максимум уроков в день",
    manualLocked: "Сохранять locked и manual записи",
    optimization: "Профиль оптимизации",
    autoApply: "Сразу публиковать при успехе",
    backtracking: "Лимит backtracking",
    late: "Снижать поздние слоты у младших классов",
    roomStability: "Сохранять стабильность кабинетов",
    sameSubject: "Разрешить повтор предмета в один день",
    summary: "Результат draft",
    weekly: "Недельная нагрузка",
    weeklyOk: "Недельная нагрузка совпадает с настройками.",
    weeklyHint: "Генератор сравнивает обязательное количество уроков по каждому предмету с фактическим draft.",
    notes: "Примечания",
    classes: "Классы в генерации",
    noDraft: "После генерации здесь появится preview расписания."
  };

  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт"];
  const profileOptions = [
    {
      value: "database",
      label: "Активная сетка"
    },
    {
      value: "default",
      label: "Базовая сетка"
    }
  ];
  const optimizationOptions = [
    {
      value: "balanced",
      label: "Сбалансированный"
    },
    {
      value: "teacher_friendly",
      label: "Щадящий для учителей"
    },
    {
      value: "compact",
      label: "Компактный"
    }
  ];
  function toggleClass(classId: string) {
    setSelectedClassIds((current) =>
      current.includes(classId) ? current.filter((item) => item !== classId) : [...current, classId]
    );
  }

  function toggleDay(day: number) {
    setActiveDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b)
    );
  }

  async function runGenerate() {
    setFeedback(null);
    const response = await fetch("/api/admin/schedule/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schoolYear,
        term,
        classIds: selectedClassIds,
        activeDays,
        maxLessonsPerDay,
        scheduleProfile,
        respectManualLocked,
        autoApply,
        optimizationPreset,
        advancedOptions: {
          backtrackingLimit,
          avoidLateSlotsForJuniors,
          preferRoomStability,
          allowSameSubjectMultipleTimesPerDay
        }
      })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      return;
    }

    setDraft(body?.batch ?? null);
    setFeedback(body?.applyError?.error ?? (autoApply ? copy.successApply : copy.successGenerate));
    startTransition(() => router.refresh());
  }

  async function runApply() {
    if (!draft) {
      return;
    }

    setFeedback(null);
    const response = await fetch(`/api/admin/schedule/drafts/${draft.id}/apply`, {
      method: "POST"
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      return;
    }

    setFeedback(copy.successApply);
    startTransition(() => router.refresh());
  }

  async function runImport(file: File) {
    setFeedback(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("schoolYear", schoolYear);
    formData.set("term", term);
    const response = await fetch("/api/admin/schedule/import", {
      method: "POST",
      body: formData
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      return;
    }

    setFeedback(copy.successImport);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <ScheduleOverviewMetrics locale={locale} stats={dashboard} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 xl:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.95fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">{copy.schoolYear}</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  value={schoolYear}
                  onChange={(event) => setSchoolYear(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">{copy.term}</span>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                >
                  {["Q1", "Q2", "Q3", "Q4", "H1", "H2"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">{copy.profile}</span>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  value={scheduleProfile}
                  onChange={(event) => setScheduleProfile(event.target.value as "database" | "default")}
                >
                  {profileOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">{copy.lessons}</span>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  value={maxLessonsPerDay}
                  onChange={(event) => setMaxLessonsPerDay(Number(event.target.value))}
                >
                  {Array.from({ length: maxSlotCount }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <div className="text-sm text-slate-500">{copy.days}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {dayLabels.map((label, index) => {
                  const day = index + 1;
                  const active = activeDays.includes(day);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                        active ? "bg-royal text-white" : "border border-slate-300 text-slate-600"
                      }`}
                      onClick={() => toggleDay(day)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={respectManualLocked}
                onChange={(event) => setRespectManualLocked(event.target.checked)}
              />
              {copy.manualLocked}
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink">{copy.classes}</div>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-royal" onClick={() => setSelectedClassIds(classes.map((item) => item.id))}>
                  {copy.selectAll}
                </button>
                <button type="button" className="text-xs text-slate-500" onClick={() => setSelectedClassIds([])}>
                  {copy.clear}
                </button>
              </div>
            </div>
            <div className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1">
              {classes.map((schoolClass) => {
                const checked = selectedClassIds.includes(schoolClass.id);
                return (
                  <label
                    key={schoolClass.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                      checked ? "border-royal/30 bg-white text-ink" : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleClass(schoolClass.id)} />
                    <span>{schoolClass.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-500">{copy.optimization}</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                value={optimizationPreset}
                onChange={(event) =>
                  setOptimizationPreset(event.target.value as "balanced" | "teacher_friendly" | "compact")
                }
              >
                {optimizationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-ink">{copy.advanced}</summary>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={autoApply} onChange={(event) => setAutoApply(event.target.checked)} />
                  {copy.autoApply}
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={avoidLateSlotsForJuniors}
                    onChange={(event) => setAvoidLateSlotsForJuniors(event.target.checked)}
                  />
                  {copy.late}
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={preferRoomStability}
                    onChange={(event) => setPreferRoomStability(event.target.checked)}
                  />
                  {copy.roomStability}
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowSameSubjectMultipleTimesPerDay}
                    onChange={(event) => setAllowSameSubjectMultipleTimesPerDay(event.target.checked)}
                  />
                  {copy.sameSubject}
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-500">{copy.backtracking}</span>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    value={backtrackingLimit}
                    onChange={(event) => setBacktrackingLimit(Number(event.target.value))}
                  />
                </label>
              </div>
            </details>
          </div>

          <button
            type="button"
            className="rounded-xl bg-royal px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isPending || !selectedClassIds.length || !activeDays.length}
            onClick={() => void runGenerate()}
          >
            {isPending ? copy.generating : copy.generate}
          </button>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">{copy.import}</summary>
          <p className="mt-3 text-sm text-slate-600">{copy.importHint}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void runImport(file);
              }
              event.currentTarget.value = "";
            }} />
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              onClick={() => fileInputRef.current?.click()}
            >
              {copy.importRun}
            </button>
          </div>
        </details>
      </section>

      <div className="xl:hidden">
        <div className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {copy.classes}: {selectedClassIds.length}
          </div>
          <button
            type="button"
            className="w-full rounded-2xl bg-royal px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isPending || !selectedClassIds.length || !activeDays.length}
            onClick={() => void runGenerate()}
          >
            {isPending ? copy.generating : copy.generate}
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">{copy.summary}</h3>
            {draft?.notes?.length ? (
              <p className="mt-1 text-sm text-slate-500">{draft.notes.join(" • ")}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {draft ? (
              <>
                <a
                  href={`/api/admin/schedule/drafts/${draft.id}/export`}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  {copy.export}
                </a>
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={
                    isPending ||
                    draft.status === "applied" ||
                    (draft.weeklyRequirements?.issues.length ?? 0) > 0
                  }
                  onClick={() => void runApply()}
                >
                  {copy.apply}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {draft ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {"Поставлено"}
                </div>
                <div className="mt-2 text-3xl font-semibold text-ink">{draft.statistics?.placedLessons ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {"Сохранено"}
                </div>
                <div className="mt-2 text-3xl font-semibold text-ink">{draft.statistics?.preservedLessons ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-danger/15 bg-danger/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {"Конфликты"}
                </div>
                <div className="mt-2 text-3xl font-semibold text-ink">{draft.conflicts.length}</div>
              </div>
              <div className="rounded-2xl border border-warning/20 bg-warning/[0.06] p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {"Неразмещено"}
                </div>
                <div className="mt-2 text-3xl font-semibold text-ink">{draft.unplaced.length}</div>
              </div>
            </div>

            {visibleDraftComparison ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {"Переносы"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{visibleDraftComparison.moved}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {"Без изменений"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{visibleDraftComparison.unchanged}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {"Новые"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{visibleDraftComparison.added}</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {"Уходят"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{visibleDraftComparison.removed}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {"Защищено"}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{visibleDraftComparison.preserved}</div>
                </div>
              </div>
            ) : null}

            {visibleDraftHealth ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["critical", "Критичные", "border-rose-200 bg-rose-50"],
                  ["high", "Высокие", "border-orange-200 bg-orange-50"],
                  ["medium", "Средние", "border-amber-200 bg-amber-50"],
                  ["low", "Низкие", "border-slate-200 bg-white"]
                ].map(([key, label, tone]) => (
                  <div key={key} className={`rounded-2xl border p-4 ${tone}`}>
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {visibleDraftHealth[key as keyof typeof visibleDraftHealth] ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {draft.weeklyRequirements ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-ink">{copy.weekly}</h4>
                    <p className="mt-1 text-sm text-slate-500">{copy.weeklyHint}</p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      draft.weeklyRequirements.issues.length
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {draft.weeklyRequirements.issues.length
                      ? `Проблем: ${draft.weeklyRequirements.issues.length}`
                      : "Готово к публикации"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Требуется</div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {draft.weeklyRequirements.summary.requiredLessons}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">В draft</div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {draft.weeklyRequirements.summary.actualLessons}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Совпало</div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {draft.weeklyRequirements.summary.matched}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Проблемы</div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {draft.weeklyRequirements.summary.issues}
                    </div>
                  </div>
                </div>

                {draft.weeklyRequirements.issues.length ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-rose-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-rose-50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Класс</th>
                          <th className="px-3 py-3">Предмет</th>
                          <th className="px-3 py-3">Требуется</th>
                          <th className="px-3 py-3">Факт</th>
                          <th className="px-3 py-3">Причина</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.weeklyRequirements.issues.map((issue) => (
                          <tr key={issue.key} className="border-t border-rose-100 align-top">
                            <td className="px-3 py-3 font-medium text-ink">
                              {issue.className}
                              {issue.classGroupName ? ` • ${issue.classGroupName}` : ""}
                            </td>
                            <td className="px-3 py-3 text-slate-700">{issue.subjectName}</td>
                            <td className="px-3 py-3 text-slate-700">{issue.requiredCount}</td>
                            <td className="px-3 py-3 text-slate-700">{issue.actualCount}</td>
                            <td className="px-3 py-3 text-slate-600">
                              {issue.actualCount < issue.requiredCount
                                ? "Не хватает уроков в draft."
                                : issue.requiredCount === 0
                                  ? "В сетке есть лишний урок без требования."
                                  : "Уроков больше, чем разрешено настройкой."}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {copy.weeklyOk}
                  </div>
                )}
              </section>
            ) : null}

            <ScheduleIssueStack locale={locale} conflicts={draft.conflicts} unplaced={draft.unplaced} />

            <ScheduleResponsiveGrid
              locale={locale}
              timeSlots={timeSlots}
              entries={draft.entries.map((entry) => ({
                ...entry,
                conflicts: draft.conflicts.filter((conflict) =>
                  Array.isArray(conflict.affectedEntryIds) ? conflict.affectedEntryIds.includes(entry.id) : false
                )
              }))}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-500">
            {copy.noDraft}
          </div>
        )}
      </section>
    </div>
  );
}





