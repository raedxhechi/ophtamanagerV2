"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { OfficeFilter, type OfficeOption } from "../../_components/OfficeFilter";
import type { AdminUserRow, UserStatus } from "./AdminUsersData";
import { AdminUserDrawer } from "./AdminUserDrawer";
import { InviteUserDrawer } from "./InviteUserDrawer";
import { canResendInvite, ResendInviteButton } from "./ResendInviteButton";

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

function fullName(user: AdminUserRow): string {
  return [user.last_name, user.first_name].filter(Boolean).join(", ");
}

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  invited: "Invitation pending",
  pending: "Never signed in",
};

const columns: ColumnDef<AdminUserRow>[] = [
  {
    id: "name",
    accessorFn: (row) => fullName(row),
    header: "Name",
    cell: ({ row }) => {
      const name = fullName(row.original);
      return name ? (
        <span className="font-medium">{name}</span>
      ) : (
        <span className="text-muted-foreground">No name</span>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => orDash(row.original.email),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) =>
      row.original.role ? (
        <Badge variant="outline" className="capitalize">
          {row.original.role}
        </Badge>
      ) : (
        // An account with no user_data row can sign in and see nothing —
        // the one state on this screen that always needs fixing.
        <Badge variant="destructive">No profile</Badge>
      ),
  },
  {
    id: "doctor_office",
    // Sorted and searched on the active office: it is the one every account
    // has, and the only one for everybody but a manager.
    accessorFn: (row) => row.doctor_office?.name ?? "",
    header: "Doctor office",
    cell: ({ row }) => {
      const { doctor_office, offices } = row.original;
      // A manager covers several. Naming the active one and counting the rest
      // keeps the column one line wide; the drawer lists them all.
      const extra = offices.filter(
        (office) => office.id !== doctor_office?.id
      ).length;

      return (
        <div className="flex items-center gap-2">
          {orDash(doctor_office?.name ?? null)}
          {extra > 0 ? (
            <Badge
              variant="secondary"
              className="shrink-0"
              title={offices.map((office) => office.name ?? "Unnamed office").join(", ")}
            >
              +{extra}
            </Badge>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "secondary" : "outline"}
        className={
          row.original.status === "active" ? undefined : "text-muted-foreground"
        }
      >
        {STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "last_sign_in_at",
    header: "Last sign-in",
    cell: ({ row }) => orDash(formatDate(row.original.last_sign_in_at) || null),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    // Only the accounts still sitting on an invitation get anything here, so
    // the column reads as a to-do list: every button in it is someone who
    // hasn't made it in yet.
    cell: ({ row }) =>
      canResendInvite(row.original.status) ? (
        <div className="flex justify-end">
          <ResendInviteButton
            userId={row.original.id}
            status={row.original.status}
          />
        </div>
      ) : null,
  },
];

export function AdminUsersTable({
  data,
  offices,
  currentUserId,
}: {
  data: AdminUserRow[];
  /** Every doctor office, for the filter and both drawers' office select. */
  offices: OfficeOption[];
  /** The signed-in admin, so the drawer can refuse to delete them. */
  currentUserId: string | null;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [selected, setSelected] = React.useState<AdminUserRow | null>(null);

  // Filtering is client-side here, unlike the patients and orders lists. Those
  // page through thousands of rows; this one holds every account in the app —
  // a few dozen — and they are all already on the page.
  const [search, setSearch] = React.useState("");
  const [office, setOffice] = React.useState("");

  const rows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.filter((user) => {
      // Match on the whole access set, not just the active office — the point
      // of filtering by an office is finding everyone who works in it, and a
      // manager covering it is only "active" in one of theirs at a time.
      if (
        office &&
        user.doctor_office?.id !== office &&
        !user.offices.some((held) => held.id === office)
      ) {
        return false;
      }
      if (!needle) return true;
      return [user.first_name, user.last_name, user.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [data, search, office]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Keep the open drawer on the freshly fetched row after a save, so it doesn't
  // show the values the server has just replaced.
  React.useEffect(() => {
    setSelected((current) =>
      current ? (data.find((user) => user.id === current.id) ?? null) : null
    );
  }, [data]);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-full max-w-xs sm:w-72"
          />
          <OfficeFilter
            offices={offices}
            value={office}
            onChange={(officeId) => setOffice(officeId ?? "")}
          />
        </div>
        <InviteUserDrawer offices={offices} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-muted-foreground h-24 text-center"
                >
                  No users match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">
        {rows.length} user{rows.length === 1 ? "" : "s"}
        {rows.length !== data.length && ` of ${data.length}`}
      </div>

      <AdminUserDrawer
        user={selected}
        offices={offices}
        currentUserId={currentUserId}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
