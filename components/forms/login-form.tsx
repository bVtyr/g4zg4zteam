"use client";

import { Role } from "@prisma/client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type Locale, getDictionary, translateRole } from "@/lib/i18n";

const authCopy = {
  ru: {
    register: "Регистрация",
    fullName: "ФИО",
    email: "Email",
    role: "Роль",
    classLabel: "Класс",
    createAccount: "Создать аккаунт",
    creating: "Создаем...",
    switchToLogin: "Уже есть аккаунт? Войти",
    switchToRegister: "Нет аккаунта? Зарегистрироваться",
    classRequired: "Для ученика нужно выбрать класс.",
    usernameTaken: "Этот логин уже занят.",
    emailTaken: "Этот email уже используется.",
    registrationFailed: "Не удалось создать аккаунт.",
    roleHint: "Публичная регистрация открыта для ученика, родителя и учителя."
  },
  kz: {
    register: "Тіркелу",
    fullName: "Аты-жөні",
    email: "Email",
    role: "Рөл",
    classLabel: "Сынып",
    createAccount: "Аккаунт ашу",
    creating: "Құрылуда...",
    switchToLogin: "Аккаунтыңыз бар ма? Кіру",
    switchToRegister: "Аккаунт жоқ па? Тіркелу",
    classRequired: "Оқушы үшін сынып таңдау қажет.",
    usernameTaken: "Бұл логин бос емес.",
    emailTaken: "Бұл email қолданылып тұр.",
    registrationFailed: "Аккаунт ашу мүмкін болмады.",
    roleHint: "Ашық тіркеу оқушы, ата-ана және мұғалім үшін қолжетімді."
  }
} as const;

function mapRegistrationError(locale: Locale, code: string) {
  const t = authCopy[locale];
  if (code === "USERNAME_TAKEN") return t.usernameTaken;
  if (code === "EMAIL_TAKEN") return t.emailTaken;
  if (code === "CLASS_REQUIRED") return t.classRequired;
  return t.registrationFailed;
}

export function LoginForm({
  locale,
  classes
}: {
  locale: Locale;
  classes: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerRole, setRegisterRole] = useState<"student" | "parent" | "teacher">(Role.student);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = getDictionary(locale);
  const extra = authCopy[locale];

  return (
    <form
      className="panel w-full max-w-md space-y-4 p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const formData = new FormData(event.currentTarget);

        const isRegister = mode === "register";
        const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            isRegister
              ? {
                  fullName: String(formData.get("fullName") ?? ""),
                  username: String(formData.get("username") ?? ""),
                  password: String(formData.get("password") ?? ""),
                  email: String(formData.get("email") ?? ""),
                  role: String(formData.get("role") ?? registerRole),
                  classId: String(formData.get("classId") ?? "")
                }
              : {
                  username: formData.get("username"),
                  password: formData.get("password")
                }
          )
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setPending(false);
          setError(isRegister ? mapRegistrationError(locale, String(payload?.error ?? "")) : copy.login.invalid);
          return;
        }

        router.push(params.get("next") || payload.redirectTo || "/");
        router.refresh();
      }}
    >
      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-royal/60">{copy.login.formBadge}</div>
        <div className="mt-3 inline-flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "login" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            {copy.login.signIn}
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "register" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            {extra.register}
          </button>
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink">{mode === "login" ? copy.login.signIn : extra.register}</h2>
      </div>

      {mode === "register" ? (
        <input
          name="fullName"
          autoComplete="name"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder={extra.fullName}
          required
        />
      ) : null}

      <input
        name="username"
        autoComplete="username"
        defaultValue={mode === "login" ? "student" : ""}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        placeholder={copy.login.username}
        required
      />

      {mode === "register" ? (
        <input
          name="email"
          autoComplete="email"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder={extra.email}
          type="email"
          required
        />
      ) : null}

      {mode === "register" ? (
        <>
          <select
            name="role"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            value={registerRole}
            onChange={(event) => setRegisterRole(event.target.value as "student" | "parent" | "teacher")}
          >
            {[Role.student, Role.parent, Role.teacher].map((role) => (
              <option key={role} value={role}>
                {extra.role}: {translateRole(locale, role)}
              </option>
            ))}
          </select>
          {registerRole === Role.student ? (
            <select
              name="classId"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              defaultValue={classes[0]?.id ?? ""}
            >
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {extra.classLabel}: {schoolClass.name}
                </option>
              ))}
            </select>
          ) : null}
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{extra.roleHint}</div>
        </>
      ) : null}

      <input
        name="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        defaultValue={mode === "login" ? "demo12345" : ""}
        type="password"
        className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        placeholder={copy.login.password}
        required
      />
      {error ? <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <button disabled={pending} className="w-full rounded-2xl bg-royal px-5 py-3 font-semibold text-white">
        {pending ? (mode === "login" ? copy.login.submitting : extra.creating) : mode === "login" ? copy.login.submit : extra.createAccount}
      </button>

      <button
        type="button"
        className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600"
        onClick={() => {
          setMode((current) => (current === "login" ? "register" : "login"));
          setError(null);
        }}
      >
        {mode === "login" ? extra.switchToRegister : extra.switchToLogin}
      </button>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        {copy.login.testAccounts}: `student`, `teacher`, `parent`, `parent2`, `admin`
        <br />
        {copy.login.password}: `demo12345`
      </div>
    </form>
  );
}
