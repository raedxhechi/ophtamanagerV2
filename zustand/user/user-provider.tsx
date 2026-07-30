import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";

import { useRouter } from "next/navigation";
import { createUserStore, UserStore } from "./user-store";

export type UserStoreApi = ReturnType<typeof createUserStore>;

export const UserStoreContext = createContext<UserStoreApi | undefined>(
  undefined
);

export interface UserStoreProviderProps {
  children: ReactNode;
}

export const UserStoreProvider = ({ children }: UserStoreProviderProps) => {
  const router = useRouter();
  const storeRef = useRef<UserStoreApi | undefined>(undefined);
  if (!storeRef.current) {
    storeRef.current = createUserStore({ router });
  }

  return (
    <UserStoreContext.Provider value={storeRef.current}>
      {children}
    </UserStoreContext.Provider>
  );
};

export const useUserStore = <T,>(selector: (store: UserStore) => T): T => {
  const userStoreContext = useContext(UserStoreContext);

  if (!userStoreContext) {
    throw new Error(`useUserStore must be used within UserStoreProvider`);
  }

  return useStore(userStoreContext, selector);
};
