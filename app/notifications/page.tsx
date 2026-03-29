import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getNotificationsForCurrentUser, requirePageRole } from "@/lib/services/portal-data";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function NotificationsPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const session = await requirePageRole();
  const receipts = await getNotificationsForCurrentUser(locale);

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/notifications"
      title={copy.notifications.title}
      subtitle={copy.notifications.subtitle}
    >
      <div className="table-shell">
        {receipts.map((receipt) => (
          <div key={receipt.id} className="table-row px-5 py-4 first:border-t-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {new Intl.DateTimeFormat(locale === "kz" ? "kk-KZ" : "ru-RU", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }).format(new Date(receipt.deliveredAt))}
                </div>
                <h3 className="mt-1 text-base font-semibold text-ink">{receipt.notification.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{receipt.notification.body}</p>
              </div>
              <span className={`pill ${receipt.isRead ? "bg-slate-100 text-slate-500" : "bg-aqua/15 text-ink"}`}>
                {receipt.isRead ? copy.notifications.read : copy.notifications.unread}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
