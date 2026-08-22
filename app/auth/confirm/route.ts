import { NextResponse, type NextRequest } from "next/server";

import { authErrorKey } from "@/lib/auth/errors";
import {
  failurePath,
  isEmailOtpType,
  landingFor,
  safeNextPath,
} from "@/lib/auth/redirects";
import { createClient } from "@/supabase/server";

/**
 * Turn the `token_hash` in an auth email into a session.
 *
 * This is the landing spot for every link the templates in supabase/templates
 * build. Verifying server-side is what makes those links work from any device:
 * unlike the PKCE flow handled by /auth/callback, there is no code verifier
 * that has to still be sitting in the browser that started the flow — the
 * account's mailbox is the proof. The session cookies are set on the redirect
 * response, so the page named by `next` renders already signed in.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    const [pathname, search] = path.split("?");
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    return NextResponse.redirect(url);
  };

  if (!tokenHash || !isEmailOtpType(type)) {
    return redirectTo(failurePath(null, "linkExpired"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return redirectTo(failurePath(type, authErrorKey(error)));
  }

  return redirectTo(safeNextPath(params.get("next"), landingFor(type)));
}
