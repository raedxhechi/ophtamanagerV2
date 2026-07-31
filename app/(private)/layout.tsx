import { SiteHeader } from "./_components/SiteHeader/SiteHeader";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
