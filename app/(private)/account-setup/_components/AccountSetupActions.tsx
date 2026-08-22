"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { client } from "@/api/browser/client";
import { Button } from "@/components/ui/button";

/**
 * The two things someone stuck on this page can usefully do: check again once
 * an admin has set them up, or sign out and come back as somebody else.
 *
 * "Check again" is a refresh rather than a link to /patients — the page itself
 * sends them on as soon as the profile exists, so one button covers both the
 * "not yet" and the "it's ready" case.
 */
export function AccountSetupActions() {
  const t = useTranslations("auth.accountSetup");
  const router = useRouter();
  const [isChecking, startChecking] = useTransition();

  const handleRecheck = () => {
    startChecking(() => {
      router.refresh();
    });
  };

  const handleLogout = async () => {
    await client.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button onClick={handleRecheck} disabled={isChecking}>
        {isChecking ? t("checking") : t("recheck")}
      </Button>
      <Button variant="outline" onClick={handleLogout}>
        {t("logout")}
      </Button>
    </div>
  );
}
