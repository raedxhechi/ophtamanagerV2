import type { User } from "@supabase/supabase-js";
import { createStore } from "zustand/vanilla";

import type { UserSettings } from "@/types";
import type { UserDataWithOffice } from "@/types/user";

/**
 * Who is signed in, as the server read it.
 *
 * The three pieces live apart because they come from three places and mean
 * different things: `user` is the auth account (email, sign-in history),
 * `userData` is the app's own record of what it may do (role, active office),
 * and `settings` is what it has customised. An account can exist with no
 * `userData` row at all — see the account-setup redirect in the private layout
 * — so nothing here is assumed to be present.
 */
export type UserState = {
  /** The Supabase auth account, or null once signed out. */
  user: User | null;
  /** The public.user_data row with the active doctor office joined in. */
  userData: UserDataWithOffice | null;
  /**
   * The public.user_settings row, or null if this account has never saved any.
   *
   * A snapshot of what the server read on the last page load, not the live
   * value: the tables read their column preferences through
   * `useMyUserSettings` (see react-query/userSettings.tsx), which is what the
   * debounced save writes back into. The provider primes that cache from this
   * so the two start out agreeing and the first table to mount doesn't refetch
   * a row we already hold.
   */
  settings: UserSettings | null;
};

export type UserActions = {
  setUser: (user: User | null) => void;
  setUserData: (userData: UserDataWithOffice | null) => void;
  setSettings: (settings: UserSettings | null) => void;
  /** Replace all three at once — what the server hand-off does on every load. */
  hydrate: (state: UserState) => void;
  /** Forget everything. Called on sign-out, before the redirect to /login. */
  clear: () => void;
};

export type UserStore = UserState & UserActions;

export const defaultInitState: UserState = {
  user: null,
  userData: null,
  settings: null,
};

export const createUserStore = (initState: UserState = defaultInitState) =>
  createStore<UserStore>()((set) => ({
    ...initState,
    setUser: (user) => set({ user }),
    setUserData: (userData) => set({ userData }),
    setSettings: (settings) => set({ settings }),
    hydrate: (state) => set(state),
    clear: () => set(defaultInitState),
  }));
