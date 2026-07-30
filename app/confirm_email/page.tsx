'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { confirmEmail } from '@/api/auth'

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const errorParams = {
    error: searchParams.get('error'),
    errorCode: searchParams.get('error_code'),
    errorDescription: searchParams.get('error_description'),
  }
  
  // Try to get the PKCE exchange code if present
  const authCode = searchParams.get('code')

  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    if (authCode) {
      setConfirmLoading(true)
      confirmEmail({ code: authCode })
        .then(() => {
          setConfirmLoading(false)
        })
        .catch((error) => {
          setConfirmLoading(false)
          setConfirmError(error.message)
        })
    }
  }, [authCode])

  const [hashParams, setHashParams] = useState<Record<string, string>>({})

  useEffect(() => {
    // Supabase often passes session data or errors in the URL hash fragment (#)
    if (window.location.hash) {
      // Remove the '#' prefix
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const parsed: Record<string, string> = {}
      params.forEach((value, key) => {
        parsed[key] = value
      })
      setHashParams(parsed)
    }
  }, [])

  const hasError = errorParams.error || Object.keys(hashParams).some(k => k.includes('error'))

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-lg space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Email Confirmation Details</h1>

        {hasError ? (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20 text-left">
            <h2 className="font-semibold mb-2 text-lg">Error Detected:</h2>
            <div className="space-y-4 text-sm">
              {errorParams.error && (
                <div>
                  <h3 className="font-bold underline mb-1">Query Parameters (?):</h3>
                  <p><strong>Error:</strong> {errorParams.error}</p>
                  <p><strong>Code:</strong> {errorParams.errorCode}</p>
                  <p><strong>Description:</strong> {errorParams.errorDescription}</p>
                </div>
              )}
              
              {Object.keys(hashParams).length > 0 && (
                <div>
                  <h3 className="font-bold underline mb-1">Hash Fragment Parameters (#):</h3>
                  {Object.entries(hashParams).map(([key, value]) => (
                    <p key={key}><strong>{key}:</strong> {value}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : authCode ? 
          <div className="rounded-md bg-green-500/10 p-4 text-green-700 dark:text-green-400 border border-green-500/20 text-left">
            <h2 className="font-semibold mb-2 text-lg">Success!</h2>
            <p className="text-sm">We detected a valid authentication code:</p>
            
            {confirmLoading ? (
              <p className="mt-4 text-sm animate-pulse">Verifying your code...</p>
            ) : (
              <>
                {/* <p className="mt-2 font-mono text-xs break-all bg-background/50 p-2 rounded border border-green-500/20">
                  {authCode}
                </p> */}
                <p className="mt-4 text-sm">
                  {confirmError ? `Error: ${confirmError}` : 'Email confirmed! You can now proceed.'}
                </p>
              </>
            )}
          </div>:<></>}
          
      </div>
    </div>
  )
}