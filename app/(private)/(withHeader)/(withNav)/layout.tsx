import { PageNav } from "./_components/PageNav";

export default function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageNav />
      {children}
    </>
  );
}
