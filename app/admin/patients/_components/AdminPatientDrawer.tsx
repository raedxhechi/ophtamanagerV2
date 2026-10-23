"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import { deletePatientAsAdmin, updatePatientAsAdmin } from "../actions";
import type { DeletePatientState } from "../actions";
import type { AdminPatientRow, AdminPatientSubOrder } from "./AdminPatientsData";
import { PatientFields } from "./PatientFields";

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
 * What goes with the patient, in one sentence. The confirm counts the rows the
 * drawer was opened with; the toast reports what the action actually deleted,
 * and they are worded the same so the second reads as the answer to the first.
 */
function describeDeleted(subOrders: number, draftSubOrders: number): string {
  const parts: string[] = [];
  if (subOrders > 0) {
    parts.push(subOrders === 1 ? "one suborder" : `${subOrders} suborders`);
  }
  if (draftSubOrders > 0) {
    parts.push(
      draftSubOrders === 1
        ? "one draft suborder"
        : `${draftSubOrders} draft suborders`
    );
  }
  if (parts.length === 0) {
    return "They have no suborders, so nothing else goes with them.";
  }
  return `Their ${parts.join(" and ")} ${
    subOrders + draftSubOrders === 1 ? "goes" : "go"
  } with them.`;
}

/** The eye badges, in the same colours the office-facing suborder tables use. */
function EyeBadges({ suborder }: { suborder: AdminPatientSubOrder }) {
  return (
    <div className="flex gap-2">
      <Badge
        variant={suborder.left_eye ? "outline" : "secondary"}
        className={
          suborder.left_eye
            ? "bg-[#246291] text-white"
            : "text-muted-foreground"
        }
      >
        <Eye className="mr-1" size={14} />
        LINKS
      </Badge>
      <Badge
        variant={suborder.right_eye ? "outline" : "secondary"}
        className={
          suborder.right_eye
            ? "bg-[#E10600] text-white"
            : "text-muted-foreground"
        }
      >
        RECHTS
        <Eye className="ml-1" size={14} />
      </Badge>
    </div>
  );
}

/**
 * The full patient record: the editable fields, the read-only system columns,
 * and every suborder the patient appears on. The suborders are shown rather
 * than edited — they belong to an order, and that's where the admin orders
 * drawer edits them.
 */
export function AdminPatientDrawer({
  patient,
  open,
  onOpenChange,
}: {
  /** The patient filling the drawer, or null when nothing is selected. */
  patient: AdminPatientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // The toast, the close and the refresh hang off the submission rather than
  // off an effect watching state: once the row is gone the drawer has nothing
  // left to show, so the list has to be re-fetched in the same breath.
  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (previous: DeletePatientState, formData: FormData) => {
      const result = await deletePatientAsAdmin(previous, formData);
      if (result && "success" in result) {
        toast.success("Patient deleted", {
          description: describeDeleted(result.subOrders, result.draftSubOrders),
        });
        setConfirmingDelete(false);
        onOpenChange(false);
        router.refresh();
      }
      return result;
    },
    null
  );

  // A confirm left open for one patient must not greet the next one, and an
  // error from a previous attempt shouldn't either.
  React.useEffect(() => {
    setConfirmingDelete(false);
  }, [patient?.id, open]);

  const drawer = (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Patient details</DrawerTitle>
          <DrawerDescription>
            Edit the record, or review the suborders it appears on.
          </DrawerDescription>
        </DrawerHeader>

        {/*
          The form is a component of its own, keyed by the patient, so it
          unmounts with the drawer and remounts for a different patient — which
          is what resets the action's state, and re-seeds the uncontrolled
          fields. Held in this component instead, a successful save would leave
          `{ success: true }` behind for the rest of the page's life, and the
          close-on-success effect would re-fire on the next render and slam the
          drawer shut the moment another patient was opened.
        */}
        {patient && (
          <AdminPatientEditForm
            key={patient.id}
            patient={patient}
            onClose={() => onOpenChange(false)}
            onRequestDelete={() => setConfirmingDelete(true)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );

  return (
    <>
      {drawer}

      {patient && (
        <Dialog
          open={confirmingDelete}
          onOpenChange={(next) => {
            // Nothing to go back to mid-delete; let the action finish.
            if (!isDeleting) setConfirmingDelete(next);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Delete this patient?</DialogTitle>
              <DialogDescription>
                {[patient.first_name, patient.last_name]
                  .filter(Boolean)
                  .join(" ") || "This patient"}
                {patient.date_of_birth
                  ? ` · ${formatDate(patient.date_of_birth)}`
                  : ""}
                .{" "}
                {describeDeleted(
                  patient.suborders.length,
                  patient.draft_suborders?.length ?? 0
                )}{" "}
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {/* Its own form: the drawer's form saves edits, and a delete
                submitted from inside it would run that action instead. */}
            <form action={deleteAction}>
              <input type="hidden" name="id" value={patient.id} />

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
                  Keep patient
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
                      Delete patient
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

function AdminPatientEditForm({
  patient,
  onClose,
  onRequestDelete,
}: {
  patient: AdminPatientRow;
  onClose: () => void;
  onRequestDelete: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updatePatientAsAdmin,
    null
  );

  // Close the drawer once a save succeeds.
  React.useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  const suborders = React.useMemo(
    () =>
      [...patient.suborders].sort((a, b) =>
        (b.order?.created_at ?? "").localeCompare(a.order?.created_at ?? "")
      ),
    [patient]
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="id" value={patient.id} />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <PatientFields patient={patient} />

        {/* Suborders */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Suborders{" "}
            <span className="text-muted-foreground tabular-nums">
              ({suborders.length})
            </span>
          </h3>
          {suborders.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This patient has no suborders yet.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {suborders.map((suborder) => (
                <li
                  key={suborder.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {suborder.order?.medicine?.name ?? "—"}
                      </Badge>
                      {suborder.invoice_type && (
                        <Badge variant="secondary">
                          {suborder.invoice_type}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      Created{" "}
                      {formatDate(suborder.order?.created_at ?? null) ||
                        "—"}
                      {" · OP "}
                      {formatDate(
                        suborder.order?.application_date ?? null
                      ) || "—"}
                      {" · Delivery "}
                      {formatDate(
                        suborder.order?.delivery_date ?? null
                      ) || "—"}
                    </span>
                  </div>
                  <EyeBadges suborder={suborder} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Read-only system fields. The office is shown but not editable:
            moving a patient between offices would strand the suborders
            hanging off their old office's orders. */}
        <section className="bg-muted/30 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <ReadOnlyRow
            label="Doctor office"
            value={patient.doctor_office?.name ?? null}
          />
          <ReadOnlyRow label="UUID" value={patient.id} />
          <ReadOnlyRow
            label="Directus id"
            value={patient.directus_id}
          />
          <ReadOnlyRow
            label="Created"
            value={formatDateTime(patient.created_at) || null}
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
          onClick={onRequestDelete}
        >
          <Trash2 className="size-4" />
          Delete patient
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
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
  );
}
