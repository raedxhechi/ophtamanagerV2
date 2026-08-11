"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { formatDate } from "@/lib/date";
import { useListMedicines } from "@/react-query/medicines";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { updateOrderAsAdmin } from "../actions";
import type { AdminOrderRow, AdminOrderSubOrder } from "./AdminOrdersData";
import { INVOICE_TYPES, NO_INVOICE_TYPE } from "./invoiceType";

/** Formats an ISO timestamp as `dd.mm.yyyy, HH:MM`, falling back to the date. */
function formatDateTime(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  const time = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value)}, ${time}`;
}

/** ISO date input needs a yyyy-mm-dd value; strip any time component. */
function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm font-mono break-words">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground font-sans">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/**
 * One suborder's editable row: which eyes it covers and how it is invoiced. The
 * patient is fixed — moving a suborder to a different patient is a different
 * operation than correcting the order it belongs to.
 */
function SubOrderFields({ subOrder }: { subOrder: AdminOrderSubOrder }) {
  const patient = subOrder.patient;
  const name = patient
    ? [patient.last_name, patient.first_name].filter(Boolean).join(", ")
    : "Unknown patient";

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-3 py-3">
      <input type="hidden" name="suborder_ids" value={subOrder.id} />

      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-muted-foreground text-xs">
          {formatDate(patient?.date_of_birth ?? null) || "—"}
          {patient?.insurance_companies?.name
            ? ` · ${patient.insurance_companies.name}`
            : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name={`left_eye__${subOrder.id}`}
            defaultChecked={subOrder.left_eye}
          />
          Links
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name={`right_eye__${subOrder.id}`}
            defaultChecked={subOrder.right_eye}
          />
          Rechts
        </label>
        <Select
          name={`invoice_type__${subOrder.id}`}
          defaultValue={subOrder.invoice_type ?? NO_INVOICE_TYPE}
        >
          <SelectTrigger className="h-9 w-36" aria-label="Invoice type">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_INVOICE_TYPE}>—</SelectItem>
            {INVOICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </li>
  );
}

/**
 * The full order: its own editable fields, every suborder with the bits that
 * are safe to correct in place, and the read-only system columns.
 */
export function AdminOrderDrawer({
  order,
  open,
  onOpenChange,
}: {
  /** The order filling the drawer, or null when nothing is selected. */
  order: AdminOrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateOrderAsAdmin,
    null
  );

  const { data: medicines, isLoading: medicinesLoading } = useListMedicines();

  // Close the drawer once a save succeeds.
  React.useEffect(() => {
    if (state && "success" in state) onOpenChange(false);
  }, [state, onOpenChange]);

  const creator = order?.created_by_user;
  const creatorLabel = creator
    ? [creator.first_name, creator.last_name].filter(Boolean).join(" ") ||
      creator.email
    : null;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Order details</DrawerTitle>
          <DrawerDescription>
            Edit the order and the suborders it covers.
          </DrawerDescription>
        </DrawerHeader>

        {order && (
          // `key` re-seeds the uncontrolled fields whenever a different order is
          // opened without the drawer closing in between.
          <form
            key={order.id}
            action={formAction}
            className="flex min-h-0 flex-1 flex-col"
          >
            <input type="hidden" name="id" value={order.id} />

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="medicine_id">
                    Medicine <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    name="medicine_id"
                    defaultValue={order.medicine?.id ?? order.medicine_id}
                    disabled={medicinesLoading}
                  >
                    <SelectTrigger id="medicine_id" className="w-full">
                      <SelectValue
                        placeholder={medicinesLoading ? "Loading…" : "—"}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {medicines?.map((medicine) => (
                        <SelectItem key={medicine.id} value={medicine.id}>
                          {medicine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quantity">
                    Quantity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={order.quantity}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="application_date">Application date</Label>
                  <Input
                    id="application_date"
                    name="application_date"
                    type="date"
                    defaultValue={toDateInputValue(order.application_date)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="delivery_date">Delivery date</Label>
                  <Input
                    id="delivery_date"
                    name="delivery_date"
                    type="date"
                    defaultValue={toDateInputValue(order.delivery_date)}
                  />
                </div>
              </section>

              {/* Suborders */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Suborders{" "}
                  <span className="text-muted-foreground tabular-nums">
                    ({order.suborders.length})
                  </span>
                </h3>
                {order.suborders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    This order has no suborders.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {order.suborders.map((subOrder) => (
                      <SubOrderFields key={subOrder.id} subOrder={subOrder} />
                    ))}
                  </ul>
                )}
              </section>

              {/* Read-only system fields. The office is shown but not editable:
                  an order's office decides which patients its suborders may
                  reference, so moving it is not a field-level edit. */}
              <section className="bg-muted/30 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                <ReadOnlyRow
                  label="Doctor office"
                  value={order.doctor_office?.name ?? null}
                />
                <ReadOnlyRow
                  label="Created by"
                  value={
                    creatorLabel ? (
                      <span className="font-sans">
                        {creatorLabel}
                        {creator?.email && creatorLabel !== creator.email && (
                          <Badge variant="secondary" className="ml-2">
                            {creator.email}
                          </Badge>
                        )}
                      </span>
                    ) : null
                  }
                />
                <ReadOnlyRow label="UUID" value={order.id} />
                <ReadOnlyRow label="Directus id" value={order.directus_id} />
                <ReadOnlyRow
                  label="Created"
                  value={formatDateTime(order.created_at) || null}
                />
              </section>

              {state && "error" in state ? (
                <p className="text-destructive text-sm">{state.error}</p>
              ) : null}
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
