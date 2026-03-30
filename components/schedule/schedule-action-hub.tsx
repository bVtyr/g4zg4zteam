"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, MonitorSmartphone, Sparkles, Wand2 } from "lucide-react";

type ActionCopy = {
  generate: string;
  generateHint: string;
  grid: string;
  gridHint: string;
  export: string;
  exportHint: string;
  apply: string;
  applyHint: string;
  resources: string;
  resourcesHint: string;
  kiosk: string;
  kioskHint: string;
  noDraft: string;
  applied: string;
  failed: string;
  latestDraft: string;
  draftReady: string;
  draftMissing: string;
  mobileTitle: string;
};

export function ScheduleActionHub({
  locale,
  latestDraftId
}: {
  locale: "ru" | "kz";
  latestDraftId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const copy: ActionCopy =
    locale === "kz"
      ? {
          generate: "Генерация",
          generateHint: "Жаңа draft құру және нәтижені тексеру",
          grid: "Сетка",
          gridHint: "Сынып, мұғалім немесе кабинет бойынша қарау",
          export: "Excel экспорт",
          exportHint: "Соңғы draft-ты жүйеге қолданбай жүктеу",
          apply: "Барлығына қолдану",
          applyHint: "Соңғы draft-ты жүйеге қауіпсіз жариялау",
          resources: "Ресурстар",
          resourcesHint: "Мұғалімдер, кабинеттер, пәндер және assignments",
          kiosk: "Kiosk",
          kioskHint: "Тақта мен теледидарға арналған толық экран көру режимі",
          noDraft: "Соңғы draft әлі жоқ.",
          applied: "Соңғы draft жүйеге қолданылды.",
          failed: "Draft-ты қолдану сәтсіз аяқталды.",
          latestDraft: "Соңғы draft",
          draftReady: "Экспорт пен жариялауға дайын",
          draftMissing: "Алдымен генерация жасаңыз",
          mobileTitle: "Негізгі әрекеттер"
        }
      : {
          generate: "Генерация",
          generateHint: "Собрать новый draft и проверить результат",
          grid: "Сетка",
          gridHint: "Просмотр по классу, учителю или кабинету",
          export: "Экспорт Excel",
          exportHint: "Скачать последний draft без применения в системе",
          apply: "Применить всем",
          applyHint: "Безопасно опубликовать последний draft в систему",
          resources: "Ресурсы",
          resourcesHint: "Учителя, кабинеты, предметы и assignments",
          kiosk: "Kiosk",
          kioskHint: "Полноэкранный режим для досок и телевизоров",
          noDraft: "Последний draft ещё не создан.",
          applied: "Последний draft применён в систему.",
          failed: "Не удалось применить последний draft.",
          latestDraft: "Последний draft",
          draftReady: "Готов к экспорту и публикации",
          draftMissing: "Сначала сгенерируй draft",
          mobileTitle: "Основные действия"
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

  const actionCards = [
    {
      href: "/admin/schedule/generator",
      label: copy.generate,
      hint: copy.generateHint,
      tone: "bg-royal text-white border-royal",
      icon: Wand2
    },
    {
      href: "/admin/schedule/grid",
      label: copy.grid,
      hint: copy.gridHint,
      tone: "bg-white text-slate-700 border-slate-200",
      icon: LayoutGrid
    },
    {
      href: "/admin/schedule/resources",
      label: copy.resources,
      hint: copy.resourcesHint,
      tone: "bg-white text-slate-700 border-slate-200",
      icon: Sparkles
    },
    {
      href: "/kiosk/schedule",
      label: copy.kiosk,
      hint: copy.kioskHint,
      tone: "bg-white text-slate-700 border-slate-200",
      icon: MonitorSmartphone
    }
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {copy.latestDraft}
            </div>
            <div className="mt-1 text-base font-semibold text-ink">
              {latestDraftId ? copy.draftReady : copy.draftMissing}
            </div>
          </div>
          <div className="hidden gap-2 md:flex">
            <a
              href={latestDraftId ? `/api/admin/schedule/drafts/${latestDraftId}/export` : "/admin/schedule/generator"}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              {copy.export}
            </a>
            <button
              type="button"
              disabled={isPending}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => void handleApply()}
            >
              {copy.apply}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${card.tone}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{card.label}</div>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm leading-6 opacity-80">{card.hint}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 hidden gap-3 md:grid xl:grid-cols-2">
          <a
            href={latestDraftId ? `/api/admin/schedule/drafts/${latestDraftId}/export` : "/admin/schedule/generator"}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {copy.export}
            <div className="mt-1 text-sm font-normal text-slate-500">{copy.exportHint}</div>
          </a>
          <button
            type="button"
            disabled={isPending}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-700 disabled:opacity-60"
            onClick={() => void handleApply()}
          >
            {copy.apply}
            <div className="mt-1 text-sm font-normal text-emerald-700/80">{copy.applyHint}</div>
          </button>
        </div>
      </div>

      <div className="md:hidden">
        <div className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {copy.mobileTitle}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/admin/schedule/generator"
              className="inline-flex items-center justify-center rounded-2xl bg-royal px-4 py-3 text-sm font-semibold text-white"
            >
              {copy.generate}
            </Link>
            <button
              type="button"
              disabled={isPending}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => void handleApply()}
            >
              {copy.apply}
            </button>
            <a
              href={latestDraftId ? `/api/admin/schedule/drafts/${latestDraftId}/export` : "/admin/schedule/generator"}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {copy.export}
            </a>
            <Link
              href="/kiosk/schedule"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {copy.kiosk}
            </Link>
          </div>
        </div>
      </div>

      {feedback ? <div className="text-sm text-slate-600">{feedback}</div> : null}
    </div>
  );
}
