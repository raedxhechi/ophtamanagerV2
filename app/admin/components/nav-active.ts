/**
 * Whether a nav item points at the page being shown. Section links also match
 * their subpages (/admin/orders covers an order's detail view); the dashboard
 * is matched exactly, since /admin is a prefix of every other item.
 *
 * Shared by the two nav groups so they agree on what "here" means — they show
 * it differently (the main nav fills the row, the secondary one uses the
 * sidebar's own subtler treatment), but never disagree about which row it is.
 */
export function isActive(pathname: string, url: string): boolean {
  if (url === "/admin") return pathname === "/admin";
  return pathname === url || pathname.startsWith(`${url}/`);
}
