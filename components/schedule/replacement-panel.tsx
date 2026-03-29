"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ReplacementPanel({
  locale,
  teachers
}: {
  locale: "ru" | "kz";
  teachers: Array<{ id: string; user: { fullName: string } }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [affectedDate, setAffectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const copy =
    locale === "kz"
      ? {
          teacher: "Мұғалім",
          date: "Күні",
          reason: "Себеп",
          preview: "Алдын ала көру",
          apply: "Қолдану",
          previewTitle: "Өзгерістер алдын ала көрінісі"
        }
      : {
          teacher: "Учитель",
          date: "Дата",
          reason: "Причина",
          preview: "Предпросмотр",
          apply: "Применить",
          previewTitle: "Предварительный просмотр изменений"
        };

  async function run(previewOnly: boolean) {
    const response = await fetch("/api/admin/teacher-absence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teacherId,
        affectedDate,
        reason,
        previewOnly
      })
    });
    const body = await response.json().catch(() => null);
    if (previewOnly) {
      setPreview(JSON.stringify(body?.preview ?? body, null, 2));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.teacher}</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.user.fullName}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.date}</span>
          <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={affectedDate} onChange={(event) => setAffectedDate(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-500">{copy.reason}</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700" disabled={isPending || !teacherId} onClick={() => void run(true)}>
          {copy.preview}
        </button>
        <button type="button" className="rounded-lg bg-warning px-4 py-2.5 text-sm font-semibold text-white" disabled={isPending || !teacherId} onClick={() => void run(false)}>
          {copy.apply}
        </button>
      </div>
      {preview ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-ink">{copy.previewTitle}</div>
          <pre className="overflow-x-auto text-xs text-slate-700">{preview}</pre>
        </div>
      ) : null}
    </div>
  );
}
