'use client'

import { client } from "./client"

export const login = async ({ email, password }: { email: string, password: string }) => {
    const response = await client.auth.signInWithPassword({ email, password })
    console.log({ loginResponse: response })
    if (response.error) {
        throw response.error
    }
    return response.data
}

export const register = async ({ email, password }: { email: string, password: string }) => {
    const response = await client.auth.signUp({
        email, password, options: {
            emailRedirectTo: `http://localhost:3000/confirm_email`
        }
    })
    console.log({ registerResponse: response })
}

export const logout = async () => {
    const response = await client.auth.signOut()
    console.log({ logoutResponse: response })
}

export const confirmEmail = async ({ code }: { code: string }) => {
    const response = await client.auth.exchangeCodeForSession(code)
    console.log({ confirmEmailResponse: response })
    return response
}

