"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ScheduleGeneratorPanel({
  locale,
  defaultExcelPath
}: {
  locale: "ru" | "kz";
  defaultExcelPath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [excelPath, setExcelPath] = useState(defaultExcelPath);
  const [feedback, setFeedback] = useState<string | null>(null);

  const copy =
    locale === "kz"
      ? {
          autoTitle: "Автоматты генерация",
          autoDescription:
            "Жүйе алдымен бар мұғалім жүктемесі мен шектеулер негізінде шаблон құрып, содан кейін кестені өзі жинайды.",
          generate: "Кестені құру",
          dryRun: "Алдын ала тексеру",
          importTitle: "Excel импорт",
          importDescription: "Excel импорт қосымша режим ретінде қолжетімді. Негізгі жұмыс файлы жүктемей-ақ істейді.",
          path: "Файл жолы",
          done: "Операция орындалды",
          failed: "Әрекетті орындау мүмкін болмады",
          summary: "Құрылғаны: {generated}. Конфликттер: {conflicts}. Орналаспады: {unplaced}. Авто-шаблондар: {bootstrapped}."
        }
      : {
          autoTitle: "Автогенерация",
          autoDescription:
            "Система сначала формирует шаблоны по существующей учебной нагрузке и ограничениям, затем сама собирает сетку расписания.",
          generate: "Собрать расписание",
          dryRun: "Пробный запуск",
          importTitle: "Импорт Excel",
          importDescription: "Импорт Excel доступен как дополнительный режим. Основной сценарий работает без загрузки файлов.",
          path: "Путь к файлу",
          done: "Операция выполнена",
          failed: "Не удалось выполнить действие",
          summary: "Создано: {generated}. Конфликтов: {conflicts}. Не размещено: {unplaced}. Автошаблонов: {bootstrapped}."
        };

  function formatSummary(body: Record<string, unknown> | null) {
    if (!body) {
      return copy.done;
    }

    const generated = Number(body.generated ?? 0);
    const conflicts = Array.isArray(body.conflicts) ? body.conflicts.length : Number(body.conflicts ?? 0);
    const unplaced = Array.isArray(body.unplaced) ? body.unplaced.length : Number(body.unplaced ?? 0);
    const bootstrapped = Number(body.bootstrappedRequests ?? 0);

    return copy.summary
      .replace("{generated}", String(generated))
      .replace("{conflicts}", String(conflicts))
      .replace("{unplaced}", String(unplaced))
      .replace("{bootstrapped}", String(bootstrapped));
  }

  async function runAction(url: string, payload: Record<string, unknown>) {
    setFeedback(null);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      return;
    }
    setFeedback(formatSummary(body));
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-ink">{copy.autoTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{copy.autoDescription}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-royal px-4 py-2.5 text-sm font-semibold text-white"
            disabled={isPending}
            onClick={() => void runAction("/api/admin/schedule/generate", {})}
          >
            {copy.generate}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            disabled={isPending}
            onClick={() => void runAction("/api/admin/schedule/generate", { dryRun: true })}
          >
            {copy.dryRun}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-ink">{copy.importTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{copy.importDescription}</p>
        </div>
        <label className="mt-4 block space-y-2 text-sm">
          <span className="text-slate-500">{copy.path}</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            value={excelPath}
            onChange={(event) => setExcelPath(event.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            disabled={isPending || !excelPath}
            onClick={() => void runAction("/api/admin/schedule/import", { filePath: excelPath })}
          >
            {copy.importTitle}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            disabled={isPending || !excelPath}
            onClick={() => void runAction("/api/admin/schedule/import", { filePath: excelPath, dryRun: true })}
          >
            {copy.dryRun}
          </button>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
