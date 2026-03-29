"use client";

import { useState, useTransition } from "react";
import { RefreshCcw, ShieldCheck, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { cn, formatPercent } from "@/lib/utils";

type BilimClassState = {
  connected: boolean;
  schoolId?: number;
  eduYear?: number;
  groupId?: number | null;
  lastStatus?: string | null;
  lastSyncedAt?: string | Date | null;
  overallAverage?: number | null;
  subjectsTracked?: number;
  riskSubjects?: number;
  latestLog?: {
    status: string;
    errorMessage?: string | null;
    createdAt: string | Date;
  } | null;
};

const copy = {
  ru: {
    eyebrow: "BilimClass",
    titleConnected: "Аккаунт подключен",
    titleDisconnected: "Подключите аккаунт BilimClass",
    subtitleConnected: "Оценки и посещаемость синхронизируются в личный кабинет через защищенный серверный канал.",
    subtitleDisconnected: "Введите логин и пароль от BilimClass. Система проверит доступ и подтянет оценки, периоды и посещаемость.",
    username: "Логин BilimClass",
    password: "Пароль BilimClass",
    connect: "Подключить и загрузить",
    reconnect: "Обновить учетные данные",
    syncing: "Синхронизация...",
    syncNow: "Обновить оценки",
    connected: "Подключено",
    notConnected: "Не подключено",
    lastSync: "Последняя синхронизация",
    schoolYear: "Учебный год",
    group: "Класс BilimClass",
    average: "Средний балл",
    subjects: "Предметов",
    risks: "Предметов с риском",
    successConnect: "BilimClass подключен, оценки загружены.",
    successSync: "Оценки обновлены.",
    secureStorage: "Учетные данные хранятся в зашифрованном виде.",
    upstreamError: "Не удалось получить данные BilimClass. Проверьте логин, пароль или доступность сервиса."
  },
  kz: {
    eyebrow: "BilimClass",
    titleConnected: "Аккаунт қосылған",
    titleDisconnected: "BilimClass аккаунтын қосыңыз",
    subtitleConnected: "Бағалар мен қатысу деректері қорғалған серверлік арна арқылы жеке кабинетке синхрондалады.",
    subtitleDisconnected: "BilimClass логині мен құпиясөзін енгізіңіз. Жүйе қолжетімділікті тексеріп, бағалар мен қатысу деректерін жүктейді.",
    username: "BilimClass логині",
    password: "BilimClass құпиясөзі",
    connect: "Қосып, деректерді жүктеу",
    reconnect: "Деректерді жаңарту",
    syncing: "Синхрондалып жатыр...",
    syncNow: "Бағаларды жаңарту",
    connected: "Қосылған",
    notConnected: "Қосылмаған",
    lastSync: "Соңғы синхрондау",
    schoolYear: "Оқу жылы",
    group: "BilimClass сыныбы",
    average: "Орташа балл",
    subjects: "Пәндер",
    risks: "Тәуекелі бар пәндер",
    successConnect: "BilimClass қосылды, бағалар жүктелді.",
    successSync: "Бағалар жаңартылды.",
    secureStorage: "Есептік деректер шифрланған түрде сақталады.",
    upstreamError: "BilimClass деректерін алу мүмкін болмады. Логинді, құпиясөзді немесе сервистің қолжетімділігін тексеріңіз."
  }
} as const;

function formatDate(locale: Locale, value?: string | Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "kz" ? "kk-KZ" : "ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function BilimClassConnectionCard({
  locale,
  state
}: {
  locale: Locale;
  state: BilimClassState;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const t = copy[locale];
  const latestError = state.latestLog?.errorMessage;

  async function connect(formData: FormData) {
    setIsBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/student/bilimclass/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? "")
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: String(payload?.error ?? t.upstreamError)
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: t.successConnect
      });

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function syncNow() {
    setIsBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/student/bilimclass/sync", {
        method: "POST"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({
          tone: "error",
          text: String(payload?.error ?? t.upstreamError)
        });
        return;
      }

      setFeedback({
        tone: "success",
        text: t.successSync
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-royal/70">{t.eyebrow}</div>
          <h3 className="mt-1.5 text-lg font-semibold text-ink">
            {state.connected ? t.titleConnected : t.titleDisconnected}
          </h3>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
            {state.connected ? t.subtitleConnected : t.subtitleDisconnected}
          </p>
        </div>
        <span
          className={cn(
            "pill",
            state.connected ? "bg-success/15 text-success" : "bg-slate-100 text-slate-500"
          )}
        >
          {state.connected ? t.connected : t.notConnected}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.average}</div>
          <div className="mt-1 text-xl font-semibold text-ink">
            {typeof state.overallAverage === "number" ? formatPercent(state.overallAverage) : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.subjects}</div>
          <div className="mt-1 text-xl font-semibold text-ink">{state.subjectsTracked ?? 0}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.risks}</div>
          <div className="mt-1 text-xl font-semibold text-danger">{state.riskSubjects ?? 0}</div>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 px-4 py-3">
          <div className="text-slate-500">{t.lastSync}</div>
          <div className="mt-1 font-medium text-ink">{formatDate(locale, state.lastSyncedAt)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 px-4 py-3">
          <div className="text-slate-500">{t.schoolYear}</div>
          <div className="mt-1 font-medium text-ink">{state.eduYear ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 px-4 py-3">
          <div className="text-slate-500">{t.group}</div>
          <div className="mt-1 font-medium text-ink">{state.groupId ?? "—"}</div>
        </div>
      </div>

      <form
        className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          connect(formData);
        }}
      >
        <input
          name="username"
          className="field"
          placeholder={t.username}
          autoComplete="username"
        />
        <input
          name="password"
          type="password"
          className="field"
          placeholder={t.password}
          autoComplete="current-password"
        />
        <button
          disabled={isBusy || isPending}
          className="button-primary"
        >
          {isBusy || isPending ? t.syncing : state.connected ? t.reconnect : t.connect}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="h-4 w-4 text-success" />
          {t.secureStorage}
        </div>
        <button
          type="button"
          onClick={() => {
            void syncNow();
          }}
          disabled={isBusy || isPending || !state.connected}
          className="button-secondary gap-2"
        >
          {state.connected ? <RefreshCcw className="h-4 w-4" /> : <Unplug className="h-4 w-4" />}
          {isBusy || isPending ? t.syncing : t.syncNow}
        </button>
      </div>

      {feedback ? (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            feedback.tone === "success"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          )}
        >
          {feedback.text}
        </div>
      ) : latestError ? (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{latestError}</div>
      ) : null}
    </div>
  );
}
