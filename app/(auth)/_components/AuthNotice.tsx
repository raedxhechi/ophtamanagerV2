import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AuthNoticeKey } from "@/lib/auth/notices";

/**
 * The "why am I on this screen?" panel above the login form.
 *
 * Amber and informational rather than destructive: nothing has gone wrong, the
 * user has simply been sent here from somewhere else and is owed an
 * explanation. Styling it like the field errors below would tell them the
 * opposite.
 */
export function AuthNotice({ notice }: { notice: AuthNoticeKey }) {
  const t = useTranslations("auth.notices");

  return (
    <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
      <div className="space-y-1">
        <p className="font-medium">{t(`${notice}.title`)}</p>
        <p className="text-muted-foreground">{t(`${notice}.body`)}</p>
      </div>
    </div>
  );
}
