import { NextResponse } from "next/server";

import {
  buildSuborderXml,
  suborderXmlFilename,
  type SuborderForXml,
} from "@/lib/export/suborderXml";
import { getOfficeContext } from "@/lib/office/context";
import { createClient } from "@/supabase/server";

/**
 * The suborder's XML export, as a download.
 *
 * A route handler rather than something the table builds client-side, for two
 * reasons: the export needs the office and its default doctor, which the orders
 * list does not select, and a GET that answers with a Content-Disposition is
 * the whole of the download — no blob, no object URL, no revoking it.
 *
 * Admins only, which is a proof-of-concept restriction rather than a rule the
 * database knows: RLS lets every role in an office read its suborders, so this
 * check is the only thing standing between them and the file. If the export
 * outlives the PoC, that belongs in a policy.
 */

// Everything buildSuborderXml reads. The embeds are aliased to the singular
// keys SuborderForXml expects; `default_doctor` names its foreign key because
// doctor_office and user_data point at each other both ways.
const SUBORDER_SELECT = `
  *,
  patient:patients (
    *,
    insurance_companies (*)
  ),
  order:orders (
    *,
    medicine (*),
    doctor_office (
      *,
      default_doctor:user_data!doctor_office_default_doctor_id_fkey (*)
    )
  )
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { role } = await getOfficeContext();
  // 404 rather than 403: the export is not something a non-admin should learn
  // exists by being refused it.
  if (role !== "admin") {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suborders")
    .select(SUBORDER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return new NextResponse(`Export failed: ${error.message}`, { status: 500 });
  }
  // Either there is no such suborder or RLS hides it; the caller is told the
  // same thing in both cases.
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const suborder = data as unknown as SuborderForXml;

  return new NextResponse(buildSuborderXml(suborder), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${suborderXmlFilename(suborder)}"`,
      // The file is built from live rows; a cached copy would be a stale order.
      "Cache-Control": "no-store",
    },
  });
}
