import { Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * The placeholder for a screen that is routed but not built.
 *
 * A nav item pointing at `#` gives no feedback at all — the click does nothing
 * and the reader is left wondering whether it broke. A real route that says so
 * costs one page and answers the question, so the sidebar can list what the app
 * is going to have without any of it looking faulty.
 *
 * Replace the whole page when the screen lands; nothing here is meant to be
 * built on.
 */
export function NotImplemented({
  title,
  description,
}: {
  /** What isn't built — the nav item's own label, so the two agree. */
  title: string;
  /** Optional: what it will do once it exists. */
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
          <Construction className="size-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">
            {description ??
              "This screen hasn't been built yet. It has a route so the navigation is complete — there is nothing to use here."}
          </p>
        </div>

        <Badge variant="outline" className="text-muted-foreground">
          Not yet implemented
        </Badge>
      </div>
    </div>
  );
}
