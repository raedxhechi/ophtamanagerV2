'use client'

import { client } from "@/api/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function PrivatePage() {
    const router = useRouter()
    const [loggedIn, setLoggedIN] = useState<string>('dunno')
    const [session, setSession] = useState<any>({})
    const handleCheck = async ()=>{
        const {data} = await client.auth.getUser()
        setLoggedIN(data.user ? 'yes' : 'no')
        setSession(data.user)
    }
    return (
          <div className="p-6 w-full max-w-full">
            <h1 className="text-2xl font-bold mb-4">Private Page</h1>
            <Button onClick={handleCheck} className="mb-4">Am I logged in? </Button>
            <div className="mb-4">
                <span className="font-semibold">Status: </span>
                <span>{loggedIn}</span>
            </div>
            <pre className="mt-4 p-4 bg-muted rounded-lg overflow-auto break-all whitespace-pre-wrap text-xs">
                {JSON.stringify(session, null, 2)}
            </pre>
        </div>
    )
}