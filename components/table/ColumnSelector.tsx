"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, Columns3, GripVertical } from "lucide-react";
import type { Column, Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ColumnSelectorProps<TData> = {
  table: Table<TData>;
  /** Human-readable header for a column id. */
  label: (columnId: string) => string;
  /** Text on the trigger button, e.g. "Columns". */
  triggerLabel: string;
  /** Extra classes for the trigger button. */
  triggerClassName?: string;
};

/**
 * The "Columns" control: pick which columns are shown and drag them into the
 * order they appear in.
 *
 * It's a Popover rather than a DropdownMenu on purpose — a menu closes on every
 * item click and its roving focus / typeahead fight with the drag handles,
 * whereas a popover stays open across as many toggles and drags as the user
 * wants and leaves the items as plain controls.
 */
export function ColumnSelector<TData>({
  table,
  label,
  triggerLabel,
  triggerClassName,
}: ColumnSelectorProps<TData>) {
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so clicking a handle without
    // moving still behaves like a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Display columns (`actions`) aren't user-orderable and have nothing to show
  // in the list, so only the data columns are listed. `getAllLeafColumns()`
  // returns them in definition order — including the hidden ones, which is why
  // the current order is applied by hand here rather than read off the visible
  // columns.
  const columnOrder = table.getState().columnOrder;
  const rankOf = (id: string) => {
    const index = columnOrder.indexOf(id);
    return index === -1 ? columnOrder.length : index;
  };
  const columns = table
    .getAllLeafColumns()
    .filter((column) => typeof column.accessorFn !== "undefined")
    .sort((a, b) => rankOf(a.id) - rankOf(b.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = columns.map((column) => column.id);
    table.setColumnOrder(
      arrayMove(
        ids,
        ids.indexOf(active.id as string),
        ids.indexOf(over.id as string)
      )
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <Columns3 />
          <span className="hidden lg:inline">{triggerLabel}</span>
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map((column) => column.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col">
              {columns.map((column) => (
                <SortableColumnItem
                  key={column.id}
                  column={column}
                  label={label(column.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  );
}

function SortableColumnItem<TData>({
  column,
  label,
}: {
  column: Column<TData, unknown>;
  label: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const checkboxId = `column-toggle-${column.id}`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-sm px-1 py-1.5 text-sm",
        isDragging ? "bg-accent relative z-10 shadow-sm" : "hover:bg-accent/50"
      )}
    >
      {/* The whole row is the sortable, but only the grip starts a drag — hence
          the separate activator ref, which is also what the keyboard sensor
          returns focus to after a drop. */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={label}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {/* A column with enableHiding: false identifies the row — it can be
          reordered but not hidden. */}
      <Checkbox
        id={checkboxId}
        checked={column.getIsVisible()}
        disabled={!column.getCanHide()}
        onCheckedChange={(value) => column.toggleVisibility(!!value)}
      />
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex-1 truncate select-none",
          column.getCanHide() ? "cursor-pointer" : "text-muted-foreground"
        )}
      >
        {label}
      </label>
    </div>
  );
}
