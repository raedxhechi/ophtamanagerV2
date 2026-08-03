import Link from "next/link";
import { Activity } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white" aria-label="Home">
      <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 text-white ring-1 ring-white/30 backdrop-blur">
        <Activity className="size-5" />
      </div>
      <span className="hidden text-lg font-semibold tracking-tight sm:inline-block">
        OptaManager
      </span>
    </Link>
  );
}
