import { type NextRequest } from "next/server"
import { updateSession } from "@/supabase/proxy"
export async function proxy(request: NextRequest) {
    return await updateSession(request)
}
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/system-logs (log ingest; must work without a session, and
         *   running the session refresh on every batch would be pure overhead)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|api/system-logs|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}