'use client'
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { login } from "@/api/browser"
import { authErrorKey, MIN_PASSWORD_LENGTH, type AuthErrorKey } from "@/lib/auth/errors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { AuthHeader } from "../../_components/AuthHeader"

export function LoginForm({
  initialError = null,
  className,
  ...props
}: React.ComponentProps<"form"> & { initialError?: AuthErrorKey | null }) {
  const t = useTranslations("auth")
  const tErrors = useTranslations("auth.errors")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // Seeded from `?error=`: this is where /auth/confirm sends someone whose
  // invite or magic link no longer works.
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(initialError)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorKey(null)
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value
    try {
      await login({ email, password })
      router.push('/')
      router.refresh()
    } catch (error) {
      setErrorKey(authErrorKey(error))
      setLoading(false)
    }
  }
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <AuthHeader title={t("login.title")} description={t("login.subtitle")} />
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
        <Field>
          <FieldLabel htmlFor="password">{t("fields.password")}</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          <Link
            href="/forgot-password"
            className="ml-auto text-sm underline-offset-4 hover:underline"
          >
            {t("login.forgotPassword")}
          </Link>
        </Field>
        {errorKey && (
          <FieldError>{tErrors(errorKey, { min: MIN_PASSWORD_LENGTH })}</FieldError>
        )}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : t("login.submit")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
