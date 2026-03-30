"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ScheduleQuickActions({
  locale,
  latestDraftId
}: {
  locale: "ru" | "kz";
  latestDraftId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const copy =
    locale === "kz"
      ? {
          generate: "Кестені генерациялау",
          grid: "Кесте торын ашу",
          export: "Excel-ге экспорттау",
          apply: "Барлық сыныптарға қолдану",
          noDraft: "Соңғы draft әлі жоқ.",
          applied: "Соңғы draft қолданылды.",
          failed: "Қолдану сәтсіз аяқталды."
        }
      : {
          generate: "Сгенерировать расписание",
          grid: "Открыть сетку расписания",
          export: "Экспорт в Excel",
          apply: "Применить ко всем классам",
          noDraft: "Последний draft ещё не создан.",
          applied: "Последний draft применён.",
          failed: "Не удалось применить draft."
        };

  async function handleApply() {
    if (!latestDraftId) {
      setFeedback(copy.noDraft);
      return;
    }

    setFeedback(null);
    const response = await fetch(`/api/admin/schedule/drafts/${latestDraftId}/apply`, {
      method: "POST"
    });
    if (!response.ok) {
      setFeedback(copy.failed);
      return;
    }

    setFeedback(copy.applied);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/schedule/generator" className="rounded-xl bg-royal px-4 py-3 text-center text-sm font-semibold text-white">
          {copy.generate}
        </Link>
        <Link href="/admin/schedule/grid" className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">
          {copy.grid}
        </Link>
        <a
          href={latestDraftId ? `/api/admin/schedule/drafts/${latestDraftId}/export` : "/admin/schedule/generator"}
          className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700"
        >
          {copy.export}
        </a>
        <button
          type="button"
          disabled={isPending}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => void handleApply()}
        >
          {copy.apply}
        </button>
      </div>
      {feedback ? <div className="text-sm text-slate-600">{feedback}</div> : null}
    </div>
  );
}
