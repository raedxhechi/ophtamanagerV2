import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { createServerLoggingFetch } from '@/lib/logging/server'

// ---------------------------------------------------------------------------
// TEMPORARY: the admin dashboard is turned off on this branch.
//
// Admins are sent to the deployment that still serves them — from *any* route,
// not just /admin, so this build is closed to them entirely. The path is
// carried across (it is the same app on the other host, so a deep link still
// lands where it was pointing) along with `?message=admin_redirected`, so the
// other side can say why they moved: arriving on a different host with no
// explanation reads as a bug or a lost session.
//
// A key rather than a sentence, following the `?error=<key>` convention the
// auth handlers already use: the wording belongs to whoever renders it, in
// whichever language that user is reading, and prose in a URL is neither
// translatable nor changeable without redeploying this side.
//
// To undo: delete this block and the `ADMIN_DASHBOARD_DISABLED` branch below.
// Nothing else in the app depends on either — the routes themselves are
// untouched, only the proxy stops letting an admin through to them.
// ---------------------------------------------------------------------------
const ADMIN_DASHBOARD_DISABLED = true
const ADMIN_DASHBOARD_URL = 'https://ophtamanager-v2-five.vercel.app'
const ADMIN_DASHBOARD_MESSAGE_KEY = 'admin_redirected'

/**
 * Routes an admin still has to be able to reach here, even while the rest of
 * this deployment is closed to them.
 *
 * The auth ones are not a courtesy: `/auth/confirm` and `/auth/callback` are
 * what turn a token from an email into a session, and bouncing one to another
 * host before it is verified burns the token and breaks the link for good. The
 * password screens are reached from those same emails, whose links point at
 * whatever `site_url` is set to — which may well be this deployment.
 *
 * `/api/` is excluded because a cross-origin 307 is not something a fetch()
 * recovers from: the Directus mirror and the log ingest would fail quietly
 * rather than redirect.
 */
const ADMIN_REDIRECT_EXEMPT = [
    '/login',
    '/forgot-password',
    '/update-password',
    '/accept-invite',
    '/auth/',
    '/api/',
]

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

    // Send unauthenticated users to the login page. The routes that have to
    // answer without a session are listed here, and only those: /login and
    // /forgot-password are the two forms a logged-out user can reach, and
    // /auth/confirm and /auth/callback are the handlers that turn a token from
    // an auth email into a session.
    //
    // /update-password and /accept-invite are deliberately *not* here. Both are
    // reached from an email link, but only after one of the handlers above has
    // established the session, so they are ordinary private pages — and a link
    // that expired lands on /login instead of an empty password form.
    const { pathname } = request.nextUrl
    const isPublicPath =
        pathname.startsWith('/login') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/auth/confirm') ||
        pathname.startsWith('/auth/callback') ||
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

    // Admins go to the other deployment, whatever they were reaching for.
    //
    // This costs one query per navigation for everybody, which is why the
    // /admin gate below deliberately kept its own inside that branch. There is
    // no cheaper way while it is on: the role lives in public.user_data and is
    // not a JWT claim, so there is nothing on the request to read it from. That
    // is a fair price for a temporary switch and a bad one for a permanent
    // feature — if this outlives the branch, put the role in the token.
    if (user && ADMIN_DASHBOARD_DISABLED) {
        const exempt = ADMIN_REDIRECT_EXEMPT.some((prefix) => pathname.startsWith(prefix))

        // Don't bounce a host at itself. If this branch is ever deployed to that
        // same URL, an unguarded redirect would loop until the browser gives up
        // — and the failure would only show up in production.
        const sameHost = new URL(ADMIN_DASHBOARD_URL).hostname === request.nextUrl.hostname

        if (!exempt && !sameHost) {
            const { data: profile } = await supabase
                .from('user_data')
                .select('role')
                .eq('id', user.sub)
                .maybeSingle()

            if (profile?.role === 'admin') {
                const target = new URL(ADMIN_DASHBOARD_URL)
                // Same app on the other host, so the path still means something
                // there — a link to one order lands on that order.
                target.pathname = pathname
                target.search = request.nextUrl.search
                target.searchParams.set('message', ADMIN_DASHBOARD_MESSAGE_KEY)

                const redirectResponse = NextResponse.redirect(target)
                // Carried over like every other redirect here: the session was
                // just refreshed above, and dropping the new cookies would sign
                // them out on the way past.
                supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
                return redirectResponse
            }
        }
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