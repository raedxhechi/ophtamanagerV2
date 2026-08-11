import { createLoggingFetch } from "./instrument";
import { enqueueSystemLogEvent } from "./queue";

/**
 * The `fetch` the browser Supabase client runs on. Every call it makes is
 * recorded and handed to the offline queue, which owns getting it delivered —
 * including across a lost connection or a closed tab.
 */
export function createBrowserLoggingFetch() {
  return createLoggingFetch({
    source: "browser",
    deliver: enqueueSystemLogEvent,
  });
}
