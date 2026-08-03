export type SyncCounts = { directus: number; supabase: number };

export type ImportError = { directusId: string | number; message: string };

/** A non-fatal issue — e.g. a referenced row not yet copied to Supabase. */
export type ImportWarning = { directusId: string | number; message: string };

export type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  errors: ImportError[];
  /** Unresolved connections and other non-fatal issues. */
  warnings?: ImportWarning[];
};

/** Shared "not authenticated / not allowed / crashed" result. */
export function failResult(message: string): ImportResult {
  return {
    total: 0,
    imported: 0,
    failed: 1,
    errors: [{ directusId: "-", message }],
  };
}
