import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/me",
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
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
      
      {/* Left */}
      <div className="relative w-80">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />

        <Input
          placeholder="Search projects..."
          className="pl-10 bg-slate-900 border-slate-700 text-white"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">

        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition">
          <Bell className="text-slate-300" size={20} />

          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              {initials}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="text-sm font-semibold text-white">
              {userName}
            </h3>

            <p className="text-xs text-slate-400">
              Developer
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;