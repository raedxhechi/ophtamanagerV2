"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/date";
import {
  NO_ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from "@/lib/orders/status";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import {
  deleteOrderAsAdmin,
  deleteSubOrderAsAdmin,
  updateOrderAsAdmin,
  type DeleteOrderState,
  type UpdateOrderState,
} from "../actions";
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
 * Delete a suborder in two deliberate clicks. The first arms it: the trash can
 * is replaced *in place* by the cancel, and the confirm appears to its right —
 * so the second click lands somewhere the cursor isn't already resting, and a
 * double click on the trash can't delete anything. The slot keeps its width
 * either way, so arming one row doesn't shift the rest.
 */
function DeleteSubOrderButton({
  subOrderId,
  orderId,
  onDeleted,
}: {
  subOrderId: string;
  orderId: string;
  onDeleted: (subOrderId: string) => void;
}) {
  const [armed, setArmed] = React.useState(false);
  const [isDeleting, startDeleting] = React.useTransition();

  function confirm() {
    startDeleting(async () => {
      const result = await deleteSubOrderAsAdmin(subOrderId, orderId);
      if ("error" in result) {
        toast.error("Suborder not deleted", { description: result.error });
        setArmed(false);
        return;
      }
      toast.success("Suborder deleted");
      onDeleted(subOrderId);
    });
  }

  return (
    <div className="flex w-[4.25rem] items-center gap-1">
      {armed ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title="Keep this suborder"
            aria-label="Keep this suborder"
            disabled={isDeleting}
            onClick={() => setArmed(false)}
          >
            <X className="size-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            title="Confirm deletion"
            aria-label="Confirm deleting this suborder"
            disabled={isDeleting}
            onClick={confirm}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          title="Delete this suborder"
          aria-label="Delete this suborder"
          onClick={() => setArmed(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * One suborder's editable row: which eyes it covers and how it is invoiced. The
 * patient is fixed — moving a suborder to a different patient is a different
 * operation than correcting the order it belongs to.
 */
function SubOrderFields({
  subOrder,
  orderId,
  onDeleted,
}: {
  subOrder: AdminOrderSubOrder;
  orderId: string;
  onDeleted: (subOrderId: string) => void;
}) {
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

        <DeleteSubOrderButton
          subOrderId={subOrder.id}
          orderId={orderId}
          onDeleted={onDeleted}
        />
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
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  /**
   * Set by the first edit made anywhere in the form, and cleared whenever the
   * drawer takes on another order. Interaction rather than a diff of the
   * values: the fields are uncontrolled, and the ones that aren't plain inputs
   * — the eye checkboxes, the invoice and status selects — are Radix controls
   * whose real input is a hidden one it keeps in step, which is easy to read
   * at the wrong moment and miss. Both events below bubble out of those, so
   * nothing in the form can be changed without this noticing. The cost is that
   * changing a value back by hand still counts as an edit.
   */
  const dirtyRef = React.useRef(false);
  /** The "you have unsaved changes" modal, raised by an attempt to close. */
  const [promptingUnsaved, setPromptingUnsaved] = React.useState(false);

  // The close hangs off the submission rather than off an effect watching
  // state: a failed save has to keep the drawer open with its error, which
  // matters most when the save was asked for on the way out.
  const [state, formAction, isPending] = useActionState(
    async (previous: UpdateOrderState, formData: FormData) => {
      const result = await updateOrderAsAdmin(previous, formData);
      // Either way the prompt has had its answer: on success the drawer goes,
      // on failure the error belongs in the drawer behind it.
      setPromptingUnsaved(false);
      if (result && "success" in result) {
        onOpenChange(false);
        router.refresh();
      }
      return result;
    },
    null
  );
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  // The list's rows come from a snapshot the table handed over, so a deleted
  // suborder has to be dropped here as well: `router.refresh()` re-fetches the
  // table behind the drawer, but not the object this drawer was opened with.
  const [deletedSubOrders, setDeletedSubOrders] = React.useState<string[]>([]);

  // The toast, the close and the refresh hang off the submission rather than
  // off an effect watching state: once the row is gone the drawer has nothing
  // left to show, so the list has to be re-fetched in the same breath.
  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (previous: DeleteOrderState, formData: FormData) => {
      const result = await deleteOrderAsAdmin(previous, formData);
      if (result && "success" in result) {
        toast.success("Order deleted", {
          description:
            result.subOrders === 1
              ? "Its suborder was deleted with it."
              : `${result.subOrders} suborders were deleted with it.`,
        });
        setConfirmingDelete(false);
        onOpenChange(false);
        router.refresh();
      }
      return result;
    },
    null
  );

  const { data: medicines, isLoading: medicinesLoading } = useListMedicines();

  // A confirm left open for one order must not greet the next one, and an
  // error from a previous attempt shouldn't either.
  React.useEffect(() => {
    setConfirmingDelete(false);
    setPromptingUnsaved(false);
    setDeletedSubOrders([]);
    dirtyRef.current = false;
  }, [order?.id, open]);

  const subOrders = (order?.suborders ?? []).filter(
    (subOrder) => !deletedSubOrders.includes(subOrder.id)
  );

  // Dropping the row also drops its hidden id, so the next save leaves the
  // deleted suborder alone instead of trying to update a row that is gone.
  const handleSubOrderDeleted = React.useCallback(
    (subOrderId: string) => {
      setDeletedSubOrders((previous) => [...previous, subOrderId]);
      router.refresh();
    },
    [router]
  );

  const markDirty = React.useCallback(() => {
    dirtyRef.current = true;
  }, []);

  /**
   * The prompt's Save. A field the form won't accept can't be pointed at from
   * under a modal, so the prompt steps aside first and lets the browser say
   * what is wrong; otherwise this is the same submit the Save button makes,
   * and the action closes both once it lands.
   */
  const saveAndClose = React.useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      setPromptingUnsaved(false);
      requestAnimationFrame(() => form.reportValidity());
      return;
    }
    form.requestSubmit();
  }, []);

  /**
   * The ways out that aren't a decision — Escape, the overlay, the drag
   * handle, the close button. Edits in the form stop the close and raise the
   * prompt instead; an untouched drawer just closes. Cancel doesn't come
   * through here: it is the user saying to drop the edits.
   */
  const handleDrawerOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      // A save already in flight closes the drawer when it returns.
      if (isPending) return;

      if (order && formRef.current && dirtyRef.current) {
        setPromptingUnsaved(true);
        return;
      }

      onOpenChange(false);
    },
    [isPending, onOpenChange, order]
  );

  const creator = order?.created_by_user;
  const creatorLabel = creator
    ? [creator.first_name, creator.last_name].filter(Boolean).join(" ") ||
      creator.email
    : null;

  const drawer = (
    <Drawer direction="right" open={open} onOpenChange={handleDrawerOpenChange}>
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
            ref={formRef}
            action={formAction}
            onInput={markDirty}
            onChange={markDirty}
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

                {/* A form field rather than the list's save-on-pick cell:
                    everything else in this drawer is saved by the button
                    below, and one control that committed on its own would be
                    the odd one out. */}
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    defaultValue={order.status ?? NO_ORDER_STATUS}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Only reachable for an order that predates the column;
                          nothing sets a status back to none on purpose. */}
                      <SelectItem value={NO_ORDER_STATUS}>—</SelectItem>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {ORDER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Suborders */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  Suborders{" "}
                  <span className="text-muted-foreground tabular-nums">
                    ({subOrders.length})
                  </span>
                </h3>
                {subOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    This order has no suborders.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {subOrders.map((subOrder) => (
                      <SubOrderFields
                        key={subOrder.id}
                        subOrder={subOrder}
                        orderId={order.id}
                        onDeleted={handleSubOrderDeleted}
                      />
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
                className="text-destructive hover:text-destructive mr-auto"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete order
              </Button>
              {/* An explicit discard, so it goes round the unsaved-changes
                  prompt: the user already said what to do with the edits. */}
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
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

  return (
    <>
      {drawer}

      {order && (
        <Dialog
          open={promptingUnsaved}
          onOpenChange={(next) => {
            // Dismissing the prompt means "keep editing", never "discard".
            if (!isPending) setPromptingUnsaved(next);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Save your changes?</DialogTitle>
              <DialogDescription>
                This order has edits that haven&apos;t been saved yet. Closing
                the drawer without saving loses them.
              </DialogDescription>
            </DialogHeader>

            {state && "error" in state ? (
              <p className="text-destructive text-sm">{state.error}</p>
            ) : null}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setPromptingUnsaved(false)}
              >
                Keep editing
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setPromptingUnsaved(false);
                  onOpenChange(false);
                }}
              >
                Discard changes
              </Button>
              <Button type="button" disabled={isPending} onClick={saveAndClose}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {order && (
        <Dialog
          open={confirmingDelete}
          onOpenChange={(next) => {
            // Nothing to go back to mid-delete; let the action finish.
            if (!isDeleting) setConfirmingDelete(next);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Delete this order?</DialogTitle>
              <DialogDescription>
                {order.medicine?.name ?? "This order"} ×{order.quantity}
                {order.doctor_office?.name
                  ? ` · ${order.doctor_office.name}`
                  : ""}
                .{" "}
                {subOrders.length === 0
                  ? "The order is deleted for good."
                  : subOrders.length === 1
                    ? "The order and its one suborder are deleted for good."
                    : `The order and all ${subOrders.length} of its suborders are deleted for good.`}{" "}
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {/* Its own form: the drawer's form saves edits, and a delete
                submitted from inside it would run that action instead. */}
            <form action={deleteAction}>
              <input type="hidden" name="id" value={order.id} />

              {deleteState && "error" in deleteState ? (
                <p className="text-destructive text-sm">{deleteState.error}</p>
              ) : null}

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isDeleting}
                >
                  Keep order
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      Delete order
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
