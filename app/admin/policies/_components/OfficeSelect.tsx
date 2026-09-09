"use client";

import { useRouter } from "next/navigation";

import { OfficeFilter, type OfficeOption } from "@/app/admin/_components/OfficeFilter";
import { Label } from "@/components/ui/label";

/**
 * The policies list shows every office's policies, grouped; this narrows that
 * to one. "All offices" is the default and clears the parameter, so the page's
 * own address stays down to the filter actually in use.
 */
export function OfficeSelect({
  offices,
  selectedOfficeId,
}: {
  offices: OfficeOption[];
  selectedOfficeId: string | null;
}) {
  const router = useRouter();

  return (
    <div className="flex max-w-sm flex-col gap-2">
      {/* No htmlFor: the trigger below carries its own aria-label, and pointing
          at an id Radix renders on a hidden element would label nothing. */}
      <Label>Doctor office</Label>
      <OfficeFilter
        offices={offices}
        value={selectedOfficeId ?? ""}
        onChange={(officeId) =>
          router.push(
            officeId ? `/admin/policies?office=${officeId}` : "/admin/policies"
          )
        }
        className="w-full"
      />
    </div>
  );
}
