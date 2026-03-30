"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  Link2,
  RefreshCcw,
  Save,
  Search,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AdminData = {
  users: Array<{
    id: string;
    studentProfileId: string | null;
    parentProfileId: string | null;
    fullName: string;
    username: string;
    email: string | null;
    role: Role;
    isBlocked: boolean;
    blockedReason: string | null;
    lastLoginAt: string | Date | null;
    lastLoginIp: string | null;
    lastUserAgent: string | null;
    createdAt: string | Date;
    className: string | null;
    classId: string | null;
    verifiedProfile: boolean | null;
    linkedParents: number;
    linkedChildren: number;
    averageScore: number | null;
    latestBilimStatus: string | null;
    latestBilimSync: string | Date | null;
  }>;
  parentLinks: Array<{
    id: string;
    parentId: string;
    parentUserId: string;
    parentName: string;
    studentId: string;
    studentUserId: string;
    studentName: string;
    className: string;
    relation: string;
    createdAt: string | Date;
  }>;
  grades: Array<{
    id: string;
    studentId: string;
    studentName: string;
    className: string;
    subjectName: string;
    rawScore: string | null;
    normalizedScore: number | null;
    finalScore: number | null;
    scoreType: string;
    source: string;
    periodType: string;
    periodNumber: number;
    updatedAt: string | Date;
    isHidden: boolean;
    adminNote: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    eventType: string;
    action: string;
    status: string;
    actorName: string | null;
    actorRole: string | null;
    targetName: string | null;
    message: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string | Date;
  }>;
  criticalAlerts: Array<{
    id: string;
    title: string;
    message: string;
    status: string;
    createdAt: string | Date;
  }>;
  bilimConnections: Array<{
    id: string;
    studentId: string | null;
    studentName: string | null;
    className: string | null;
    mode: string;
    lastStatus: string | null;
    lastSyncedAt: string | Date | null;
    latestError: string | null;
  }>;
  classes: Array<{
    id: string;
    name: string;
  }>;
};

