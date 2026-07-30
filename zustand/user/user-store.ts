import { createStore } from "zustand/vanilla";

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";


export type UserState = {
  // isAuthenticated: boolean;
  user?: any;
};

export type UserActions = {
  setUser: ({ user }: { user: any }) => Promise<void>;

};

export type UserStore = UserState & UserActions;

export const defaultInitState: UserState = {
  user: undefined,
};

interface CreateUserStoreProps {
  initState?: UserState;
  router: AppRouterInstance;
}

export const createUserStore = ({
  initState = defaultInitState,
  router,
}: CreateUserStoreProps) => {
  return createStore<UserStore>()((set) => ({
    ...initState,
    setUser: async ({ user }: { user: any }) => {
      set({ user });
    },
  }));
};
