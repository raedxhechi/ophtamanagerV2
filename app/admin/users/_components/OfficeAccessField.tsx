"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { OfficeOption } from "../../_components/OfficeFilter";

/**
 * The office picker a manager gets in place of the single-office select.
 *
 * A manager's access is a *set* — public.user_office_access — while
 * user_data.doctor_office_id keeps its old meaning as the one office they
 * create in. This field writes the set; the active office is derived from it
 * (see resolveActiveOffice in ../actions.ts) and marked in the list, so the
 * admin can see which one moves when they untick it.
 *
 * The values leave as repeated `doctor_office_ids` hidden inputs rather than a
 * multi-select: the drawer submits a plain <form>, and Radix's Select has no
 * multiple mode. They are rendered from the full office list, never the
 * search-filtered one, so typing in the search box cannot drop a selection —
 * and in list order, which is the order the server reads them in when it has
 * to pick a new active office.
 */
export function OfficeAccessField({
  offices,
  selected,
  onChange,
  activeOfficeId,
}: {
  offices: OfficeOption[];
  /** The ticked office ids, in `offices` order. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** The office the account creates in today, or null for a fresh invitation. */
  activeOfficeId: string | null;
}) {
  const [search, setSearch] = React.useState("");
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const visible = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return offices;
    return offices.filter((office) =>
      (office.name ?? "").toLowerCase().includes(needle)
    );
  }, [offices, search]);

  // Which office the save will leave as the active one. Mirrors the server's
  // rule — keep the current one while it is still ticked, otherwise the first
  // ticked — so the badge doesn't keep pointing at an office being removed.
  const active =
    activeOfficeId && selectedSet.has(activeOfficeId)
      ? activeOfficeId
      : (offices.find((office) => selectedSet.has(office.id))?.id ?? null);

  /** Toggle one office, keeping the result in `offices` order. */
  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(offices.filter((office) => next.has(office.id)).map((o) => o.id));
  };

  return (
    <section className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor="office-access-search">
          Doctor offices <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={() => onChange(offices.map((office) => office.id))}
          >
            Select all
          </button>
          <span className="text-muted-foreground/50">·</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
      </div>

      {/*
        Rendered outside the scroll area and from the unfiltered list: these are
        what the form actually submits, and a selection made before typing in
        the search box has to survive it.
      */}
      {offices
        .filter((office) => selectedSet.has(office.id))
        .map((office) => (
          <input
            key={office.id}
            type="hidden"
            name="doctor_office_ids"
            value={office.id}
          />
        ))}

      <div className="rounded-md border">
        <div className="border-b p-2">
          <Input
            id="office-access-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search offices…"
            className="h-8"
            autoComplete="off"
          />
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {visible.length ? (
            visible.map((office) => (
              <div
                key={office.id}
                className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2"
              >
                <Checkbox
                  id={`office-${office.id}`}
                  checked={selectedSet.has(office.id)}
                  onCheckedChange={() => toggle(office.id)}
                />
                <Label
                  htmlFor={`office-${office.id}`}
                  className="flex-1 cursor-pointer truncate text-sm font-normal"
                >
                  {office.name ?? "Unnamed office"}
                </Label>
                {active === office.id ? (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Active
                  </Badge>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {offices.length
                ? "No office matches that search."
                : "There are no doctor offices yet."}
            </p>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {selected.length
          ? `${selected.length} of ${offices.length} office${offices.length === 1 ? "" : "s"} selected.`
          : "Pick at least one office — a manager with none sees nothing."}{" "}
        They read and work in every office ticked here. Patients and orders they
        create go to the <strong>active</strong> one; unticking it moves the
        marker to the first office in the list.
      </p>
    </section>
  );
}
