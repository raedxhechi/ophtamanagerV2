import { isAuthErrorKey } from "@/lib/auth/errors"
import { authNoticeKey } from "@/lib/auth/notices"

import { LoginForm } from "./components/loginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  // The auth route handlers park the reason a link failed in `?error=`.
  // `?message=` is the other direction: it comes from the live app's proxy,
  // which sends admins here and needs them to know why. The proxy above keeps
  // the query string when it bounces a signed-out visitor to /login, so the
  // param survives that hop on its own — and a visitor who already has a
  // session never reaches this page, which is exactly when the notice would be
  // beside the point.
  const { error, message } = await searchParams

  return (
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <LoginForm
        initialError={isAuthErrorKey(error) ? error : null}
        notice={authNoticeKey(message)}
      />
    </div>
  )
}
