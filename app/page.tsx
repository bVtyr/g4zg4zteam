import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { roleLanding } from "@/lib/rbac/access";

export default async function HomePage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  redirect(roleLanding[session.role]);
}
