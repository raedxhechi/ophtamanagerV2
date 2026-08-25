"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { client } from "@/api/browser/client";
import { userDisplayName, userInitials } from "@/lib/user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/zustand/user/user-provider";

export function UserNav() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const userData = useUserStore((state) => state.userData);
  const clear = useUserStore((state) => state.clear);

  const name = userDisplayName(user, userData);
  const office = userData?.doctor_office?.name;

  const handleLogout = async () => {
    await client.auth.signOut();
    // Emptied before the redirect so the menu can't flash the old account on
    // the way out — the store instance dies with the layout, but the navigation
    // takes a moment.
    clear();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{userInitials(name, user?.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">{name}</p>
            <p className="text-muted-foreground text-xs leading-none">
              {user?.email}
            </p>
            {userData?.role ? (
              <p className="text-muted-foreground text-xs leading-none capitalize">
                {/* An admin holds no office of their own, so there is often
                    nothing to put after the role. */}
                {office ? `${userData.role} · ${office}` : userData.role}
              </p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/admin/users">Users</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
