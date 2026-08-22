"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { updatePassword } from "@/api/browser";
import { authErrorKey, MIN_PASSWORD_LENGTH, type AuthErrorKey } from "@/lib/auth/errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { AuthHeader } from "./AuthHeader";

/**
 * Which flow brought the user here. Both end in the same call — the difference
 * is only what the page says and which `auth.*` messages it reads.
 */
export type SetPasswordVariant = "updatePassword" | "acceptInvite";

/**
 * Choose a password for the session that is already signed in.
 *
 * Reached from a recovery link (/update-password) or an invite
 * (/accept-invite); /auth/confirm has turned the emailed token into a session
 * before either page renders, so there is nothing to verify here.
 */
export function SetPasswordForm({
  variant,
  email,
  className,
  ...props
}: React.ComponentProps<"form"> & {
  variant: SetPasswordVariant;
  email?: string | null;
}) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("auth.errors");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmation = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorKey("passwordTooShort");
      return;
    }
    if (password !== confirmation) {
      setErrorKey("passwordMismatch");
      return;
    }

    setLoading(true);
    setErrorKey(null);
    try {
      await updatePassword({ password });
      toast.success(t(`${variant}.success`));
      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorKey(authErrorKey(error));
      setLoading(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <AuthHeader
          title={t(`${variant}.title`)}
          description={t(`${variant}.subtitle`, { email: email ?? "" })}
        />
        <Field>
          <FieldLabel htmlFor="password">{t("fields.newPassword")}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          <FieldDescription>
            {t("fields.passwordHint", { min: MIN_PASSWORD_LENGTH })}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">{t("fields.confirmPassword")}</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
        {errorKey && (
          <FieldError>{tErrors(errorKey, { min: MIN_PASSWORD_LENGTH })}</FieldError>
        )}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : t(`${variant}.submit`)}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
