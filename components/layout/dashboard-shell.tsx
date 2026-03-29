import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Cog,
  LayoutDashboard,
  MonitorPlay,
  NotebookPen,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCog,
  Workflow
} from "lucide-react";
import { Role } from "@prisma/client";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ScheduleSidebarSection } from "@/components/schedule/schedule-sidebar-section";
import { type Locale, getDictionary, translateRole } from "@/lib/i18n";
import { getScheduleSectionCopy } from "@/lib/schedule/copy";
import { scheduleSectionItems } from "@/lib/schedule/navigation";
import { cn } from "@/lib/utils";

export function DashboardShell({
  role,
  locale,
  title,
  subtitle,
  currentPath,
  userName,
  children,
  headerAside
}: {
  role: Role;
  locale: Locale;
  title: string;
  subtitle: string;
  currentPath: string;
  userName: string;
  children: React.ReactNode;
  headerAside?: React.ReactNode;
}) {
  const copy = getDictionary(locale);
  const navByRole: Record<Role, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>> = {
    student: [
      { href: "/dashboard/student", label: copy.nav.dashboard, icon: LayoutDashboard },
      { href: "/portfolio", label: copy.nav.portfolio, icon: NotebookPen },
      { href: "/schedule", label: copy.nav.schedule, icon: CalendarDays },
      { href: "/notifications", label: copy.nav.notifications, icon: Bell }
    ],
    teacher: [
      { href: "/dashboard/teacher", label: copy.nav.dashboard, icon: LayoutDashboard },
      { href: "/schedule", label: copy.nav.schedule, icon: CalendarDays },
      { href: "/notifications", label: copy.nav.notifications, icon: Bell }
    ],
    parent: [
      { href: "/dashboard/parent", label: copy.nav.dashboard, icon: LayoutDashboard },
      { href: "/portfolio", label: copy.nav.portfolio, icon: NotebookPen },
      { href: "/schedule", label: copy.nav.schedule, icon: CalendarDays },
      { href: "/notifications", label: copy.nav.notifications, icon: Bell }
    ],
    admin: [
      { href: "/dashboard/admin", label: copy.nav.dashboard, icon: LayoutDashboard },
      { href: "/admin/schedule", label: copy.nav.schedule, icon: CalendarDays },
      { href: "/notifications", label: copy.nav.notifications, icon: Bell },
      { href: "/kiosk", label: copy.nav.kiosk, icon: MonitorPlay }
    ]
  };

  const nav = navByRole[role];
  const adminSectionCopy = {
    ru: {
      overview: "Обзор",
      users: "Пользователи и роли",
      schedule: "Расписание",
      events: "События и объявления",
      analytics: "Аналитика",
      integrations: "Интеграции",
      settings: "Настройки"
    },
    kz: {
      overview: "Шолу",
      users: "Пайдаланушылар мен рөлдер",
      schedule: "Кесте",
      events: "Оқиғалар мен хабарламалар",
      analytics: "Аналитика",
      integrations: "Интеграциялар",
      settings: "Баптаулар"
    }
  } as const;
  const adminSections = [
    { href: "/dashboard/admin", label: adminSectionCopy[locale].overview, icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: adminSectionCopy[locale].users, icon: UserCog },
    { href: "/admin/schedule", label: adminSectionCopy[locale].schedule, icon: Workflow },
    { href: "/dashboard/admin/events", label: adminSectionCopy[locale].events, icon: Bell },
    { href: "/dashboard/admin/analytics", label: adminSectionCopy[locale].analytics, icon: Sparkles },
    { href: "/dashboard/admin/integrations", label: adminSectionCopy[locale].integrations, icon: ShieldCheck },
    { href: "/dashboard/admin/settings", label: adminSectionCopy[locale].settings, icon: Cog }
  ];
  const showAdminSections = role === Role.admin && currentPath.startsWith("/dashboard/admin");
  const showScheduleSections = role === Role.admin && currentPath.startsWith("/admin/schedule");
  const scheduleSectionCopy = getScheduleSectionCopy(locale);

  function isNavActive(href: string) {
    if (href === "/dashboard/admin") {
      return currentPath === href || currentPath.startsWith("/dashboard/admin/");
    }

    if (href === "/admin/schedule") {
      return currentPath === href || currentPath.startsWith("/admin/schedule/");
    }

    return currentPath === href || currentPath.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-grain">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-5 px-4 py-4 lg:grid-cols-[272px_1fr] lg:px-5">
        <aside className="panel-dark flex flex-col gap-4 overflow-hidden p-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <BrandLogo className="w-[54px] rounded-lg" priority />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Aqbobek Lyceum</div>
              <div className="text-xs text-white/60">{copy.appSubtitle}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">{translateRole(locale, role)}</div>
            <div className="mt-1 text-[15px] font-semibold leading-5">{userName}</div>
            <div className="mt-2 line-clamp-3 text-sm leading-5 text-white/65">{copy.shell.schoolSpace}</div>
          </div>

          <LanguageSwitcher locale={locale} label={copy.language} names={copy.localeName} dark />

          <nav className="flex flex-1 flex-col gap-1.5">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isNavActive(item.href) ? "bg-white text-ink shadow-sm" : "text-white/78 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {showScheduleSections ? <ScheduleSidebarSection locale={locale} currentPath={currentPath} /> : null}

          <form action="/api/auth/logout" method="post">
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              <ScrollText className="h-4 w-4" />
              {copy.shell.logout}
            </button>
          </form>
        </aside>

        <main className="space-y-6 py-2">
          <div className="panel px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-royal/70">{copy.appName}</div>
                <h1 className="mt-1 text-[1.7rem] font-semibold text-ink">{title}</h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
              </div>
              {headerAside ?? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{copy.shell.overview}</div>
                  <div className="mt-1 text-sm font-semibold text-ink">{copy.secureSpace}</div>
                </div>
              )}
            </div>
            {showAdminSections ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {adminSections.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === "/dashboard/admin" ? currentPath === item.href : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                        active ? "border-royal bg-royal text-white" : "border-slate-200 bg-white text-slate-600 hover:border-royal/20 hover:text-royal"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : showScheduleSections ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {scheduleSectionItems.map((item) => {
                  const active = item.href === "/admin/schedule" ? currentPath === item.href : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                        active ? "border-royal bg-royal text-white" : "border-slate-200 bg-white text-slate-600 hover:border-royal/20 hover:text-royal"
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                      {scheduleSectionCopy[item.key]}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
