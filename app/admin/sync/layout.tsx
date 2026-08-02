import { SyncTabs } from "./_components/SyncTabs";

export default function SyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 lg:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Directus sync</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Copy data from the legacy Directus system into Supabase.
        </p>
      </div>
      <SyncTabs />
      <div className="pt-6">{children}</div>
    </div>
  );
}
