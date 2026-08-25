export default function SyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Directus sync</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Copy data from the legacy Directus system into Supabase.
        </p>
      </div>
      {/*
        The per-entity tab bar is gone: the overview runs all six in dependency
        order, which is what anyone actually wants, and picking one out of order
        was the reliable way to end up with rows whose links point at nothing.
        The pages themselves stay — /admin/sync/patients and its siblings are
        still routable by hand for re-running a single entity.
      */}
      <div className="pt-2">{children}</div>
    </>
  );
}
