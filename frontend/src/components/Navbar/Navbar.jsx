import { useEffect, useState } from "react";
import { Search } from "lucide-react";

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
    <header className="glass float-in relative z-20 flex h-14 shrink-0 items-center justify-between gap-4 rounded-2xl px-3 sm:px-4">
      {/* Left */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder="Search projects..."
          className="h-9 rounded-xl pl-9 border-indigo-950/10 bg-white/65 dark:border-white/10 dark:bg-white/5"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-3">
          <Avatar className="ring-2 ring-white/70 dark:ring-white/10">
            <AvatarFallback className="btn-glow text-xs font-semibold text-white">
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
