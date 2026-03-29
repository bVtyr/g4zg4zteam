import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedPrefixes = [
  "/dashboard",
  "/admin",
  "/portfolio",
  "/schedule",
  "/notifications"
];

async function hasValidAccessToken(request: NextRequest) {
  const token = request.cookies.get("aq_access")?.value;
  if (!token) {
    return { valid: false, hasCookie: false };
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    return { valid: false, hasCookie: true };
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return { valid: true, hasCookie: true };
  } catch {
    return { valid: false, hasCookie: true };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionState = await hasValidAccessToken(request);

  function clearAuthCookies(response: NextResponse) {
    response.cookies.set("aq_access", "", { path: "/", maxAge: 0 });
    response.cookies.set("aq_refresh", "", { path: "/", maxAge: 0 });
    return response;
  }

  if (pathname === "/login" && sessionState.valid) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/login" && sessionState.hasCookie && !sessionState.valid) {
    return clearAuthCookies(NextResponse.next());
  }

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !sessionState.valid) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return clearAuthCookies(NextResponse.redirect(url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*", "/portfolio", "/schedule", "/notifications"]
};
