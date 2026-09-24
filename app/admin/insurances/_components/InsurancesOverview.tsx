"use client";

import * as React from "react";
import { Building2, ChevronRight, Pill, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { InsuranceTypeBadge } from "./InsuranceTypeBadge";
import {
  UNASSIGNED_OFFICE_KEY,
  type AdminInsuranceCompanyRow,
  type MedicineItem,
  type OverviewOffice,
} from "./types";

/**
 * The overview: an insurance company on the left, the doctor offices it reaches
 * in the middle, and what those offices may actually dispense on the right.
 *
 * It reads left to right because that is the shape of the question — a company
 * covers nothing by itself, an office covers nothing by itself, and the answer
 * only exists where a policy joins the two. Each column narrows the next, and
 * none of them fetches: every company, office, policy and medicine arrived with
 * the page, so picking is instant and nothing can half-load.
 *
 * The one place the chain is not a straight line is an office linked to the
 * same company by **more than one policy**. That is a real arrangement, not a
 * mistake, and the two policies need not cover the same medicines — so the
 * office opens into its policies with a checkbox each, and the right column
 * shows the union of the ticked ones. With a single policy there is nothing to
 * choose between and no checkbox is offered.
 */
export function InsurancesOverview({
  companies,
  medicines,
}: {
  companies: AdminInsuranceCompanyRow[];
  medicines: MedicineItem[];
}) {
  const [search, setSearch] = React.useState("");
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [officeKey, setOfficeKey] = React.useState<string | null>(null);
  /**
   * Which of the selected office's policies are ticked. Only consulted when
   * that office has more than one — otherwise there is nothing to narrow.
   */
  const [policyIds, setPolicyIds] = React.useState<ReadonlySet<string>>(
    new Set()
  );

  const visibleCompanies = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(needle) ||
        (company.iknumber ?? "").toLowerCase().includes(needle)
    );
  }, [companies, search]);

  // Looked up rather than held in state, so a company or office that a save has
  // renamed or removed resolves against what the server last sent rather than
  // against a copy taken when it was clicked.
  const company = companyId
    ? (companies.find((entry) => entry.id === companyId) ?? null)
    : null;
  const office = officeKey
    ? (company?.offices.find((entry) => entry.key === officeKey) ?? null)
    : null;

  /**
   * The policies the right column is reading — all of them, or the ticked ones.
   * Computed plainly rather than memoized: these are a handful of small arrays,
   * and the React Compiler is what decides what is worth caching here.
   */
  const activePolicies = !office
    ? []
    : office.policies.length === 1
      ? office.policies
      : office.policies.filter((policy) => policyIds.has(policy.id));

  // Filtered out of `medicines`, which is already sorted by name, so the list
  // keeps one order and doesn't reshuffle as policies are ticked.
  const coveredIds = new Set(
    activePolicies.flatMap((policy) => policy.medicineIds)
  );
  const coveredMedicines = medicines.filter((medicine) =>
    coveredIds.has(medicine.id)
  );

  function selectCompany(next: AdminInsuranceCompanyRow) {
    setCompanyId(next.id);
    // A company that reaches exactly one office has nothing to choose in the
    // middle column, so the choice is made: the click that picked the company
    // is the only one its answer needs.
    const only = next.offices.length === 1 ? next.offices[0] : null;
    setOfficeKey(only?.key ?? null);
    setPolicyIds(new Set(only?.policies.map((policy) => policy.id) ?? []));
  }

  function selectOffice(next: OverviewOffice) {
    setOfficeKey(next.key);
    // Everything ticked to start with: the office is linked to the company by
    // all of these, so "what does this office cover here" is the whole of them
    // until the reader narrows it.
    setPolicyIds(new Set(next.policies.map((policy) => policy.id)));
  }

  function togglePolicy(id: string) {
    setPolicyIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {/* ── Insurance companies ─────────────────────────────────────────── */}
      <Column
        icon={<ShieldCheck className="size-4" />}
        title="Insurance companies"
        count={visibleCompanies.length}
        toolbar={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search insurers"
            className="h-8"
            aria-label="Search insurance companies"
          />
        }
      >
        {visibleCompanies.length ? (
          visibleCompanies.map((entry) => (
            <RowButton
              key={entry.id}
              selected={entry.id === companyId}
              onClick={() => selectCompany(entry)}
            >
              <InsuranceTypeBadge type={entry.insurance_type} />
              <span className="flex-1 truncate" title={entry.name}>
                {entry.name}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {entry.offices.length
                  ? `${entry.offices.length} office${entry.offices.length === 1 ? "" : "s"}`
                  : "—"}
              </span>
            </RowButton>
          ))
        ) : (
          <Empty>
            {companies.length
              ? "No insurance company matches that search."
              : "There are no insurance companies yet."}
          </Empty>
        )}
      </Column>

      {/* ── Doctor offices, through the policies that link them ──────────── */}
      <Column
        icon={<Building2 className="size-4" />}
        title="Doctor offices"
        count={company ? company.offices.length : null}
        subtitle={company ? `Linked to ${company.name}` : undefined}
      >
        {!company ? (
          <Empty>Pick an insurance company to see the offices it reaches.</Empty>
        ) : company.offices.length === 0 ? (
          <Empty>
            No policy names this insurance company, so it reaches no doctor
            office yet.
          </Empty>
        ) : (
          company.offices.map((entry) => {
            const isSelected = entry.key === officeKey;
            const hasChoice = entry.policies.length > 1;

            return (
              <div key={entry.key}>
                <RowButton selected={isSelected} onClick={() => selectOffice(entry)}>
                  <span
                    className={cn(
                      "flex-1 truncate",
                      entry.key === UNASSIGNED_OFFICE_KEY && "italic"
                    )}
                    title={entry.name}
                  >
                    {entry.name}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {entry.policies.length} polic
                    {entry.policies.length === 1 ? "y" : "ies"}
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "text-foreground" : "text-muted-foreground/50"
                    )}
                  />
                </RowButton>

                {/* The sub-items live outside the button above, not inside it:
                    a checkbox nested in a button is neither valid nor operable
                    on its own. They appear only for the selected office — an
                    unselected one's policies are not a choice yet. */}
                {isSelected && hasChoice
                  ? entry.policies.map((policy) => (
                      <label
                        key={policy.id}
                        className="hover:bg-accent/40 flex cursor-pointer items-center gap-3 rounded-md py-1.5 pr-3 pl-9 text-sm"
                      >
                        <Checkbox
                          checked={policyIds.has(policy.id)}
                          onCheckedChange={() => togglePolicy(policy.id)}
                        />
                        <span className="flex-1 truncate">{policy.label}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {policy.medicineIds.length}
                        </span>
                      </label>
                    ))
                  : null}
              </div>
            );
          })
        )}
      </Column>

      {/* ── What those policies cover ────────────────────────────────────── */}
      <Column
        icon={<Pill className="size-4" />}
        title="Medicines supported"
        count={office ? coveredMedicines.length : null}
        subtitle={
          office
            ? activePolicies.length === office.policies.length
              ? `Everything ${office.name} covers here`
              : `From ${activePolicies.length} of ${office.policies.length} policies`
            : undefined
        }
      >
        {!company ? (
          <Empty>Pick an insurance company to start.</Empty>
        ) : !office ? (
          <Empty>Pick a doctor office to see what it may dispense.</Empty>
        ) : activePolicies.length === 0 ? (
          <Empty>Tick a policy to see the medicines it covers.</Empty>
        ) : coveredMedicines.length === 0 ? (
          <Empty>
            {activePolicies.length === 1
              ? "That policy covers no medicines."
              : "Those policies cover no medicines."}
          </Empty>
        ) : (
          coveredMedicines.map((medicine) => (
            <div
              key={medicine.id}
              className="flex items-center gap-2 px-2 py-1.5 text-sm"
            >
              {/* The colours the medicine is printed in everywhere else, so it
                  is recognised here the same way it is on an order. */}
              <span
                className="ring-border inline-flex max-w-[60%] truncate rounded-md px-2 py-0.5 text-xs ring-1"
                style={{
                  backgroundColor: medicine.background_color ?? undefined,
                  color: medicine.text_color ?? undefined,
                }}
                title={medicine.name}
              >
                {medicine.name}
              </span>
              <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                {medicine.medicine_type}
              </Badge>
            </div>
          ))
        )}
      </Column>
    </div>
  );
}

/**
 * One of the three panels. They share a header, a fixed height and their own
 * scroll so that a long list of companies cannot push the other two columns off
 * the screen — the three are meant to be read side by side.
 */
function Column({
  icon,
  title,
  count,
  subtitle,
  toolbar,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** Null while the column has nothing to count yet. */
  count: number | null;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card flex h-[32rem] min-w-0 flex-col rounded-xl border">
      <header className="flex flex-col gap-2 border-b px-3 py-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          {icon}
          <span className="text-foreground">{title}</span>
          {count === null ? null : (
            <span className="bg-muted text-foreground ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums">
              {count}
            </span>
          )}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-xs" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
        {toolbar}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-1">{children}</div>
    </section>
  );
}

/** A selectable row — a company on the left, an office in the middle. */
function RowButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none",
        selected ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/40"
      )}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-4 py-8 text-center text-sm">
      {children}
    </p>
  );
}
