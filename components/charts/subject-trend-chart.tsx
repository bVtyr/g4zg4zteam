"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Locale } from "@/lib/i18n";

export function SubjectTrendChart({
  data,
  title,
  locale
}: {
  title: string;
  data: Array<{ period: string; score: number | null }>;
  locale: Locale;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <span className="pill bg-royal/10 text-royal">{locale === "kz" ? "Тренд" : "Тренд"}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#d7def2" />
            <XAxis dataKey="period" stroke="#7082ad" />
            <YAxis domain={[0, 100]} stroke="#7082ad" />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#1f237e" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
