"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";

import { queryClient } from "@/react-query/provider";
import { getUserSettingsKey } from "@/react-query/userSettings";
import type { UserSettings } from "@/types";

import { createUserStore, type UserState, type UserStore } from "./user-store";

export type UserStoreApi = ReturnType<typeof createUserStore>;

export const UserStoreContext = createContext<UserStoreApi | undefined>(
  undefined
);

export type UserStoreProviderProps = UserState & { children: ReactNode };

/**
 * Hand the signed-in user from the server to the client.
 *
 * A store per provider, not a module singleton: the values come from a server
 * component that re-runs per request, and a singleton would be shared across
 * every request the same Node process serves.
 */
export const UserStoreProvider = ({
  children,
  ...initState
}: UserStoreProviderProps) => {
  const [store] = useState(() => {
    primeSettingsCache(initState.settings);
    return createUserStore(initState);
  });

  // The layout above re-reads all three whenever it renders — a reload, or a
  // router.refresh() after a save. The store is created once, so without this
  // it would keep serving whatever the first page load saw.
  //
  // The dependency is a snapshot string because every server render hands over
  // freshly deserialised objects: comparing identities would re-hydrate on each
  // one, and comparing nothing would never re-hydrate at all. These are plain
  // JSON by the time they reach a client component, so stringify round-trips
  // them faithfully.
  const snapshot = JSON.stringify(initState);
  const applied = useRef(snapshot);
  useEffect(() => {
    if (applied.current === snapshot) return;
    applied.current = snapshot;
    store.getState().hydrate(JSON.parse(snapshot) as UserState);
  }, [store, snapshot]);

  return (
    <UserStoreContext.Provider value={store}>
      {children}
    </UserStoreContext.Provider>
  );
};

/**
 * Give TanStack Query the settings row the server already read.
 *
 * The tables take their column order and visibility from `useMyUserSettings`,
 * not from this store — that query is what the debounced save writes back into,
 * so it stays the live copy. Seeding it here means the first table to mount
 * doesn't fetch a row that arrived with the page, and that the store and the
 * cache start from the same value rather than from two separate reads.
 *
 * Done while the store is created rather than in an effect: a child table's own
 * render happens before this component's effects run, so by then it would
 * already have started the fetch this avoids.
 *
 * Only ever on the way in. Re-priming on a later hydration would overwrite the
 * cache from a server read that can be older than an unsaved column change
 * still sitting in the 600ms save debounce.
 */
function primeSettingsCache(settings: UserSettings | null) {
  queryClient.setQueryData(getUserSettingsKey("me"), settings);
}

export const useUserStore = <T,>(selector: (store: UserStore) => T): T => {
  const userStoreContext = useContext(UserStoreContext);

  if (!userStoreContext) {
    throw new Error(`useUserStore must be used within UserStoreProvider`);
  }

  return useStore(userStoreContext, selector);
};
