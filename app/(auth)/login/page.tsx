import { isAuthErrorKey } from "@/lib/auth/errors"

import { LoginForm } from "./components/loginForm"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // The auth route handlers park the reason a link failed in `?error=`.
  const { error } = await searchParams

  return (
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <LoginForm initialError={isAuthErrorKey(error) ? error : null} />
    </div>
  )
}
