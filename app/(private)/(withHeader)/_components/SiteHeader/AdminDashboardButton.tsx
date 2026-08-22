import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Admin-only shortcut out of the practice app and into /admin, sitting right
 * beside the logo.
 *
 * Amber on a blue header, where every other control up there is white-on-blue:
 * the one link that leaves this app for the back office should be impossible
 * to miss, and colour does that without another row of chrome.
 */
export function AdminDashboardButton({ label }: { label: string }) {
  return (
    <Button
      asChild
      size="lg"
      className="bg-amber-400 text-base font-bold tracking-tight text-blue-950 shadow-lg shadow-amber-950/30 ring-2 ring-white/80 hover:bg-amber-300 focus-visible:ring-white"
    >
      <Link href="/admin">
        <LayoutDashboard className="size-5" />
        {label}
      </Link>
    </Button>
  );
}
