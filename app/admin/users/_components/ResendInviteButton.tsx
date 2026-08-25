"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { resendInvite } from "../actions";
import type { UserStatus } from "./AdminUsersData";

/** Only an account that never signed in can still be waiting on an invitation. */
export function canResendInvite(status: UserStatus): boolean {
  return status !== "active";
}

/**
 * Sends the invitation again to someone who never accepted it.
 *
 * A button calling the action through a transition rather than a form: this
 * appears inside the edit drawer, whose whole body is already a form, and
 * nesting one form in another is invalid HTML — the browser drops the inner one
 * and the click submits the profile instead.
 */
export function ResendInviteButton({
  userId,
  status,
  size = "sm",
  variant = "outline",
  className,
}: {
  userId: string;
  /** Decides the wording: an account that was never invited gets "Send". */
  status: UserStatus;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // "Never signed in" with no invitation behind it is an account made straight
  // from the Supabase dashboard: there is nothing to *re*-send.
  const label = status === "invited" ? "Resend invitation" : "Send invitation";

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={isPending}
      className={className}
      onClick={(event) => {
        // In the table this sits inside a row whose click opens the drawer.
        event.stopPropagation();
        startTransition(async () => {
          const result = await resendInvite(userId);
          if ("error" in result) {
            toast.error(result.error);
            return;
          }
          toast.success(`Invitation sent to ${result.email}`);
          // The action revalidates; this is what re-runs the query for the page
          // the admin is standing on, so the new invitation date shows up.
          router.refresh();
        });
      }}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Send />}
      {label}
    </Button>
  );
}
