import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Admin-only shortcut out of the practice app and into /admin, sitting right
 * beside the logo.
 *
 * Wears the same translucent white-on-blue treatment as the rest of the header
 * — the office and pharmacy pills, the info buttons — rather than the amber it
 * started in. It is one of several controls up there, not an alarm, and a
 * single loud colour was pulling the eye away from the office being worked in,
 * which is the thing on this bar that actually changes.
 */
export function AdminButton({ label }: { label: string }) {
  return (
    <Button
      asChild
      className="h-10 gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-base font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] active:bg-white/25"
    >
      <Link href="/admin">
        <LayoutDashboard className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
