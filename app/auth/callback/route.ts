import { NextResponse, type NextRequest } from "next/server";

import { authErrorKey } from "@/lib/auth/errors";
import { failurePath, safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/supabase/server";

/**
 * Exchange a PKCE `code` for a session.
 *
 * The templates in supabase/templates send users to /auth/confirm instead, so
 * nothing hits this route as long as they are in place. It stays because those
 * templates live on the Supabase side: reset one in the dashboard and its links
 * fall back to the stock `{{ .ConfirmationURL }}`, which sends the browser
 * through GoTrue's /verify and on to the `redirectTo` we asked for — this. The
 * exchange needs the code verifier @supabase/ssr stored in a cookie, so unlike
 * /auth/confirm it only works in the browser that started the flow.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"), "/");
  // A password reset is the one flow whose failure has somewhere better to go
  // than the login page, and `next` is all this route knows about the link.
  const flow = next.startsWith("/update-password") ? ("recovery" as const) : null;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    const [pathname, search] = path.split("?");
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    return NextResponse.redirect(url);
  };

  // GoTrue reports a refused link by redirecting here with the reason attached.
  if (params.get("error") || params.get("error_code")) {
    return redirectTo(failurePath(flow, "linkExpired"));
  }

  const code = params.get("code");
  if (!code) {
    return redirectTo(failurePath(flow, "linkExpired"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo(failurePath(flow, authErrorKey(error)));
  }

  return redirectTo(next);
}
