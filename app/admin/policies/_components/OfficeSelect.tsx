"use client";

import { useRouter } from "next/navigation";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Office = { id: string; name: string };

export function OfficeSelect({
  offices,
  selectedOfficeId,
}: {
  offices: Office[];
  selectedOfficeId: string | null;
}) {
  const router = useRouter();

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="office-select">Doctor office</Label>
      <Select
        value={selectedOfficeId ?? undefined}
        onValueChange={(id) => router.push(`/admin/policies?office=${id}`)}
      >
        <SelectTrigger id="office-select" className="w-full">
          <SelectValue placeholder="Select a doctor office" />
        </SelectTrigger>
        <SelectContent>
          {offices.map((office) => (
            <SelectItem key={office.id} value={office.id}>
              {office.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
