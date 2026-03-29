import { Suspense } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LoginForm } from "@/components/forms/login-form";
import { prisma } from "@/lib/db/prisma";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n/server";

export default async function LoginPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale);
  const classes = await prisma.schoolClass.findMany({
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-grain px-4 py-10">
      <div className="grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-dark relative flex min-h-[560px] flex-col justify-between overflow-hidden p-8 lg:p-10">
          <div className="absolute right-8 top-8">
            <LanguageSwitcher locale={locale} label={copy.language} names={copy.localeName} dark />
          </div>
          <div className="max-w-xl">
            <BrandLogo className="w-[230px] rounded-[1.75rem] shadow-2xl" priority />
            <h1 className="mt-8 font-display text-5xl font-bold leading-tight">{copy.login.title}</h1>
            <p className="mt-6 max-w-lg text-base text-white/70">{copy.login.subtitle}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.login.features.map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-center">
          <Suspense fallback={<div className="panel w-full max-w-md p-6 text-sm text-slate-500">{copy.login.loading}</div>}>
            <LoginForm locale={locale} classes={classes} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}


