"use client";

import { useState } from "react";

export function TeacherReportCard({
  locale,
  headline,
  report,
  actions
}: {
  locale: "ru" | "kz";
  headline: string;
  report: string;
  actions: string[];
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy =
    locale === "kz"
      ? {
          button: "Есепті ашу",
          hide: "Жасыру",
          copy: "Көшіру",
          copied: "Көшірілді",
          actions: "Бірінші әрекеттер"
        }
      : {
          button: "Сгенерировать отчёт",
          hide: "Скрыть",
          copy: "Скопировать",
          copied: "Скопировано",
          actions: "Первые действия"
        };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText([headline, report, ...actions].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{headline}</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? copy.hide : copy.button}
          </button>
          {visible ? (
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              onClick={() => void handleCopy()}
            >
              {copied ? copy.copied : copy.copy}
            </button>
          ) : null}
        </div>
      </div>

      {visible ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{report}</div>
          {actions.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {copy.actions}
              </div>
              <div className="mt-3 space-y-2">
                {actions.map((action) => (
                  <div key={action} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
