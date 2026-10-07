import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { insuranceTypeInitial, insuranceTypeLabel, type InsuranceType } from "./types";

/**
 * A company's kind as a single letter — **P** for private (PKV), **G** for
 * public (GKV).
 *
 * One letter because it sits in front of a name in a narrow column and the
 * distinction is binary: there is nothing to read, only to recognise. The long
 * form rides along as the accessible name and the tooltip, so nothing depends on
 * the reader already knowing which letter is which — and on colour least of all,
 * which is why the two are also different shapes of the same badge rather than
 * only different hues.
 */
export function InsuranceTypeBadge({
  type,
  className,
}: {
  type: InsuranceType;
  className?: string;
}) {
  const label = insuranceTypeLabel(type);

  return (
    <Badge
      variant={type === "Privat" ? "default" : "secondary"}
      title={label}
      aria-label={label}
      className={cn("size-5 justify-center px-0 font-semibold", className)}
    >
      {insuranceTypeInitial(type)}
    </Badge>
  );
}
