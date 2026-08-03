"use client";

import * as React from "react";
import { Building2, Pill } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { CompanyItem, MedicineItem } from "./types";

type Detail =
  | { kind: "medicine"; item: MedicineItem }
  | { kind: "company"; item: CompanyItem };

function CountBadge({ value }: { value: number }) {
  return (
    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-foreground">
      {value}
    </span>
  );
}

function ItemsTable({
  rows,
  onSelect,
}: {
  rows: { id: string; name: string; type: string }[];
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="px-2 text-sm text-muted-foreground">None</p>;
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <Table>
        <TableHeader className="sr-only">
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow
            key={row.id}
            onClick={() => onSelect(row.id)}
            className="cursor-pointer"
          >
            <TableCell className="w-8 text-muted-foreground tabular-nums">
              {index + 1}
            </TableCell>
            <TableCell
              className="w-full max-w-0 truncate font-medium"
              title={row.name}
            >
              {row.name}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Badge variant="outline">{row.type}</Badge>
            </TableCell>
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export function PolicyDetail({
  medicines,
  companies,
}: {
  medicines: MedicineItem[];
  companies: CompanyItem[];
}) {
  const [detail, setDetail] = React.useState<Detail | null>(null);

  return (
    <>
      <Card>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Insurance companies */}
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="size-4" />
                Insurance companies
                <CountBadge value={companies.length} />
              </h3>
              <ItemsTable
                rows={companies.map((c) => ({
                  id: c.id,
                  name: c.name,
                  type: c.insurance_type,
                }))}
                onSelect={(id) => {
                  const item = companies.find((c) => c.id === id);
                  if (item) setDetail({ kind: "company", item });
                }}
              />
            </div>

            {/* Medicines */}
            <div className="sm:border-l sm:pl-6">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Pill className="size-4" />
                Medicines
                <CountBadge value={medicines.length} />
              </h3>
              <ItemsTable
                rows={medicines.map((m) => ({
                  id: m.id,
                  name: m.name,
                  type: m.medicine_type,
                }))}
                onSelect={(id) => {
                  const item = medicines.find((m) => m.id === id);
                  if (item) setDetail({ kind: "medicine", item });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail slider */}
      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {detail?.kind === "medicine" ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.item.name}</SheetTitle>
                <SheetDescription>Medicine</SheetDescription>
              </SheetHeader>
              <Separator />
              <dl className="grid gap-5 px-4">
                <DetailRow label="Name" value={detail.item.name} />
                <DetailRow
                  label="Type"
                  value={
                    <Badge variant="outline">{detail.item.medicine_type}</Badge>
                  }
                />
                <DetailRow
                  label="Preview"
                  value={
                    <span
                      className="inline-flex rounded-md px-3 py-1 text-sm ring-1 ring-border"
                      style={{
                        backgroundColor:
                          detail.item.background_color ?? undefined,
                        color: detail.item.text_color ?? undefined,
                      }}
                    >
                      {detail.item.name}
                    </span>
                  }
                />
                <DetailRow
                  label="Background color"
                  value={detail.item.background_color}
                />
                <DetailRow label="Text color" value={detail.item.text_color} />
              </dl>
            </>
          ) : detail?.kind === "company" ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.item.name}</SheetTitle>
                <SheetDescription>Insurance company</SheetDescription>
              </SheetHeader>
              <Separator />
              <dl className="grid gap-5 px-4">
                <DetailRow label="Name" value={detail.item.name} />
                <DetailRow
                  label="Type"
                  value={
                    <Badge variant="outline">{detail.item.insurance_type}</Badge>
                  }
                />
                <DetailRow label="IK number" value={detail.item.iknumber} />
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
