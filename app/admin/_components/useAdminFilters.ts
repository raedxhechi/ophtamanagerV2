"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filter state for the admin list pages (logs, patients, orders) lives in the
 * URL, so a particular view — this office, this search, page 3 — is a link that
 * can be shared or bookmarked, and the browser's back button walks through the
 * filters that were tried.
 *
 * Updates run as transitions so `isPending` can mark the rows on screen as
 * stale while the server fetches the next set.
 */
export function useAdminFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  /**
   * Merge parameter changes into the URL. A null or empty value removes the
   * parameter, which keeps the address bar down to the filters actually in use.
   * `keepPage` is opt-in because every filter change but paging itself should
   * send you back to the first page — page 7 of the old result set says nothing
   * about the new one.
   */
  const setFilters = React.useCallback(
    (
      updates: Record<string, string | null>,
      options?: { keepPage?: boolean; replace?: boolean }
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!options?.keepPage) params.delete("page");

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      // `replace` for anything that fires repeatedly — typing a search would
      // otherwise stack one history entry per keystroke and make the back
      // button useless. The URL still updates, so the view stays bookmarkable
      // either way; only the history trail differs.
      startTransition(() => {
        if (options?.replace) router.replace(href);
        else router.push(href);
      });
    },
    [pathname, router, searchParams]
  );

  return { setFilters, isPending };
}
