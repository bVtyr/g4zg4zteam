"use client";

import { useState, useTransition } from "react";
import { PlusCircle, Trash2, UserRoundSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LinkedChild = {
  id: string;
  relation: string;
  studentId: string;
  fullName: string;
  className: string;
  studentCode: string;
};

const copy = {
  ru: {
    eyebrow: "Семья",
    title: "Добавить ребенка",
    subtitle: "Введите одноразовый код из кабинета ученика. После успешной привязки данные ребенка появятся в вашем кабинете.",
    code: "Код привязки",
    relation: "Кем вы приходитесь",
    relationPlaceholder: "мама, папа, опекун",
    submit: "Привязать ребенка",
    submitting: "Привязка...",
    linked: "Мои дети",
    empty: "Пока нет привязанных детей.",
    unlink: "Отвязать",
    success: "Ребенок успешно привязан.",
    unlinkSuccess: "Связь с ребенком удалена.",
    genericError: "Не удалось выполнить действие."
  },
  kz: {
    eyebrow: "Отбасы",
    title: "Баланы қосу",
    subtitle: "Оқушы кабинетіндегі бір реттік кодты енгізіңіз. Сәтті байланыстан кейін бала деректері сіздің кабинетіңізде көрінеді.",
    code: "Байланыс коды",
    relation: "Қатысыңыз",
    relationPlaceholder: "ана, әке, қамқоршы",
    submit: "Баланы байланыстыру",
    submitting: "Байланыстырылып жатыр...",
    linked: "Менің балаларым",
    empty: "Әзірге байланысқан балалар жоқ.",
    unlink: "Ажырату",
    success: "Бала сәтті байланыстырылды.",
    unlinkSuccess: "Бала байланысы жойылды.",
    genericError: "Әрекетті орындау мүмкін болмады."
  }
} as const;

export function ParentChildLinkCard({
  locale,
  linkedChildren
}: {
  locale: Locale;
  linkedChildren: LinkedChild[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const t = copy[locale];

  async function linkChild(formData: FormData) {
    setIsBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/parent/children/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: String(formData.get("code") ?? ""),
          relation: String(formData.get("relation") ?? "")
        })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: String(payload?.error ?? t.genericError)
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: t.success
      });

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function unlinkChild(linkId: string) {
    setIsBusy(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/parent/children/${linkId}`, {
        method: "DELETE"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: String(payload?.error ?? t.genericError)
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: t.unlinkSuccess
      });

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="panel space-y-5 p-5">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-royal/60">{t.eyebrow}</div>
        <h3 className="mt-2 text-xl font-semibold text-ink">{t.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
      </div>

      <form
        className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void linkChild(formData);
        }}
      >
        <input
          name="code"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 uppercase tracking-[0.18em]"
          placeholder={t.code}
        />
        <input
          name="relation"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder={t.relationPlaceholder}
          defaultValue="parent"
        />
        <button
          disabled={isBusy || isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-royal px-5 py-3 font-semibold text-white transition hover:bg-royal/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusCircle className="h-4 w-4" />
          {isBusy || isPending ? t.submitting : t.submit}
        </button>
      </form>

      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <UserRoundSearch className="h-4 w-4" />
          {t.linked}
        </div>
        <div className="mt-3 space-y-3">
          {linkedChildren.length ? (
            linkedChildren.map((child) => (
              <div key={child.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="font-medium text-ink">{child.fullName}</div>
                  <div className="text-sm text-slate-500">
                    {child.className} · {child.studentCode} · {child.relation}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void unlinkChild(child.id);
                  }}
                  disabled={isBusy || isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-danger/20 hover:bg-danger/5 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.unlink}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              {t.empty}
            </div>
          )}
        </div>
      </div>

      {feedback ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            feedback.tone === "success"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          )}
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}
