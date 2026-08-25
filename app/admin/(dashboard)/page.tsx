import { Suspense } from "react";

import {
  SectionCards,
  SectionCardsFallback,
} from "@/app/admin/(dashboard)/components/section-cards";
import {
  TodaysOrders,
  TodaysOrdersFallback,
} from "@/app/admin/(dashboard)/components/todays-orders";

export const metadata = { title: "Dashboard" };

/**
 * Both halves fetch their own counts, so each streams in behind its own
 * boundary rather than the whole page waiting on the slower of the two.
 */
export default function Page() {
  return (
    <>
      <Suspense fallback={<SectionCardsFallback />}>
        <SectionCards />
      </Suspense>
      <Suspense fallback={<TodaysOrdersFallback />}>
        <TodaysOrders />
      </Suspense>
    </>
  );
}
