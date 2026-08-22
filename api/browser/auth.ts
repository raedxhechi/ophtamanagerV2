'use client'

import { client } from "./client"

export const login = async ({ email, password }: { email: string, password: string }) => {
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
        throw error
    }
    return data
}

export const logout = async () => {
    const { error } = await client.auth.signOut()
    if (error) {
        throw error
    }
}

/**
 * Send the "reset your password" email.
 *
 * `redirectTo` only matters if the recovery email template is ever reset to the
 * stock `{{ .ConfirmationURL }}`: the template in supabase/templates/recovery.html
 * builds its own link to /auth/confirm and lands on /update-password from there.
 * Either way the user ends up on the same page.
 */
export const requestPasswordReset = async ({ email }: { email: string }) => {
    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })
    if (error) {
        throw error
    }
}

/**
 * Set a new password for the signed-in user.
 *
 * Used by both /update-password (recovery session) and /accept-invite (invite
 * session); in both cases the session was established by /auth/confirm before
 * the page rendered.
 */
export const updatePassword = async ({ password }: { password: string }) => {
    const { data, error } = await client.auth.updateUser({ password })
    if (error) {
        throw error
    }
    return data
}
