import { isAuthErrorKey } from "@/lib/auth/errors";

import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // A recovery link that no longer works sends the user back here, with the
  // reason in `?error=`, rather than to a dead end.
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <ForgotPasswordForm initialError={isAuthErrorKey(error) ? error : null} />
    </div>
  );
}