const copy = {
  ru: {
    center: "Операционный центр",
    subtitle: "Логи, быстрые правки, массовые действия, BilimClass и контроль связей из одной панели.",
    alerts: "Критические сигналы",
    userManagement: "Пользователи",
    linkManagement: "Связи родителей",
    gradeManagement: "Модерация оценок",
    logs: "Журнал событий",
    search: "Поиск",
    allRoles: "Все роли",
    allClasses: "Все классы",
    allStatuses: "Все статусы",
    active: "Активен",
    blocked: "Заблокирован",
    save: "Сохранить",
    saving: "Сохраняем...",
    details: "Карточка",
    blockSelected: "Заблокировать",
    unblockSelected: "Разблокировать",
    syncSelected: "Sync BilimClass",
    unlink: "Отвязать",
    rawScore: "Сырая оценка",
    finalScore: "Итог",
    hidden: "Скрыта",
    note: "Комментарий",
    exportLogs: "Экспорт логов",
    exportUsers: "Экспорт пользователей",
    exportGrades: "Экспорт оценок",
    noData: "Нет данных",
    success: "Изменения сохранены.",
    failure: "Не удалось выполнить действие.",
    parent: "Родитель",
    student: "Ученик",
    relation: "Связь",
    createLink: "Создать связь",
    eventType: "Тип события",
    user: "Пользователь",
    ip: "IP / устройство",
    manualSync: "Sync",
    blockedReason: "Причина блокировки",
    classLabel: "Класс"
  },
  kz: {
    center: "Операциялық орталық",
    subtitle: "Логтар, жедел түзету, жаппай әрекеттер, BilimClass және байланыстарды басқару бір панельде.",
    alerts: "Маңызды сигналдар",
    userManagement: "Пайдаланушылар",
    linkManagement: "Ата-ана байланыстары",
    gradeManagement: "Бағаларды модерациялау",
    logs: "Оқиғалар журналы",
    search: "Іздеу",
    allRoles: "Барлық рөлдер",
    allClasses: "Барлық сыныптар",
    allStatuses: "Барлық мәртебе",
    active: "Белсенді",
    blocked: "Бұғатталған",
    save: "Сақтау",
    saving: "Сақталуда...",
    details: "Карта",
    blockSelected: "Бұғаттау",
    unblockSelected: "Бұғаттан шығару",
    syncSelected: "BilimClass sync",
    unlink: "Ажырату",
    rawScore: "Бастапқы баға",
    finalScore: "Қорытынды",
    hidden: "Жасырылған",
    note: "Түсініктеме",
    exportLogs: "Логтарды экспорттау",
    exportUsers: "Пайдаланушыларды экспорттау",
    exportGrades: "Бағаларды экспорттау",
    noData: "Дерек жоқ",
    success: "Өзгерістер сақталды.",
    failure: "Әрекетті орындау мүмкін болмады.",
    parent: "Ата-ана",
    student: "Оқушы",
    relation: "Байланыс",
    createLink: "Байланыс құру",
    eventType: "Оқиға түрі",
    user: "Пайдаланушы",
    ip: "IP / құрылғы",
    manualSync: "Sync",
    blockedReason: "Бұғаттау себебі",
    classLabel: "Сынып"
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

export function AdminControlCenter({
  locale,
  data,
  sections = ["alerts", "users", "links", "grades", "logs", "integrations", "exports"],
  showHeader = true
}: {
  locale: Locale;
  data: AdminData;
  sections?: Array<"alerts" | "users" | "links" | "grades" | "logs" | "integrations" | "exports">;
  showHeader?: boolean;
}) {
  const t = copy[locale];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [userSort, setUserSort] = useState("name");
  const [logQuery, setLogQuery] = useState("");
  const [logEventType, setLogEventType] = useState("all");
  const [logStatus, setLogStatus] = useState("all");
  const [logRole, setLogRole] = useState("all");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [linkForm, setLinkForm] = useState({ parentId: "", studentId: "", relation: "parent" });
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { rawScore: string; finalScore: string; isHidden: boolean; adminNote: string }>>({});
  const [userDrafts, setUserDrafts] = useState<Record<string, { fullName: string; email: string; role: Role; isBlocked: boolean; blockedReason: string; classId: string }>>({});
  const showSection = (section: "alerts" | "users" | "links" | "grades" | "logs" | "integrations" | "exports") =>
    sections.includes(section);

  const filteredUsers = useMemo(() => {
    return data.users.filter((user) => {
      const matchesQuery =
        !userQuery ||
        [user.fullName, user.username, user.email ?? "", user.className ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(userQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesClass = classFilter === "all" || user.classId === classFilter;
      return matchesQuery && matchesRole && matchesClass;
    }).sort((left, right) => {
      if (userSort === "login") {
        return new Date(right.lastLoginAt ?? 0).getTime() - new Date(left.lastLoginAt ?? 0).getTime();
      }

      if (userSort === "bilim") {
        return (right.latestBilimSync ? new Date(right.latestBilimSync).getTime() : 0) - (left.latestBilimSync ? new Date(left.latestBilimSync).getTime() : 0);
      }

      return left.fullName.localeCompare(right.fullName);
    });
  }, [classFilter, data.users, roleFilter, userQuery, userSort]);

  const filteredLogs = useMemo(() => {
    return data.auditLogs.filter((log) => {
      const matchesQuery =
        !logQuery ||
        [log.message, log.action, log.actorName ?? "", log.targetName ?? "", log.ipAddress ?? "", log.userAgent ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(logQuery.toLowerCase());
      const matchesEventType = logEventType === "all" || log.eventType === logEventType;
      const matchesStatus = logStatus === "all" || log.status === logStatus;
      const matchesRole = logRole === "all" || log.actorRole === logRole;
      const logDate = new Date(log.createdAt);
      const matchesDateFrom = !logDateFrom || logDate >= new Date(logDateFrom);
      const matchesDateTo = !logDateTo || logDate <= new Date(`${logDateTo}T23:59:59`);
      return matchesQuery && matchesEventType && matchesStatus && matchesRole && matchesDateFrom && matchesDateTo;
    });
  }, [data.auditLogs, logDateFrom, logDateTo, logEventType, logQuery, logRole, logStatus]);

  const parentOptions = data.users.filter((user) => user.role === Role.parent && user.parentProfileId);
  const studentOptions = data.users.filter((user) => user.role === Role.student && user.studentProfileId);

  async function runAction(action: () => Promise<Response>, successMessage = t.success) {
    setFeedback(null);
    const response = await action();
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback({
        tone: "error",
        text: String(payload?.error ?? t.failure)
      });
      return;
    }

    setFeedback({
      tone: "success",
      text: successMessage
    });

    startTransition(() => {
      router.refresh();
    });
  }

  function getUserDraft(userId: string) {
    const user = data.users.find((item) => item.id === userId)!;
    return (
      userDrafts[userId] ?? {
        fullName: user.fullName,
        email: user.email ?? "",
        role: user.role,
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason ?? "",
        classId: user.classId ?? ""
      }
    );
  }

  function getGradeDraft(gradeId: string) {
    const grade = data.grades.find((item) => item.id === gradeId)!;
    return (
      gradeDrafts[gradeId] ?? {
        rawScore: grade.rawScore ?? "",
        finalScore: grade.finalScore?.toString() ?? "",
        isHidden: grade.isHidden,
        adminNote: grade.adminNote ?? ""
      }
    );
  }

  return (
    <section className="space-y-6">
      {showHeader ? (
        <div className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-ink">{t.center}</h3>
              <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
            </div>
            {showSection("exports") ? (
              <div className="flex flex-wrap gap-2">
                <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=logs">
                  <Download className="h-4 w-4" />
                  {t.exportLogs}
                </a>
                <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=users">
                  <Download className="h-4 w-4" />
                  {t.exportUsers}
                </a>
                <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=grades">
                  <Download className="h-4 w-4" />
                  {t.exportGrades}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSection("alerts") ? (
      <div className="panel p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-ink">
          <AlertTriangle className="h-5 w-5 text-danger" />
          {t.alerts}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.criticalAlerts.length ? (
            data.criticalAlerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-danger/15 bg-danger/5 p-4">
                <div className="text-sm font-semibold text-danger">{alert.title}</div>
                <div className="mt-2 text-sm text-slate-700">{alert.message}</div>
                <div className="mt-2 text-xs text-slate-500">{formatDate(locale, alert.createdAt)}</div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">{t.noData}</div>
          )}
        </div>
      </div>
      ) : null}

      {showSection("users") ? (
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold text-ink">{t.userManagement}</div>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="rounded-2xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder={t.search} value={userQuery} onChange={(event) => setUserQuery(event.target.value)} />
            </div>
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">{t.allRoles}</option>
              {Object.values(Role).map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="all">{t.allClasses}</option>
              {data.classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={userSort} onChange={(event) => setUserSort(event.target.value)}>
              <option value="name">A-Z</option>
              <option value="login">Last login</option>
              <option value="bilim">BilimClass</option>
            </select>
            <div className="flex gap-2">
              <button className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium" disabled={!selectedUserIds.length || isPending} onClick={() => {
                void runAction(() => fetch("/api/admin/users/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "block", userIds: selectedUserIds }) }), t.success);
              }}>
                {t.blockSelected}
              </button>
              <button className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium" disabled={!selectedUserIds.length || isPending} onClick={() => {
                void runAction(() => fetch("/api/admin/users/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unblock", userIds: selectedUserIds }) }), t.success);
              }}>
                {t.unblockSelected}
              </button>
              <button className="rounded-2xl bg-royal px-3 py-2.5 text-sm font-medium text-white" disabled={!selectedUserIds.length || isPending} onClick={() => {
                void runAction(() => fetch("/api/admin/users/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync-bilimclass", userIds: selectedUserIds }) }), t.success);
              }}>
                {t.syncSelected}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredUsers.map((user) => {
            const draft = getUserDraft(user.id);
            return (
              <div key={user.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="grid gap-3 xl:grid-cols-[auto_1.1fr_1fr_0.7fr_auto]">
                  <label className="flex items-start pt-3">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={(event) => {
                        setSelectedUserIds((current) =>
                          event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id)
                        );
                      }}
                    />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={draft.fullName} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, fullName: event.target.value } }))} />
                    <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={draft.email} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, email: event.target.value } }))} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={draft.role} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, role: event.target.value as Role } }))}>
                      {Object.values(Role).map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={draft.classId} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, classId: event.target.value } }))}>
                      <option value="">{t.allClasses}</option>
                      {data.classes.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t.blockedReason} value={draft.blockedReason} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, blockedReason: event.target.value } }))} />
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                      <input type="checkbox" checked={draft.isBlocked} onChange={(event) => setUserDrafts((current) => ({ ...current, [user.id]: { ...draft, isBlocked: event.target.checked } }))} />
                      {draft.isBlocked ? t.blocked : t.active}
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium" onClick={() => setExpandedUserId((current) => current === user.id ? null : user.id)}>
                      <Eye className="h-4 w-4" />
                      {t.details}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-royal px-3 py-2.5 text-sm font-medium text-white"
                      disabled={isPending}
                      onClick={() => {
                        void runAction(() => fetch(`/api/admin/users/${user.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fullName: draft.fullName,
                            email: draft.email || null,
                            role: draft.role,
                            isBlocked: draft.isBlocked,
                            blockedReason: draft.blockedReason || null,
                            classId: draft.classId || null
                          })
                        }), t.success);
                      }}
                    >
                      <Save className="h-4 w-4" />
                      {isPending ? t.saving : t.save}
                    </button>
                  </div>
                </div>

                {expandedUserId === user.id ? (
                  <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-4">
                    <div><span className="font-medium text-ink">{t.user}:</span> {user.username}</div>
                    <div><span className="font-medium text-ink">{t.classLabel}:</span> {user.className ?? "—"}</div>
                    <div><span className="font-medium text-ink">BilimClass:</span> {user.latestBilimStatus ?? "—"}</div>
                    <div><span className="font-medium text-ink">Login:</span> {formatDate(locale, user.lastLoginAt)}</div>
                    <div><span className="font-medium text-ink">IP:</span> {user.lastLoginIp ?? "—"}</div>
                    <div><span className="font-medium text-ink">UA:</span> {user.lastUserAgent ?? "—"}</div>
                    <div><span className="font-medium text-ink">Parents:</span> {user.linkedParents}</div>
                    <div><span className="font-medium text-ink">Children:</span> {user.linkedChildren}</div>
                    {user.role === Role.student && user.studentProfileId ? (
                      <div className="md:col-span-4">
                        <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium" onClick={() => {
                          void runAction(() => fetch(`/api/admin/bilimclass/sync/${user.studentProfileId}`, { method: "POST" }), t.success);
                        }}>
                          <RefreshCcw className="h-4 w-4" />
                          {t.manualSync}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      ) : null}

      {showSection("links") || showSection("grades") ? (
      <div className={cn("grid gap-6", showSection("links") && showSection("grades") ? "xl:grid-cols-[0.9fr_1.1fr]" : "xl:grid-cols-1")}>
        {showSection("links") ? (
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Link2 className="h-5 w-5" />
            {t.linkManagement}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={linkForm.parentId} onChange={(event) => setLinkForm((current) => ({ ...current, parentId: event.target.value }))}>
              <option value="">{t.parent}</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.parentProfileId ?? ""}>{parent.fullName}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={linkForm.studentId} onChange={(event) => setLinkForm((current) => ({ ...current, studentId: event.target.value }))}>
              <option value="">{t.student}</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.studentProfileId ?? ""}>{student.fullName}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t.relation} value={linkForm.relation} onChange={(event) => setLinkForm((current) => ({ ...current, relation: event.target.value }))} />
              <button className="rounded-2xl bg-royal px-4 py-2.5 text-sm font-medium text-white" onClick={() => {
                void runAction(() => fetch("/api/admin/parent-links", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(linkForm)
                }), t.success);
              }}>
                {t.createLink}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data.parentLinks.map((link) => (
              <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="text-sm">
                  <span className="font-medium text-ink">{link.parentName}</span> → <span className="font-medium text-ink">{link.studentName}</span>
                  <div className="text-slate-500">{link.className} · {link.relation}</div>
                </div>
                <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600" onClick={() => {
                  void runAction(() => fetch(`/api/admin/parent-links/${link.id}`, { method: "DELETE" }), t.success);
                }}>
                  <Trash2 className="h-4 w-4" />
                  {t.unlink}
                </button>
              </div>
            ))}
          </div>
        </div>
        ) : null}

        {showSection("grades") ? (
        <div className="panel p-5">
          <div className="text-lg font-semibold text-ink">{t.gradeManagement}</div>
          <div className="mt-4 space-y-3">
            {data.grades.slice(0, 18).map((grade) => {
              const draft = getGradeDraft(grade.id);
              return (
                <div key={grade.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink">{grade.studentName} · {grade.subjectName}</div>
                      <div className="text-sm text-slate-500">{grade.className} · {grade.periodType}-{grade.periodNumber} · {grade.source}</div>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(locale, grade.updatedAt)}</div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[0.8fr_0.8fr_1fr_auto]">
                    <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t.rawScore} value={draft.rawScore} onChange={(event) => setGradeDrafts((current) => ({ ...current, [grade.id]: { ...draft, rawScore: event.target.value } }))} />
                    <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t.finalScore} value={draft.finalScore} onChange={(event) => setGradeDrafts((current) => ({ ...current, [grade.id]: { ...draft, finalScore: event.target.value } }))} />
                    <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t.note} value={draft.adminNote} onChange={(event) => setGradeDrafts((current) => ({ ...current, [grade.id]: { ...draft, adminNote: event.target.value } }))} />
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                      <input type="checkbox" checked={draft.isHidden} onChange={(event) => setGradeDrafts((current) => ({ ...current, [grade.id]: { ...draft, isHidden: event.target.checked } }))} />
                      {t.hidden}
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button className="inline-flex items-center gap-2 rounded-2xl bg-royal px-3 py-2.5 text-sm font-medium text-white" onClick={() => {
                      void runAction(() => fetch(`/api/admin/grades/${grade.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          rawScore: draft.rawScore || null,
                          finalScore: draft.finalScore ? Number(draft.finalScore) : null,
                          isHidden: draft.isHidden,
                          adminNote: draft.adminNote || null
                        })
                      }), t.success);
                    }}>
                      <Save className="h-4 w-4" />
                      {t.save}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        ) : null}
      </div>
      ) : null}

      {showSection("integrations") ? (
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold text-ink">BilimClass</div>
          {showSection("exports") ? (
            <a className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-ink" href="/api/admin/export?target=logs">
              <Download className="h-4 w-4" />
              {t.exportLogs}
            </a>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {data.bilimConnections.length ? (
            data.bilimConnections.map((connection) => (
              <div key={connection.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-ink">{connection.studentName ?? "—"}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {connection.className ?? "—"} · {connection.mode} · {connection.lastStatus ?? "—"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{formatDate(locale, connection.lastSyncedAt)}</div>
                    {connection.latestError ? (
                      <div className="mt-2 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
                        {connection.latestError}
                      </div>
                    ) : null}
                  </div>
                  {connection.studentId ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl bg-royal px-3 py-2.5 text-sm font-medium text-white"
                      onClick={() => {
                        void runAction(() => fetch(`/api/admin/bilimclass/sync/${connection.studentId}`, { method: "POST" }), t.success);
                      }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t.manualSync}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">{t.noData}</div>
          )}
        </div>
      </div>
      ) : null}

      {showSection("logs") ? (
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold text-ink">{t.logs}</div>
          <div className="grid gap-3 md:grid-cols-5">
            <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t.search} value={logQuery} onChange={(event) => setLogQuery(event.target.value)} />
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={logEventType} onChange={(event) => setLogEventType(event.target.value)}>
              <option value="all">{t.eventType}</option>
              {[...new Set(data.auditLogs.map((log) => log.eventType))].map((eventType) => (
                <option key={eventType} value={eventType}>{eventType}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={logStatus} onChange={(event) => setLogStatus(event.target.value)}>
              <option value="all">{t.allStatuses}</option>
              {[...new Set(data.auditLogs.map((log) => log.status))].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" value={logRole} onChange={(event) => setLogRole(event.target.value)}>
              <option value="all">{t.allRoles}</option>
              {[...new Set(data.auditLogs.map((log) => log.actorRole).filter(Boolean))].map((role) => (
                <option key={role} value={role ?? ""}>{role}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" type="date" value={logDateFrom} onChange={(event) => setLogDateFrom(event.target.value)} />
              <input className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm" type="date" value={logDateTo} onChange={(event) => setLogDateTo(event.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("pill", log.status === "failed" ? "bg-danger/10 text-danger" : log.status === "warning" ? "bg-warning/15 text-warning" : "bg-success/10 text-success")}>
                      {log.status}
                    </span>
                    <span className="font-medium text-ink">{log.action}</span>
                    <span className="text-sm text-slate-500">{log.eventType}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{log.message}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {t.user}: {log.actorName ?? "—"} {log.actorRole ? `(${log.actorRole})` : ""} · {log.targetName ?? "—"} · {t.ip}: {log.ipAddress ?? "—"} · {log.userAgent ?? "—"}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDate(locale, log.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {feedback ? (
        <div className={cn("rounded-2xl px-4 py-3 text-sm", feedback.tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
          {feedback.text}
        </div>
      ) : null}
    </section>
  );
}

