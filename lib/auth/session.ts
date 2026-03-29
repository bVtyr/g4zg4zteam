import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, REFRESH_COOKIE, REFRESH_TTL_SECONDS } from "@/lib/auth/constants";
import { signAccessToken, signRefreshToken, verifyAccessToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
  fullName: string;
};

export async function issueSession(response: NextResponse, user: SessionUser) {
  const accessToken = await signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName
  });

  const refreshToken = await signRefreshToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await hashPassword(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000)
    }
  });

  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_TTL_SECONDS,
    path: "/"
  });

  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: REFRESH_TTL_SECONDS,
    path: "/"
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);
    const dbUser = await prisma.user.findUnique({
      where: {
        id: payload.sub
      },
      select: {
        id: true,
        username: true,
        role: true,
        fullName: true,
        isBlocked: true
      }
    });

    if (!dbUser || dbUser.isBlocked) {
      return null;
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      fullName: dbUser.fullName
    };
  } catch {
    return null;
  }
}

export async function requireSession(roles?: Role[]) {
  const session = await getSessionUser();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (roles && !roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
