"use client";

import * as React from "react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { assertUploadable } from "@/api/browser";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/date";
import {
  usePolicyImage,
  useRemovePolicyImage,
  useUploadPolicyImage,
} from "@/react-query/policyImages";

/**
 * "Policy image" and the drawer behind it: the one image every doctor office
 * sees under its details in the app header.
 *
 * It is deliberately not tied to the office picker on this page. There is a
 * single shared image today, and picking an office here would suggest the
 * upload only applies to that one. When offices get their own, this component
 * takes a `doctorOfficeId` and everything below it already follows.
 */
export function PolicyImageDrawer() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ImageIcon />
        Policy image
      </Button>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="!w-[34rem] !max-w-[92vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Insurance policy image</DrawerTitle>
            <DrawerDescription>
              Shown to every doctor office in the details drawer next to their
              name in the header.
            </DrawerDescription>
          </DrawerHeader>

          {/* Remounted per opening so a half-finished pick doesn't linger. */}
          {open ? <PolicyImageForm /> : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function PolicyImageForm() {
  const { data: image, isPending, error } = usePolicyImage();
  const upload = useUploadPolicyImage();
  const remove = useRemovePolicyImage();

  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Object URLs are revoked on replacement so a session of repeated picks
  // doesn't hold every previous file in memory.
  const previewUrl = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const busy = upload.isPending || remove.isPending;

  const pick = (picked: File | null) => {
    if (!picked) {
      setFile(null);
      return;
    }

    try {
      assertUploadable(picked);
      setFile(picked);
    } catch (err) {
      // Rejected here rather than on submit: the file never enters the form, so
      // "Upload" can't be pressed on something storage would refuse anyway.
      toast.error(err instanceof Error ? err.message : "That file can't be used.");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearPick = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      clearPick();
      toast.success("Policy image saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The upload failed.");
    }
  };

  const clearStored = async () => {
    try {
      await remove.mutateAsync();
      toast.success("Policy image removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Removing it failed.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Current image</h3>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "The current image could not be loaded."}
          </p>
        ) : image ? (
          <>
            {/* Plain <img>: the URL is signed and short-lived, which the Next
                image optimizer would cache past its expiry. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt="Insurance policy information"
              className="max-h-80 w-full rounded-md border object-contain"
            />
            {image.updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDateTime(image.updatedAt)}
              </p>
            ) : null}
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearStored}
                disabled={busy}
              >
                <Trash2 />
                {remove.isPending ? "Removing…" : "Remove image"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No image yet — offices see their details without one.
          </p>
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="policy-image-file">
            {image ? "Replace image" : "Upload image"}
          </Label>
          <Input
            id="policy-image-file"
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPEG or WebP, up to 5 MB.
          </p>
        </div>

        {previewUrl ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected file"
              className="max-h-80 w-full rounded-md border object-contain"
            />
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button onClick={submit} disabled={!file || busy}>
            <Upload />
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
          {file ? (
            <Button variant="ghost" onClick={clearPick} disabled={busy}>
              Cancel
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
