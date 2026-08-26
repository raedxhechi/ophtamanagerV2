"use client";

import * as React from "react";
import { IconInfoCircle, IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * "Add pharmacy" — and the drawer that opens on it, which holds no form.
 *
 * The app runs on one pharmacy: every office points at it, the receipt prints
 * it, and nothing downstream is ready to be asked *which* pharmacy. So the
 * button leads to the explanation rather than to a create form that would write
 * a row no screen can reach — and the database agrees with it, granting nobody
 * an insert (see 20260826120100_pharmacies_read_all_edit_admin.sql).
 */
export function AddPharmacyDrawer({
  onEditDefault,
}: {
  /**
   * Opens the default pharmacy's own drawer. Absent when no pharmacy is marked
   * as the default, in which case there is nothing to send the admin to.
   */
  onEditDefault?: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <IconPlus />
        <span className="hidden lg:inline">Add pharmacy</span>
      </Button>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="!w-[46vw] !max-w-[46vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Add a pharmacy</DrawerTitle>
            <DrawerDescription>
              What a second pharmacy would mean, and why there isn&apos;t one
              yet.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconInfoCircle className="text-muted-foreground size-5" />
                  Not available yet
                </CardTitle>
                <CardDescription>
                  Multiple pharmacies is not available for this project yet, edit
                  the default pharmacy instead.
                </CardDescription>
              </CardHeader>
              {onEditDefault && (
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onEditDefault();
                    }}
                  >
                    Edit the default pharmacy
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          <DrawerFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
