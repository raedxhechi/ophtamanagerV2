"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { requestPasswordReset } from "@/api/browser";
import { authErrorKey, MIN_PASSWORD_LENGTH, type AuthErrorKey } from "@/lib/auth/errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { AuthHeader } from "../../_components/AuthHeader";

export function ForgotPasswordForm({
  initialError = null,
  className,
  ...props
}: React.ComponentProps<"form"> & { initialError?: AuthErrorKey | null }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("auth.errors");
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(initialError);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
    setLoading(true);
    setErrorKey(null);
    try {
      await requestPasswordReset({ email });
      // Supabase answers the same way whether or not the address has an
      // account, and so does this screen — saying "no such user" would turn the
      // form into a way to test which addresses are registered.
      setSentTo(email);
    } catch (error) {
      setErrorKey(authErrorKey(error));
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <MailCheck className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <AuthHeader
            title={t("forgotPassword.sentTitle")}
            description={t("forgotPassword.sentDescription", { email: sentTo })}
          />
          <Field>
            <Button type="button" variant="outline" onClick={() => setSentTo(null)}>
              {t("forgotPassword.sendAgain")}
            </Button>
          </Field>
          <Link
            href="/login"
            className="mx-auto text-sm underline-offset-4 hover:underline"
          >
            {t("actions.backToLogin")}
          </Link>
        </FieldGroup>
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <AuthHeader
          title={t("forgotPassword.title")}
          description={t("forgotPassword.subtitle")}
        />
        <Field>
          <FieldLabel htmlFor="email">{t("fields.email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
            required
          />
        </Field>
        {errorKey && (
          <FieldError>{tErrors(errorKey, { min: MIN_PASSWORD_LENGTH })}</FieldError>
        )}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : t("forgotPassword.submit")}
          </Button>
        </Field>
        <Link
          href="/login"
          className="mx-auto text-sm underline-offset-4 hover:underline"
        >
          {t("actions.backToLogin")}
        </Link>
      </FieldGroup>
    </form>
  );
}
