import type { Database } from "./supabase";

export type UserSettings =
  Database["public"]["Tables"]["user_settings"]["Row"];

/**
 * The column-selector state of one table, as stored in the jsonb
 * `orders_table_settings` / `patient_table_settings` columns.
 *
 * `columnOrder` lists column ids left-to-right. It only covers the columns the
 * selector offers, so ids missing from it (a column added since the settings
 * were saved, or one the selector never lists — `actions`) fall back to their
 * position in the column definitions. `columnVisibility` maps a column id to
 * whether it is shown; a column absent from it is visible.
 */
export type TableSettings = {
  columnOrder?: string[];
  columnVisibility?: Record<string, boolean>;
};

/** The user_settings columns that hold a TableSettings blob. */
export type TableSettingsKey =
  | "orders_table_settings"
  | "patient_table_settings";
