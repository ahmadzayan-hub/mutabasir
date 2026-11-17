import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Middleware does two things:
// 1) Refresh the Supabase session by calling getUser() — the SDK rewrites
//    the auth cookies onto the outgoing response when refresh is needed.
// 2) Gate the workspace routes (/projects, /new, /settings) behind auth.
// Auth pages (/sign-in, /sign-up) redirect authed users to /projects.
// Demo mode (env vars missing) is a no-op so the cookie-backed mock store
// continues to work unchanged.

const PROTECTED_PREFIXES = ["/projects", "/new", "/settings"];
const AUTH_PREFIXES = ["/sign-in", "/sign-up"];

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = !!url && !!anon && url.startsWith("http");
  if (!configured) return NextResponse.next();

  const res = NextResponse.next({ request: req });
  const supabase = createServerClient(url!, anon!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // A Supabase outage shouldn't take down the whole site. Treat the
    // request as unauthenticated and let route-level errors surface.
    console.warn("[middleware] auth.getUser failed:", err);
  }

  const pathname = req.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAuthPage = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isProtected && !user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }
  if (isAuthPage && user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/projects";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  // Skip static assets and the published share preview (public read).
  matcher: ["/((?!_next|api|favicon|icon|opengraph|robots|sitemap|.*\\..*).*)"],
};
