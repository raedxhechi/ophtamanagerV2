"use client";

import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { addressLine } from "@/lib/address";
import { formatDate } from "@/lib/date";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/table/ColumnSelector";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";
import type {
  AdminDoctorOfficeRow,
  OfficeUserOption,
} from "./AdminDoctorOfficesData";
import { AdminDoctorOfficeDrawer } from "./AdminDoctorOfficeDrawer";

/** "house_number" -> "House number" for the column-visibility menu. */
function prettify(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

const columns: ColumnDef<AdminDoctorOfficeRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    // The one column that always says which row you are looking at.
    enableHiding: false,
  },
  {
    accessorKey: "contact_person",
    header: "Contact person",
    cell: ({ row }) => orDash(row.original.contact_person),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => orDash(row.original.email),
  },
  {
    accessorKey: "phone_number",
    header: "Phone",
    cell: ({ row }) => orDash(row.original.phone_number),
  },
  {
    id: "address",
    accessorFn: (row) => addressLine(row),
    header: "Address",
    cell: ({ row }) => orDash(addressLine(row.original) || null),
  },
  {
    id: "users",
    accessorFn: (row) => row.users.length,
    header: "Users",
    cell: ({ row }) => {
      const { users } = row.original;
      if (!users.length) {
        return <span className="text-muted-foreground">None</span>;
      }
      // One line wide however many there are: the drawer lists them, and the
      // title carries them for a hover.
      return (
        <Badge
          variant="outline"
          title={users.map((user) => user.name).join(", ")}
        >
          {users.length} user{users.length === 1 ? "" : "s"}
        </Badge>
      );
    },
  },
  {
    id: "pharmacy",
    accessorFn: (row) => row.pharmacy_name ?? "",
    header: "Pharmacy",
    cell: ({ row }) => orDash(row.original.pharmacy_name),
  },
  {
    accessorKey: "street",
    header: "Street",
    cell: ({ row }) => orDash(row.original.street),
  },
  {
    accessorKey: "house_number",
    header: "House number",
    cell: ({ row }) => orDash(row.original.house_number),
  },
  {
    accessorKey: "zipcode",
    header: "Zipcode",
    cell: ({ row }) => orDash(row.original.zipcode),
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => orDash(row.original.city),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => orDash(formatDate(row.original.created_at) || null),
  },
];

// What a user with no saved settings gets. Both are module constants because
// useTableSettings keys its derived state off their identity — rebuilding
// either one per render would reset everyone's saved column layout.
const columnIds = columns.map(
  (column) => column.id ?? (column as { accessorKey: string }).accessorKey
);
// The four address parts are off by default: the combined "Address" column
// already shows them, and they are there for whoever wants to sort by city.
const defaultVisibility = {
  street: false,
  house_number: false,
  zipcode: false,
  city: false,
  created_at: false,
};

export function AdminDoctorOfficesTable({
  data,
  users,
}: {
  data: AdminDoctorOfficeRow[];
  /** Every user with a profile, for the drawer's assignment list. */
  users: OfficeUserOption[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [selected, setSelected] = React.useState<AdminDoctorOfficeRow | null>(
    null
  );
  // Creating and editing are the same drawer and the same form, so they are two
  // pieces of state rather than one nullable row — "no office" is the create
  // case, and it has to be distinguishable from "closed".
  const [creating, setCreating] = React.useState(false);

  // Filtering is client-side here, like /admin/users and unlike patients and
  // orders: this table holds every office in the app — a handful — and they are
  // all already on the page.
  const [search, setSearch] = React.useState("");

  const rows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((office) =>
      [office.name, office.contact_person, office.email, office.city]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle))
    );
  }, [data, search]);

  // Which columns are shown and in what order: seeded from the user's saved
  // settings and written back whenever they change it.
  const {
    state: columnSettings,
    isReady,
    onColumnOrderChange,
    onColumnVisibilityChange,
  } = useTableSettings({
    settingsKey: "admin_doctor_offices_settings",
    columnIds,
    defaultVisibility,
  });

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, ...columnSettings },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    onColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Keep the open drawer on the freshly fetched row after a save, so it doesn't
  // show the values the server has just replaced.
  React.useEffect(() => {
    setSelected((current) =>
      current ? (data.find((office) => office.id === current.id) ?? null) : null
    );
  }, [data]);

  // Hold the table back until the saved column settings have settled, so it
  // isn't drawn in its default shape and then rearranged.
  if (!isReady) {
    return (
      <AdminTableSkeleton columnCount={table.getVisibleLeafColumns().length} />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search name, contact or city…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-full max-w-xs sm:w-72"
        />
        <div className="flex items-center gap-2">
          <ColumnSelector table={table} label={prettify} triggerLabel="Columns" />
          <Button size="sm" onClick={() => setCreating(true)}>
            <IconPlus />
            <span className="hidden lg:inline">Add doctor office</span>
          </Button>
        </div>
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
                  {data.length
                    ? "No doctor offices match this search."
                    : "There are no doctor offices yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">
        {rows.length} doctor office{rows.length === 1 ? "" : "s"}
        {rows.length !== data.length && ` of ${data.length}`}
      </div>

      <AdminDoctorOfficeDrawer
        office={selected}
        users={users}
        open={selected !== null || creating}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setCreating(false);
          }
        }}
      />
    </div>
  );
}
