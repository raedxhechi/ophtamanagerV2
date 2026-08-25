"use server";

import { aggregate, readItems } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";

import {
  failResult,
  type ImportError,
  type ImportResult,
  type ImportWarning,
  type SyncCounts,
} from "../types";

/** insurancePolicies.id is a uuid in Directus — kept as the Supabase PK. */
interface DirectusPolicy {
  id: string;
  doctorOffice?: string | null;
}

// Both sides are nullable in the live data. Directus keeps junction rows whose
// ends have been cleared — 135 of 253 medicine links and 41 of 162 company
// links have no policy at all — and they have to be recognised, not coerced.
interface DirectusPolicyMedicine {
  insurancePolicies_id: string | null;
  medicines_id: number | null;
}

interface DirectusPolicyCompany {
  insurancePolicies_id: string | null;
  insuranceCompanies_id: number | null;
}

/**
 * Drop the junction rows that cannot become a link, and collapse the rest to
 * one row per pair.
 *
 * Three things are wrong with the Directus link tables, and each used to end up
 * as a reported failure even though every real link imported cleanly:
 *
 *  - **A null end.** Over half the medicine links have no policy. Upserting
 *    those sent `insurance_policy_id: null` into a NOT NULL column, one error
 *    per row — which is where "the data arrives but I get errors" came from. A
 *    row that names nothing is not a link, so it is dropped and counted, not
 *    reported one by one.
 *  - **A policy that no longer exists.** Same shape of failure, this time a
 *    foreign key: worth a warning, since it points at real Directus rot.
 *  - **Duplicates.** The same pair appears twice, and the two upserts were
 *    fired concurrently at the same primary key.
 */
