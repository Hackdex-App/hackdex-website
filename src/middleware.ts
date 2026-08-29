import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function pathSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function isHackDetailPath(pathname: string) {
  const segments = pathSegments(pathname);
  return segments.length === 2 && segments[0] === "hack";
}

function isHackSessionPath(pathname: string) {
  const segments = pathSegments(pathname);
  return (
    segments.length === 3 &&
    segments[0] === "hack" &&
    segments[2] === "session"
  );
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hackDetail = isHackDetailPath(pathname);
  const hackSession = isHackSessionPath(pathname);
  const signedIn = hasSupabaseAuthCookie(request);

  // Matcher `has.cookie` is exact-name only and misses chunked Supabase cookies
  // (`sb-*-auth-token.0`). Inspect cookies here; see Next.js middleware docs.
  if ((hackDetail || hackSession) && !signedIn) {
    return NextResponse.next();
  }

  const sessionResponse = await updateSession(request);

  if (hackSession) {
    const slug = pathSegments(pathname)[1];
    const redirectResponse = NextResponse.redirect(
      new URL(`/hack/${slug}`, request.url),
    );
    sessionResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (hackDetail) {
    const slug = pathSegments(pathname)[1];
    const rewriteResponse = NextResponse.rewrite(
      new URL(`/hack/${slug}/session`, request.url),
    );
    sessionResponse.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie);
    });
    return rewriteResponse;
  }

  return sessionResponse;
}

// Matcher values must be string literals (statically analyzed). `/hack/:slug`
// matches `/hack/foo` but not `/hack/foo/edit`. Separate matcher objects are OR;
// items in a single `has` array are AND.
export const config = {
  matcher: [
    { source: "/hack/:slug" },
    { source: "/hack/:slug/session" },
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "cookie", key: "sb-scfxbqapigdjfebqwmoj-auth-token" }],
    },
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "cookie", key: "sb-scfxbqapigdjfebqwmoj-auth-token.0" }],
    },
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "cookie", key: "sb-127-auth-token" }],
    },
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "cookie", key: "sb-127-auth-token.0" }],
    },
  ],
};
