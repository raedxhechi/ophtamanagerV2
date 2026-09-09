"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PickItem = {
  id: string;
  name: string;
  /** The medicine or insurance type, shown as the row's badge. */
  type: string;
  /** Medicines carry a colour; a company has none. */
  backgroundColor?: string | null;
};

/**
 * One side of the policy form: a searchable, tickable list of medicines or of
 * insurance companies.
 *
 * The ticked set is submitted as one hidden input per id under `name`, which is
 * how the save action reads it back (`medicine_ids` / `insurance_company_ids`).
 * Those inputs are rendered from the **selection**, not from the visible rows —
 * filtering the list must never quietly drop a tick that scrolled out of view.
 */
export function PickerList({
  label,
  icon,
  name,
  items,
  selected,
  onChange,
  searchPlaceholder,
  emptyText,
}: {
  label: string;
  icon: React.ReactNode;
  /** The form field the ticked ids are submitted under. */
  name: string;
  items: PickItem[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.type.toLowerCase().includes(needle)
    );
  }, [items, query]);

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  };

  // "Select all" acts on what the search is showing, not on the whole list:
  // narrowing to "Rezeptur" and ticking the lot is the point of having a search
  // here. Ticks outside the current filter are kept either way.
  const addVisible = () => {
    const next = new Set(selected);
    for (const item of visible) next.add(item.id);
    onChange(next);
  };

  const clearVisible = () => {
    const next = new Set(selected);
    for (const item of visible) next.delete(item.id);
    onChange(next);
  };

  const visibleSelected = visible.filter((item) => selected.has(item.id)).length;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      {/* The whole selection, however the list is filtered. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </h3>
        <Badge variant="secondary" className="tabular-nums">
          {selected.size} selected
        </Badge>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          autoComplete="off"
          aria-label={searchPlaceholder}
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label="Clear the search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVisible}
          disabled={visible.length === 0 || visibleSelected === visible.length}
        >
          Select {query ? "all matches" : "all"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearVisible}
          disabled={visibleSelected === 0}
        >
          Clear {query ? "matches" : "all"}
        </Button>
        <span className="text-muted-foreground">
          {visible.length} of {items.length} shown
        </span>
      </div>

      <div className="max-h-[26rem] overflow-y-auto rounded-md border py-1">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {query ? "Nothing matches that search." : emptyText}
          </p>
        ) : (
          visible.map((item) => {
            const inputId = `${name}-${item.id}`;
            return (
              <div key={item.id} className="flex items-start gap-3 px-3 py-2">
                <Checkbox
                  id={inputId}
                  checked={selected.has(item.id)}
                  onCheckedChange={(value) => toggle(item.id, value === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={inputId}
                  className="min-w-0 flex-1 cursor-pointer text-sm font-normal"
                  title={item.name}
                >
                  {/* Medicines are recognised by their colour in the order
                      forms, so the swatch is how a row is identified at a
                      glance. A company has none and gets no dot. */}
                  {item.backgroundColor ? (
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: item.backgroundColor }}
                    />
                  ) : null}
                  <span className="truncate">{item.name}</span>
                </Label>
                <Badge variant="outline" className="shrink-0">
                  {item.type}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
