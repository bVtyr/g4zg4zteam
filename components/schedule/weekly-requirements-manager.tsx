"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TemplateRecord = {
  id: string;
  title: string;
  schoolYear: string;
  term: string;
  classId: string | null;
  classGroupId: string | null;
  teacherId: string;
  subjectId: string | null;
  preferredRoomId: string | null;
  lessonsPerWeek: number;
  durationSlots: number;
  schoolClass?: { id?: string; name: string } | null;
  classGroup?: { name: string; schoolClass?: { id?: string; name: string } | null } | null;
  subject?: { name: string } | null;
  teacher: { user: { fullName: string } };
  preferredRoom?: { name: string } | null;
};

type Option = {
  id: string;
  name: string;
};

type ClassGroupOption = {
  id: string;
  name: string;
  classId: string;
  className: string;
  subjectName: string | null;
};

function createInitialState(
  classes: Option[],
  teachers: Option[],
  subjects: Option[]
) {
  return {
    id: null as string | null,
    classId: classes[0]?.id ?? "",
    classGroupId: "",
    subjectId: subjects[0]?.id ?? "",
    teacherId: teachers[0]?.id ?? "",
    preferredRoomId: "",
    lessonsPerWeek: "2",
    durationSlots: "1"
  };
}

export function WeeklyRequirementsManager({
  schoolYear,
  term,
  templates,
  classes,
  classGroups,
  subjects,
  teachers,
  rooms
}: {
  schoolYear: string;
  term: string;
  templates: TemplateRecord[];
  classes: Option[];
  classGroups: ClassGroupOption[];
  subjects: Option[];
  teachers: Option[];
  rooms: Option[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [form, setForm] = useState(() => createInitialState(classes, teachers, subjects));

  const scopedGroups = useMemo(
    () => classGroups.filter((group) => group.classId === form.classId),
    [classGroups, form.classId]
  );
  const visibleTemplates = useMemo(
    () =>
      classFilter === "all"
        ? templates
        : templates.filter(
            (template) =>
              template.classId === classFilter ||
              template.classGroup?.schoolClass?.id === classFilter
          ),
    [classFilter, templates]
  );

  function resetForm() {
    setForm(createInitialState(classes, teachers, subjects));
  }

  function buildTitle() {
    const scopeLabel =
      scopedGroups.find((group) => group.id === form.classGroupId)?.name ||
      classes.find((item) => item.id === form.classId)?.name ||
      "Класс";
    const subjectLabel = subjects.find((item) => item.id === form.subjectId)?.name ?? "Предмет";
    return `${scopeLabel} • ${subjectLabel}`;
  }

  function startEdit(template: TemplateRecord) {
    setForm({
      id: template.id,
      classId: template.classId ?? template.classGroup?.schoolClass?.id ?? classes[0]?.id ?? "",
      classGroupId: template.classGroupId ?? "",
      subjectId: template.subjectId ?? "",
      teacherId: template.teacherId,
      preferredRoomId: template.preferredRoomId ?? "",
      lessonsPerWeek: String(template.lessonsPerWeek),
      durationSlots: String(template.durationSlots)
    });
    setFeedback(null);
  }

  async function request(url: string, init: RequestInit, onSuccess?: () => void) {
    try {
      setIsSubmitting(true);
      setFeedback(null);
      const response = await fetch(url, init);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback(body?.error ?? "Не удалось сохранить weekly requirement.");
        return;
      }

      onSuccess?.();
      setFeedback("Недельная нагрузка сохранена.");
      router.refresh();
    } catch {
      setFeedback("Не удалось сохранить weekly requirement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit() {
    const classGroup = form.classGroupId
      ? classGroups.find((group) => group.id === form.classGroupId) ?? null
      : null;
    const classId = classGroup?.classId ?? form.classId;
    if (!classId || !form.subjectId || !form.teacherId) {
      setFeedback("Заполните класс, предмет и учителя.");
      return;
    }

    await request(
      form.id
        ? `/api/admin/schedule/templates/${form.id}`
        : "/api/admin/schedule/templates",
      {
        method: form.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: buildTitle(),
          schoolYear,
          term,
          classId,
          classGroupId: classGroup?.id ?? null,
          teacherId: form.teacherId,
          subjectId: form.subjectId,
          preferredRoomId: form.preferredRoomId || null,
          lessonsPerWeek: Number(form.lessonsPerWeek),
          durationSlots: Number(form.durationSlots)
        })
      },
      resetForm
    );
  }

  async function remove(templateId: string) {
    if (!window.confirm("Удалить это требование?")) {
      return;
    }

    await request(
      `/api/admin/schedule/templates/${templateId}`,
      {
        method: "DELETE"
      },
      () => {
        if (form.id === templateId) {
          resetForm();
        }
      }
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Требований</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{templates.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Уроков в неделю</div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {templates.reduce((sum, item) => sum + item.lessonsPerWeek, 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Классов</div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {new Set(templates.map((item) => item.classId ?? item.classGroupId)).size}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Период</div>
          <div className="mt-2 text-lg font-semibold text-ink">
            {schoolYear} • {term}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Недельная нагрузка по предметам</h3>
              <p className="mt-1 text-sm text-slate-500">
                Генератор сверяет draft с этими значениями и не даст опубликовать сетку при расхождении.
              </p>
            </div>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
            >
              <option value="all">Все классы</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </div>

          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Класс</th>
                <th className="px-4 py-3">Предмет</th>
                <th className="px-4 py-3">Учитель</th>
                <th className="px-4 py-3">Уроков</th>
                <th className="px-4 py-3">Кабинет</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleTemplates.map((template) => (
                <tr key={template.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-medium text-ink">
                    {template.schoolClass?.name ?? template.classGroup?.schoolClass?.name ?? "—"}
                    {template.classGroup?.name ? (
                      <div className="mt-1 text-xs font-normal text-slate-500">{template.classGroup.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{template.subject?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{template.teacher.user.fullName}</td>
                  <td className="px-4 py-3 text-slate-700">{template.lessonsPerWeek}</td>
                  <td className="px-4 py-3 text-slate-600">{template.preferredRoom?.name ?? "Любой"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                        onClick={() => startEdit(template)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                        onClick={() => void remove(template.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleTemplates.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Для этого класса ещё нет weekly requirements.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-base font-semibold text-ink">
            {form.id ? "Редактировать requirement" : "Добавить requirement"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Укажи точное число уроков в неделю. Генератор будет считать его обязательным.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="space-y-2 text-sm">
              <span className="text-slate-500">Класс</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                value={form.classId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    classId: event.target.value,
                    classGroupId: ""
                  }))
                }
              >
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-slate-500">Группа</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                value={form.classGroupId}
                onChange={(event) => setForm((current) => ({ ...current, classGroupId: event.target.value }))}
              >
                <option value="">Весь класс</option>
                {scopedGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.subjectName ? ` • ${group.subjectName}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-slate-500">Предмет</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                value={form.subjectId}
                onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-slate-500">Учитель</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                value={form.teacherId}
                onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">Уроков в неделю</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  type="number"
                  min={1}
                  max={20}
                  value={form.lessonsPerWeek}
                  onChange={(event) => setForm((current) => ({ ...current, lessonsPerWeek: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">Длительность</span>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  value={form.durationSlots}
                  onChange={(event) => setForm((current) => ({ ...current, durationSlots: event.target.value }))}
                >
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      {value} слот
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="text-slate-500">Предпочтительный кабинет</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                value={form.preferredRoomId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preferredRoomId: event.target.value
                  }))
                }
              >
                <option value="">Любой кабинет</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void submit()}
            >
              {isSubmitting ? "Сохранение..." : form.id ? "Обновить" : "Сохранить"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              onClick={resetForm}
            >
              Сбросить
            </button>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {feedback}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
