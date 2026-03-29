"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Clock3, Link2, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ParentLinkState = {
  linkedParents: Array<{
    id: string;
    relation: string;
    fullName: string;
    username: string;
  }>;
  activeCode: {
    code: string;
    expiresAt: string | Date;
    createdAt: string | Date;
  } | null;
  remainingSlots: number;
  canGenerateCode: boolean;
};

const copy = {
  ru: {
    eyebrow: "Родители",
    title: "Привязать родителя",
    subtitle: "Сгенерируйте одноразовый код и передайте его родителю. Код сработает только один раз и автоматически истечет через несколько минут.",
    linked: "Привязанные родители",
    noParents: "Пока ни один родитель не привязан.",
    generate: "Сгенерировать код",
    generating: "Создание...",
    expiresIn: "Код действует",
    expired: "Код истек. Сгенерируйте новый.",
    slots: "Свободных слотов",
    limitReached: "Достигнут лимит: к ученику уже привязаны два родителя.",
    unlink: "Отвязать",
    copiedHint: "Передайте этот код родителю и попросите ввести его в разделе добавления ребенка.",
    codeCreated: "Код создан.",
    parentRemoved: "Родитель отвязан.",
    errorGenerate: "Не удалось создать код.",
    errorRemove: "Не удалось отвязать родителя."
  },
  kz: {
    eyebrow: "Ата-ана",
    title: "Ата-ананы байланыстыру",
    subtitle: "Бір реттік кодты жасап, оны ата-анаға беріңіз. Код тек бір рет жұмыс істейді және бірнеше минуттан кейін автоматты түрде өшеді.",
    linked: "Байланысқан ата-аналар",
    noParents: "Әзірге бірде-бір ата-ана байланыспаған.",
    generate: "Код жасау",
    generating: "Жасалып жатыр...",
    expiresIn: "Кодтың мерзімі",
    expired: "Кодтың мерзімі аяқталды. Жаңасын жасаңыз.",
    slots: "Бос слоттар",
    limitReached: "Шекке жетті: оқушыға екі ата-ана ғана байланыса алады.",
    unlink: "Ажырату",
    copiedHint: "Осы кодты ата-анаға беріп, баланы қосу бөлімінде енгізуін сұраңыз.",
    codeCreated: "Код жасалды.",
    parentRemoved: "Ата-ана ажыратылды.",
    errorGenerate: "Код жасау мүмкін болмады.",
    errorRemove: "Ата-ананы ажырату мүмкін болмады."
  }
} as const;

function secondsLeft(expiresAt?: string | Date | null) {
  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function StudentParentLinkCard({
  locale,
  state
}: {
  locale: Locale;
  state: ParentLinkState;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [remaining, setRemaining] = useState(secondsLeft(state.activeCode?.expiresAt));
  const t = copy[locale];

  useEffect(() => {
    setRemaining(secondsLeft(state.activeCode?.expiresAt));
  }, [state.activeCode?.expiresAt]);

  useEffect(() => {
    if (!state.activeCode) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining(secondsLeft(state.activeCode?.expiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.activeCode]);

  const activeCodeExpired = useMemo(() => state.activeCode && remaining <= 0, [remaining, state.activeCode]);

  async function generateCode() {
    setIsBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/student/parent-link-code", {
        method: "POST"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: String(payload?.error ?? t.errorGenerate)
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: t.codeCreated
      });

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function unlinkParent(linkId: string) {
    setIsBusy(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/student/parent-links/${linkId}`, {
        method: "DELETE"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: String(payload?.error ?? t.errorRemove)
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: t.parentRemoved
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-royal/60">{t.eyebrow}</div>
          <h3 className="mt-2 text-xl font-semibold text-ink">{t.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t.slots}</div>
          <div className="mt-1 text-2xl font-bold text-ink">{state.remainingSlots}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div
          className={cn(
            "rounded-3xl border p-5",
            state.activeCode && !activeCodeExpired ? "border-royal/15 bg-royal/5" : "border-slate-200 bg-slate-50"
          )}
        >
          {state.activeCode && !activeCodeExpired ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="h-4 w-4" />
                {t.expiresIn}: <span className="font-semibold text-ink">{formatCountdown(remaining)}</span>
              </div>
              <div className="font-display text-4xl font-bold tracking-[0.28em] text-royal">
                {state.activeCode.code}
              </div>
              <p className="text-sm text-slate-600">{t.copiedHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Link2 className="h-4 w-4" />
                <span className="text-sm">{activeCodeExpired ? t.expired : t.noParents}</span>
              </div>
              {!state.canGenerateCode ? <div className="text-sm text-danger">{t.limitReached}</div> : null}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            void generateCode();
          }}
          disabled={isBusy || isPending || !state.canGenerateCode}
          className="rounded-2xl bg-royal px-5 py-3 font-semibold text-white transition hover:bg-royal/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy || isPending ? t.generating : t.generate}
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Users className="h-4 w-4" />
          {t.linked}
        </div>
        <div className="mt-3 space-y-3">
          {state.linkedParents.length ? (
            state.linkedParents.map((parent) => (
              <div key={parent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="font-medium text-ink">{parent.fullName}</div>
                  <div className="text-sm text-slate-500">{parent.relation}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void unlinkParent(parent.id);
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
              {t.noParents}
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
