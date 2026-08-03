import { DataTable } from "@/app/admin/(dashboard)/components/data-table";
import { SectionCards } from "@/app/admin/(dashboard)/components/section-cards";
import data from "@/app/admin/(dashboard)/data.json";

export default function Page() {
  return (
<>
        <SectionCards />
        <div className="px-4 lg:px-6">{/* <ChartAreaInteractive /> */}</div>
        <DataTable data={data} />
</>
   
  );
}
