"use client";

import * as React from "react";
import {
  functionalUpdate,
  type ColumnOrderState,
  type OnChangeFn,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  useMyUserSettings,
  useSaveTableSettings,
} from "@/react-query/userSettings";
import type { TableSettings, TableSettingsKey } from "@/types";

// How long to wait after the last toggle or drag before writing to the server,
// so ticking five columns in a row costs one request instead of five.
const SAVE_DEBOUNCE_MS = 600;

type ColumnState = {
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
};

type Options = {
  /** Which user_settings column this table persists its state in. */
  settingsKey: TableSettingsKey;
  /**
   * Every column id, in the order the column definitions declare them. Keep the
   * reference stable — it seeds the order a user with no saved settings sees.
   */
  columnIds: string[];
  /** Visibility applied when the user has no saved settings. Keep it stable. */
  defaultVisibility?: VisibilityState;
};

/**
 * Reconcile a saved order against the columns that actually exist: saved ids
 * that are gone drop out, and columns the user has never ordered (added since,
 * or never listed by the selector — `actions`) are appended, which keeps them
 * in their declared position at the end.
 */
function mergeOrder(saved: string[] | undefined, columnIds: string[]) {
  if (!saved?.length) return columnIds;
  const known = new Set(columnIds);
  const ordered = saved.filter((id) => known.has(id));
  const placed = new Set(ordered);
  return [...ordered, ...columnIds.filter((id) => !placed.has(id))];
}

/**
 * Column order + visibility for one table, backed by the user's `user_settings`
 * row.
 *
 * `isReady` is false until the fetch settles — callers render a placeholder
 * until then rather than a table in its default shape, which would visibly
 * rearrange itself a moment later. It flips to true on failure too: a
 * preferences fetch that errors falls back to the defaults rather than holding
 * the table hostage.
 *
 * The effective state is derived during render, not applied from an effect, so
 * the first table render already has the stored settings — an effect would cost
 * one frame in the default shape, which is the same flicker one level down.
 *
 * Returns the pieces `useReactTable` wants — spread `state` into its `state` and
 * pass the two change handlers straight through.
 */
export function useTableSettings({
  settingsKey,
  columnIds,
  defaultVisibility,
}: Options) {
  const { data: userSettings, isPending } = useMyUserSettings();
  const { mutate: save } = useSaveTableSettings();

  // What the server says, normalised against the current column definitions.
  const stored = userSettings?.[settingsKey] as TableSettings | null | undefined;
  const loaded = React.useMemo<ColumnState>(
    () => ({
      columnOrder: mergeOrder(stored?.columnOrder, columnIds),
      columnVisibility: stored?.columnVisibility ?? defaultVisibility ?? {},
    }),
    [stored, columnIds, defaultVisibility]
  );

  // Changes made in this session win over `loaded`, so the write-back that
  // refreshes the cache can't stomp on what the user is doing.
  const [edited, setEdited] = React.useState<ColumnState | null>(null);
  const state = edited ?? loaded;

  // Read inside the change handlers without making them depend on every render.
  const stateRef = React.useRef(state);
  stateRef.current = state;

  React.useEffect(() => {
    if (!edited) return;
    const timer = setTimeout(
      () => save({ key: settingsKey, settings: edited }),
      SAVE_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [edited, save, settingsKey]);

  const onColumnOrderChange = React.useCallback<OnChangeFn<ColumnOrderState>>(
    (updater) =>
      setEdited({
        ...stateRef.current,
        columnOrder: functionalUpdate(updater, stateRef.current.columnOrder),
      }),
    []
  );

  const onColumnVisibilityChange = React.useCallback<
    OnChangeFn<VisibilityState>
  >(
    (updater) =>
      setEdited({
        ...stateRef.current,
        columnVisibility: functionalUpdate(
          updater,
          stateRef.current.columnVisibility
        ),
      }),
    []
  );

  return {
    state,
    isReady: !isPending,
    onColumnOrderChange,
    onColumnVisibilityChange,
  };
}
