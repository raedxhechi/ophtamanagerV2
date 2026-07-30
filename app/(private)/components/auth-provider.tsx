'use client'

import { client } from "@/api/client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      console.log({ event, session })
      if (!session) {
        router.replace('/login')
      }
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [router])
    return <>{children}</>
}