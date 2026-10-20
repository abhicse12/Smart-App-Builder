import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import { API_BASE_URL } from "@/lib/api";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (response.ok) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Fetch User Error:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  const userName = user?.name || "User";

  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      {/* Left */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder="Search projects..."
          className="h-9 rounded-lg bg-muted/60 pl-9 dark:bg-muted/60"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4.5" />

          <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card"></span>
        </button>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-linear-to-br from-primary to-violet-500 text-xs font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="hidden leading-tight sm:block">
            <h3 className="text-sm font-semibold text-foreground">
              {userName}
            </h3>

            <p className="text-xs text-muted-foreground">
              Developer
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
