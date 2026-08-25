import { Building2 } from "lucide-react";

/**
 * What a page shows instead of a list when there is no office to list.
 *
 * Reached by an admin or a manager who has not picked an office yet — the
 * header opens a dialog asking them to, and this is what is behind it, and what
 * remains if they close it. It is not an error: nothing is wrong, the app just
 * does not know which office's patients they mean.
 *
 * The pages that render this must not run their query at all. Selecting on a
 * null office would either error or, worse, quietly return every office the
 * user can reach — which for an admin is all of them, mixed together with no
 * way to tell which row belongs where.
 */
export function NoOfficeSelected({
  what = "records",
  description,
}: {
  /** What the page would have listed — "patients", "orders", "draft orders". */
  what?: string;
  /**
   * Replaces the default sentence. A create page needs it: "see its patients"
   * is the wrong verb when the page's job is to add one.
   */
  description?: string;
}) {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <Building2 className="size-6" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">
          No doctor office selected
        </h2>
        <p className="text-muted-foreground text-sm">
          {description ?? `Pick a doctor office in the header to see its ${what}.`}
        </p>
      </div>
    </div>
  );
}
