import { Bell, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function Navbar() {
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
            <AvatarFallback>AP</AvatarFallback>
          </Avatar>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Abhishek
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