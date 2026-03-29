"use client";

import { useState } from "react";
import { type Locale, getDictionary } from "@/lib/i18n";

export function NotificationComposer({
  classOptions,
  locale
}: {
  classOptions: Array<{ id: string; name: string }>;
  locale: Locale;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const copy = getDictionary(locale);

  return (
    <form
      className="panel space-y-4 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
          scope: String(formData.get("scope") ?? "school"),
          classIds: formData.get("classId") ? [String(formData.get("classId"))] : undefined
        };

        const response = await fetch("/api/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        setStatus(response.ok ? copy.common.saved : copy.common.failed);
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-ink">{copy.composer.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{copy.composer.subtitle}</p>
      </div>
      <input name="title" className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={copy.common.title} />
      <textarea name="body" className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={copy.common.message} />
      <div className="grid gap-3 md:grid-cols-2">
        <select name="scope" className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="school">{copy.composer.scopeSchool}</option>
          <option value="class">{copy.composer.scopeClass}</option>
          <option value="role">{copy.composer.scopeRole}</option>
          <option value="parallel">{copy.composer.scopeParallel}</option>
        </select>
        <select name="classId" className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">{copy.composer.noClass}</option>
          {classOptions.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <button className="rounded-2xl bg-royal px-5 py-3 font-semibold text-white">{copy.common.publish}</button>
        {status ? <span className="text-sm text-slate-500">{status}</span> : null}
      </div>
    </form>
  );
}
