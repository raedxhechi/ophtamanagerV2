import { NextResponse, type NextRequest } from "next/server";

import { mirrorOrderToDirectus, mirrorPatientToDirectus } from "@/directus/mirror";
import { createClient } from "@/supabase/server";

/**
 * Mirror a just-created Supabase row into Directus, for the create flows that
 * run in the browser (`api/browser/orders.ts`, `api/browser/patients.ts`).
 *
 * The Directus admin token is server-only, so the browser cannot write there
 * itself; it posts the id it just got back from Supabase and this endpoint does
 * the rest. See `directus/mirror.ts` for what is written and why none of it is
 * allowed to fail loudly.
 *
 * Only the id crosses the wire — every field comes from re-reading the row
 * through the caller's own session, so RLS decides what can be mirrored and an
 * id belonging to somebody else's office reads back as nothing.
 */

type MirrorType = "patient" | "order";

const TYPES: MirrorType[] = ["patient", "order"];

export async function POST(request: NextRequest) {
  let payload: { type?: unknown; id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "invalid json" }, { status: 400 });
  }

  const { type, id } = payload;
  if (typeof type !== "string" || !(TYPES as string[]).includes(type)) {
    return NextResponse.json(
      { ok: false, message: `type must be one of ${TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "not authenticated" }, { status: 401 });
  }

  const result =
    type === "patient"
      ? await mirrorPatientToDirectus(supabase, id)
      : await mirrorOrderToDirectus(supabase, id);

  // 200 either way: the caller has already committed its Supabase write and has
  // nothing to do with a failure here beyond noting it. The mirror logs the
  // detail server-side.
  return NextResponse.json(result);
}
