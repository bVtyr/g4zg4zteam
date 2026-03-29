import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PortfolioList } from "@/components/cards/portfolio-list";
import { getPortfolioForCurrentUser, requirePageRole } from "@/lib/services/portal-data";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";
import { Role } from "@prisma/client";

export default async function PortfolioPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const session = await requirePageRole([Role.student, Role.parent]);
  const data = await getPortfolioForCurrentUser(locale);

  return (
    <DashboardShell
      role={session.role}
      locale={locale}
      userName={session.fullName}
      currentPath="/portfolio"
      title={copy.portfolio.title}
      subtitle={copy.portfolio.subtitle}
    >
      <PortfolioList achievements={data.achievements} certificates={data.certificates} items={data.portfolioItems} locale={locale} />
    </DashboardShell>
  );
}
