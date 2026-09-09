/**
 * A doctor queued up in the office drawer, waiting for the office to exist.
 *
 * The nested "invite a doctor" drawer can be opened while the office itself is
 * still being created, and an invitation has to name the office it is for —
 * user_data.doctor_office_id is what the whole account's access hangs off. So
 * the form is not sent when it is filled in: it is parked here, carried along
 * with the office form, and sent by the save action once the insert has come
 * back with an id.
 *
 * Held in React state inside the office form rather than in a store or in
 * localStorage. It is scoped to one open drawer and it must not outlive it: a
 * queue in localStorage survives a reload and a cancel, and would fire someone
 * else's abandoned invitation the next time an office happened to be saved.
 * Zustand would make it global for the same reason — this is form state.
 *
 * Lives in its own module because `../actions` is "use server" (it may only
 * export async functions) and the field components are "use client" (they hand
 * the server a reference, not a value). Both halves need this shape.
 */
export type PendingUser = {
  /** Client-side key, so a queued row can be listed and dropped before it exists. */
  key: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

/**
 * The form field the queue travels in — one input per pending user, each
 * holding that user's own JSON. One field per row rather than three parallel
 * arrays: a row stays whole, so there is no index alignment to get wrong.
 */
export const PENDING_USERS_FIELD = "pending_users";

/**
 * The only role this screen can create. An office's users are the people
 * working in it, and the drawer offers no role picker — see ../actions.ts.
 */
export const PENDING_USER_ROLE = "doctor" as const;
