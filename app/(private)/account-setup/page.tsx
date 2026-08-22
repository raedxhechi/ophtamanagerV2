import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AccountSetupActions } from "./_components/AccountSetupActions";

/**
 * Where a signed-in account with no public.user_data row lands.
 *
 * The account is real and the session is valid — sign-in, token refresh and
 * every query all succeed. What is missing is the profile that carries the role
 * and the office, and RLS keys off both: without it `current_office_id()` is
 * null, so the patient and order lists come back empty and correct. The result
 * is an app that looks like it works and shows nothing, with no way for the
 * person in front of it to tell that from "there is no data yet".
 *
 * This page says so. An admin fixes it from /admin/users, where accounts
 * without a profile are already listed.
 *
 * Deliberately outside the (withHeader) group: that layout is what redirects
 * here, and a page inside it would redirect to itself forever. It is still
 * under (private), so proxy.ts requires a session to reach it.
 */
export default async function AccountSetupPage() {
  const supabase = await createClient();
  const t = await getTranslations("auth.accountSetup");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Only leave on a row we actually saw. A failed read returns null just like a
  // missing row does, and bouncing to /patients on a transient error would send
  // the user straight back here.
  const { data: profile } = await supabase
    .from("user_data")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    redirect("/patients");
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("subtitle", { email: user.email ?? "" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-muted-foreground text-sm">{t("explanation")}</p>
            <AccountSetupActions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
