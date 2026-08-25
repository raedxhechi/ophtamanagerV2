"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { client } from "@/api/browser/client";
import { userDisplayName, userInitials } from "@/lib/user";
import type { UserRole } from "@/types/user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserNavProps {
  user: User;
  role: UserRole | null;
}

export function UserNav({ user, role }: UserNavProps) {
  const t = useTranslations("userNav");
  const router = useRouter();

  const displayName = userDisplayName(user);
  const initials = userInitials(displayName, user.email);

  const handleLogout = async () => {
    await client.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full hover:bg-white/15"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-white/20 text-sm font-medium text-white ring-1 ring-white/30">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {role ? (
              <p className="text-xs capitalize leading-none text-muted-foreground">
                {role}
              </p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          {t("logout")}
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
