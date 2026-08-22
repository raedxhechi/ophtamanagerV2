/**
 * The sentinel the office select uses for "no office" — Radix rejects an empty
 * item value, and an unselected select is indistinguishable from a cleared one.
 * Only an admin may end up with none.
 *
 * Lives apart from `../actions` because a "use server" module may only export
 * async functions, and apart from `./UserFields` because a "use client" module
 * hands the server a reference rather than the value. Both need this string.
 */
export const NO_OFFICE = "__none__";
