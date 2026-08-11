import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { createServerLoggingFetch } from '@/lib/logging/server'
export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })
    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
                },
            },
            global: {
                // This client runs on every navigation, so only its *failures*
                // are logged (shouldLog() drops the successes): a row per page
                // view saying the session is still fine would bury the log,
                // while a refresh that comes back 401 is the expired-session
                // event the audit trail is there to explain.
                fetch: createServerLoggingFetch('proxy', {
                    userAgent: request.headers.get('user-agent'),
                    ip:
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                        request.headers.get('x-real-ip'),
                }),
            },
        }
    )
    // Do not run code between createServerClient and
    // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    // IMPORTANT: If you remove getClaims() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const { data } = await supabase.auth.getClaims()
    const user = data?.claims

    // Send unauthenticated users to the login page. Auth-related routes are
    // allowed through so we don't create a redirect loop.
    const { pathname } = request.nextUrl
    const isPublicPath =
        pathname.startsWith('/login') ||
        pathname.startsWith('/confirm_email') ||
        pathname.startsWith('/auth') ||
        // The log ingest endpoint must answer a logged-out caller: its whole
        // job is to record calls that failed because the session was gone, and
        // redirecting it to /login would hand the queue a 200 (the login page)
        // and make it discard the batch it was trying to deliver.
        pathname.startsWith('/api/system-logs')
    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const redirectResponse = NextResponse.redirect(url)
        // Preserve any refreshed auth cookies set above.
        supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
        return redirectResponse
    }

    // There is no root page — send authenticated users to the patients list.
    if (pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/patients'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
        return redirectResponse
    }

    // The admin area is for the 'admin' role only. The role lives in
    // public.user_data and is not part of the JWT, so this costs one query —
    // kept inside the /admin branch so ordinary navigation doesn't pay for it.
    // Anyone else (and anyone whose row is missing) lands on the patients list.
    // `user` is guaranteed here: an unauthenticated caller was already sent to
    // /login above, since /admin is not a public path.
    if (user && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
        const { data: profile } = await supabase
            .from('user_data')
            .select('role')
            .eq('id', user.sub)
            .maybeSingle()

        if (profile?.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/patients'
            const redirectResponse = NextResponse.redirect(url)
            supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
            return redirectResponse
        }
    }

    //==========================================

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!
    return supabaseResponse
}