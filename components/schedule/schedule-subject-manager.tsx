"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CREDIT_TYPES = ["mark", "credit", "no_score"] as const;

type SubjectRecord = {
  id: string;
  name: string;
  category: string;
  creditType: (typeof CREDIT_TYPES)[number];
  assignmentCount: number;
  classNames: string[];
};

function createInitialForm() {
  return {
    id: null as string | null,
    name: "",
    category: "general",
    creditType: "mark" as (typeof CREDIT_TYPES)[number]
  };
}

function creditTypeLabel(locale: "ru" | "kz", creditType: (typeof CREDIT_TYPES)[number]) {
  const labels = {
    ru: {
      mark: "Оценка",
      credit: "Зачет",
      no_score: "Без оценки"
    },
    kz: {
      mark: "Бага",
      credit: "Сынак",
      no_score: "Багасыз"
    }
  } as const;

  return labels[locale][creditType];
}

export function ScheduleSubjectManager({
  locale,
  subjects
}: {
  locale: "ru" | "kz";
  subjects: SubjectRecord[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState(createInitialForm);

  const copy =
    locale === "kz"
      ? {
          name: "Пан атауы",
          category: "Санаты",
          creditType: "Багалау турi",
          classLinks: "Сыныптар",
          create: "Косу",
          update: "Жанарту",
          reset: "Тазалау",
          edit: "Озгерту",
          remove: "Ошыру",
          none: "Жок",
          saving: "Сакталуда...",
          success: "Пан сакталды.",
          failed: "Панды сактау мумкiн болмады.",
          confirmDelete:
            "Панды ошыруге әрекет жасайсыз. Егер ол кестеде немесе журналда колдонылып турса, жуйе ошыруге жол бермейдi."
        }
      : {
          name: "Название предмета",
          category: "Категория",
          creditType: "Тип оценивания",
          classLinks: "Классы",
          create: "Добавить",
          update: "Обновить",
          reset: "Сбросить",
          edit: "Изменить",
          remove: "Удалить",
          none: "Нет",
          saving: "Сохранение...",
          success: "Предмет сохранен.",
          failed: "Не удалось сохранить предмет.",
          confirmDelete:
            "Ты собираешься удалить предмет. Если он уже используется в расписании или журнале, система не даст это сделать."
        };

  function resetForm() {
    setForm(createInitialForm());
  }

  function startEdit(subject: SubjectRecord) {
    setForm({
      id: subject.id,
      name: subject.name,
      category: subject.category,
      creditType: subject.creditType
    });
  }

  async function request(url: string, init: RequestInit, onSuccess?: () => void) {
    try {
      setIsSubmitting(true);
      setFeedback(null);
      const response = await fetch(url, init);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback(body?.error ?? copy.failed);
        return;
      }

      onSuccess?.();
      setFeedback(copy.success);
      router.refresh();
    } catch {
      setFeedback(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit() {
    await request(
      form.id ? `/api/admin/schedule/subjects/${form.id}` : "/api/admin/schedule/subjects",
      {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          category: form.category || null,
          creditType: form.creditType
        })
      },
      resetForm
    );
  }

  async function remove(subjectId: string) {
    if (!window.confirm(copy.confirmDelete)) {
      return;
    }

    await request(
      `/api/admin/schedule/subjects/${subjectId}`,
      {
        method: "DELETE"
      },
      () => {
        if (form.id === subjectId) {
          resetForm();
        }
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.name}
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          placeholder={copy.category}
          value={form.category}
          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
        />
        <select
          className="rounded-xl border border-slate-300 px-3 py-2.5"
          value={form.creditType}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              creditType: event.target.value as (typeof CREDIT_TYPES)[number]
            }))
          }
        >
          {CREDIT_TYPES.map((creditType) => (
            <option key={creditType} value={creditType}>
              {creditTypeLabel(locale, creditType)}
            </option>
          ))}
        </select>
        <div className="md:col-span-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isSubmitting || !form.name.trim()}
            onClick={() => void submit()}
          >
            {isSubmitting ? copy.saving : form.id ? copy.update : copy.create}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            onClick={resetForm}
          >
            {copy.reset}
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">{copy.name}</th>
              <th className="px-3 py-3">{copy.category}</th>
              <th className="px-3 py-3">{copy.creditType}</th>
              <th className="px-3 py-3">{copy.classLinks}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id} className="border-t border-slate-200 align-top">
                <td className="px-3 py-3 font-medium text-ink">{subject.name}</td>
                <td className="px-3 py-3 text-slate-600">{subject.category}</td>
                <td className="px-3 py-3 text-slate-600">
                  {creditTypeLabel(locale, subject.creditType)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {subject.classNames.length ? subject.classNames.join(", ") : copy.none}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => startEdit(subject)}
                    >
                      {copy.edit}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => void remove(subject.id)}
                    >
                      {copy.remove}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