function usableLinks<T>(
  rows: T[],
  policyId: (row: T) => string | null,
  targetId: (row: T) => number | null,
  knownPolicies: Set<string>
): {
  links: { policy: string; target: number }[];
  orphaned: number;
  duplicates: number;
  missingPolicy: string[];
} {
  const seen = new Set<string>();
  const links: { policy: string; target: number }[] = [];
  const missingPolicy: string[] = [];
  let orphaned = 0;
  let duplicates = 0;

  for (const row of rows) {
    const policy = policyId(row);
    const target = targetId(row);
    if (!policy || target == null) {
      orphaned++;
      continue;
    }
    if (!knownPolicies.has(policy)) {
      missingPolicy.push(policy);
      continue;
    }
    const key = `${policy}|${target}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    links.push({ policy, target });
  }

  return { links, orphaned, duplicates, missingPolicy };
}

/**
 * Say once what was dropped, rather than once per row. 135 identical "this link
 * names no policy" lines tell you nothing that one line with a count doesn't.
 */
function noteSkipped(
  warnings: ImportWarning[],
  kind: string,
  total: number,
  skipped: { orphaned: number; duplicates: number; missingPolicy: string[] }
) {
  if (skipped.orphaned > 0) {
    warnings.push({
      directusId: "-",
      message: `${skipped.orphaned} of ${total} ${kind} links in Directus have no policy or no ${kind} attached — skipped. These are leftover junction rows, not missing data.`,
    });
  }
  if (skipped.missingPolicy.length > 0) {
    const distinct = [...new Set(skipped.missingPolicy)];
    warnings.push({
      directusId: distinct[0],
      message: `${skipped.missingPolicy.length} ${kind} links point at ${distinct.length} policy/policies that no longer exist in Directus — skipped.`,
    });
  }
  if (skipped.duplicates > 0) {
    warnings.push({
      directusId: "-",
      message: `${skipped.duplicates} duplicate ${kind} links collapsed.`,
    });
  }
}

export async function getInsurancePolicyCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const agg = (await directus.request(
    aggregate("insurancePolicies", { aggregate: { count: "*" } })
  )) as Array<{ count: string | number | null }>;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("insurance_policy")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);

  return { directus: Number(agg?.[0]?.count ?? 0), supabase: count ?? 0 };
}

/**
 * Copy insurance policies (uuid id preserved) plus their many-to-many links to
 * medicines and insurance companies. Link targets are resolved through
 * directus_id; any that aren't in Supabase yet are reported as warnings so the
 * broken connection is visible rather than silently dropped.
 */
export async function importInsurancePolicies(): Promise<ImportResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failResult("Not authenticated.");
  }
  const { data: profile } = await supabase
    .from("user_data")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return failResult("Only admins can run this import.");
  }

  // Resolution maps: Directus integer id -> Supabase uuid.
  const [{ data: meds }, { data: companies }] = await Promise.all([
    supabase.from("medicine").select("id, directus_id"),
    supabase.from("insurance_companies").select("id, directus_id"),
  ]);
  const medicineByDirectusId = new Map<number, string>();
  for (const m of meds ?? []) {
    if (m.directus_id != null) medicineByDirectusId.set(Number(m.directus_id), m.id);
  }
  const companyByDirectusId = new Map<number, string>();
  for (const c of companies ?? []) {
    if (c.directus_id != null) companyByDirectusId.set(Number(c.directus_id), c.id);
  }

  const directus = createDirectusServerClient();
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  // 1. Policies (uuid id preserved; doctorOffice maps straight to the uuid FK).
  const policies = (await directus.request(
    readItems("insurancePolicies", { limit: -1, fields: ["id", "doctorOffice"] })
  )) as DirectusPolicy[];

  let imported = 0;
  const BATCH = 25;
  for (let i = 0; i < policies.length; i += BATCH) {
    const slice = policies.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (p) => {
        if (!p.id) {
          return { ok: false as const, directusId: "-", message: "Missing policy id." };
        }
        const { error } = await supabase
          .from("insurance_policy")
          .upsert(
            { id: p.id, doctor_office_id: p.doctorOffice ?? null },
            { onConflict: "id" }
          );
        if (error) {
          return { ok: false as const, directusId: p.id, message: error.message };
        }
        return { ok: true as const, directusId: p.id };
      })
    );
    for (const r of results) {
      if (r.ok) imported++;
      else errors.push({ directusId: r.directusId, message: r.message });
    }
  }

  // The policies that actually exist on the Supabase side now — every link has
  // to point at one of these or it cannot be inserted at all.
  const knownPolicies = new Set(
    policies.map((p) => p.id).filter((id): id is string => !!id)
  );

  // 2. Policy <-> medicine links.
  const medLinks = (await directus.request(
    readItems("insurancePolicies_medicines", {
      limit: -1,
      fields: ["insurancePolicies_id", "medicines_id"],
    })
  )) as DirectusPolicyMedicine[];

  const medLinkSet = usableLinks(
    medLinks,
    (l) => l.insurancePolicies_id,
    (l) => l.medicines_id,
    knownPolicies
  );
  noteSkipped(warnings, "medicine", medLinks.length, medLinkSet);

  const medRows: { insurance_policy_id: string; medicine_id: string }[] = [];
  for (const link of medLinkSet.links) {
    const medicineId = medicineByDirectusId.get(Number(link.target));
    if (!medicineId) {
      warnings.push({
        directusId: link.policy,
        message: `Medicine #${link.target} not found in Supabase — link skipped. Import medicines first, then re-run.`,
      });
      continue;
    }
    medRows.push({ insurance_policy_id: link.policy, medicine_id: medicineId });
  }

  // One statement per batch instead of 25 concurrent ones at the same primary
  // key. Safe now that the rows are deduplicated: a multi-row ON CONFLICT
  // refuses to touch the same key twice in a single command.
  for (let i = 0; i < medRows.length; i += BATCH) {
    const { error } = await supabase
      .from("insurance_policy_medicines")
      .upsert(medRows.slice(i, i + BATCH), {
        onConflict: "insurance_policy_id,medicine_id",
      });
    if (error) {
      errors.push({
        directusId: medRows[i]?.insurance_policy_id ?? "-",
        message: `Medicine links ${i + 1}–${Math.min(i + BATCH, medRows.length)}: ${error.message}`,
      });
    }
  }

  // 3. Policy <-> insurance-company links.
  const companyLinks = (await directus.request(
    readItems("insurancePolicies_insuranceCompanies", {
      limit: -1,
      fields: ["insurancePolicies_id", "insuranceCompanies_id"],
    })
  )) as DirectusPolicyCompany[];

  const companyLinkSet = usableLinks(
    companyLinks,
    (l) => l.insurancePolicies_id,
    (l) => l.insuranceCompanies_id,
    knownPolicies
  );
  noteSkipped(warnings, "insurance company", companyLinks.length, companyLinkSet);

  const companyRows: {
    insurance_policy_id: string;
    insurance_company_id: string;
  }[] = [];
  for (const link of companyLinkSet.links) {
    const companyId = companyByDirectusId.get(Number(link.target));
    if (!companyId) {
      warnings.push({
        directusId: link.policy,
        message: `Insurance company #${link.target} not found in Supabase — link skipped. Import insurance companies first, then re-run.`,
      });
      continue;
    }
    companyRows.push({
      insurance_policy_id: link.policy,
      insurance_company_id: companyId,
    });
  }

  for (let i = 0; i < companyRows.length; i += BATCH) {
    const { error } = await supabase
      .from("insurance_policy_insurance_companies")
      .upsert(companyRows.slice(i, i + BATCH), {
        onConflict: "insurance_policy_id,insurance_company_id",
      });
    if (error) {
      errors.push({
        directusId: companyRows[i]?.insurance_policy_id ?? "-",
        message: `Company links ${i + 1}–${Math.min(i + BATCH, companyRows.length)}: ${error.message}`,
      });
    }
  }

  return {
    total: policies.length,
    imported,
    failed: errors.length,
    errors,
    warnings,
  };
}
