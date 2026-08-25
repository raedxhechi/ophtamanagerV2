"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateOrderStatus } from "@/lib/orders/actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The status as a coloured badge. A null status is an order older than the column. */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus | null;
  className?: string;
}) {
  if (!status) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Badge
      variant="outline"
      className={cn(ORDER_STATUS_CLASS[status], className)}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * An order's status in a table cell: a plain badge for someone who may only
 * read it, and the same badge as a dropdown for an admin or a manager.
 *
 * `editable` decides which, and it mirrors what RLS would allow — see
 * canEditOrderStatus. Offering the menu to someone whose every choice would be
 * refused is worse than not offering it, so the two are kept in step; the
 * database is still what enforces it, and the action reports a refusal if the
 * two ever drift.
 *
 * The change saves as soon as it is picked. There is no form around a table
 * cell to submit, and one column is not worth a save button — so the trigger
 * spins for the round trip, and the revalidated page supplies the new value.
 */
export function OrderStatusCell({
  orderId,
  status,
  editable,
}: {
  orderId: string;
  status: OrderStatus | null;
  editable: boolean;
}) {
  const [isPending, startTransition] = React.useTransition();

  if (!editable) {
    return <OrderStatusBadge status={status} />;
  }

  const handleSelect = (next: OrderStatus) => {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <DropdownMenu>
      {/* stopPropagation because the row underneath is itself clickable — in
          the admin list it opens the order drawer, and picking a status should
          not also open it. */}
      <div onClick={(event) => event.stopPropagation()} className="w-fit">
        <DropdownMenuTrigger
          disabled={isPending}
          aria-label="Change status"
          className={cn(
            "flex items-center gap-1.5 rounded-md outline-none",
            "focus-visible:ring-ring focus-visible:ring-2",
            "disabled:opacity-70",
            !isPending && "cursor-pointer hover:opacity-80"
          )}
        >
          <OrderStatusBadge status={status} />
          {isPending ? (
            <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
          ) : (
            <ChevronDown className="text-muted-foreground size-3.5" />
          )}
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align="start"
        onClick={(event) => event.stopPropagation()}
      >
        {ORDER_STATUSES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => handleSelect(option)}
            className="gap-2"
          >
            {/* A fixed slot rather than a conditional icon, so the labels line
                up whether or not the row is the current status. */}
            <span className="flex size-4 shrink-0 items-center justify-center">
              {option === status ? <Check className="size-4" /> : null}
            </span>
            <OrderStatusBadge status={option} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
