import { type Locale } from "@/lib/i18n";
import { formatPercent } from "@/lib/utils";

const copy = {
  ru: {
    title: "AI-тьютор",
    forecast: "Прогноз",
    gaps: "Темы риска",
    resources: "Видеолекции для подготовки",
    nextSteps: "Следующие шаги",
    mastery: "освоение"
  },
  kz: {
    title: "AI-тьютор",
    forecast: "Болжам",
    gaps: "Тәуекел тақырыптары",
    resources: "Дайындыққа арналған бейнедәрістер",
    nextSteps: "Келесі қадамдар",
    mastery: "меңгеру"
  }
} as const;

type TutorData = {
  subjectName: string;
  probabilityFail: number;
  predictedAssessmentLabel: string;
  tutorHeadline: string;
  explanation: string;
  knowledgeGaps: Array<{
    key: string;
    title: string;
    mastery: number;
    reason: string;
  }>;
  recommendedResources: Array<{
    title: string;
    provider: string;
    url: string;
    duration: string;
    topic: string;
  }>;
  recommendations: string[];
};

export function AITutorPanel({
  locale,
  item
}: {
  locale: Locale;
  item: TutorData;
}) {
  const t = copy[locale];

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{t.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{item.tutorHeadline}</p>
        </div>
        <div className="rounded-2xl bg-danger/10 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-danger">{t.forecast}</div>
          <div className="mt-1 text-2xl font-bold text-danger">{formatPercent(item.probabilityFail)}</div>
          <div className="mt-1 text-xs text-slate-500">{item.predictedAssessmentLabel}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{item.explanation}</div>

      <div className="mt-5">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.gaps}</div>
        <div className="mt-3 space-y-3">
          {item.knowledgeGaps.map((gap) => (
            <div key={gap.key} className="rounded-2xl border border-slate-200/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-ink">{gap.title}</div>
                <div className="text-xs text-slate-500">
                  {t.mastery}: <span className="font-semibold text-ink">{formatPercent(gap.mastery)}</span>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-gradient-to-r from-danger via-warning to-aqua" style={{ width: `${gap.mastery}%` }} />
              </div>
              <div className="mt-2 text-sm text-slate-600">{gap.reason}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.resources}</div>
        <div className="mt-3 grid gap-3">
          {item.recommendedResources.map((resource) => (
            <a
              key={`${resource.topic}-${resource.url}`}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-royal/15 bg-royal/5 p-4 transition hover:border-royal/35 hover:bg-royal/10"
            >
              <div className="font-medium text-ink">{resource.title}</div>
              <div className="mt-1 text-sm text-slate-500">
                {resource.provider} • {resource.duration}
              </div>
              <div className="mt-2 text-sm text-royal">{resource.topic}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.nextSteps}</div>
        <div className="mt-3 space-y-2">
          {item.recommendations.map((recommendation) => (
            <div key={recommendation} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {recommendation}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
