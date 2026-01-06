import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSessionValue } from "@/lib/adminAuth";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "missing-secret");
    return NextResponse.redirect(url);
  }

  const sessionValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifyAdminSessionValue(sessionValue, secret);
  if (ok) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}


