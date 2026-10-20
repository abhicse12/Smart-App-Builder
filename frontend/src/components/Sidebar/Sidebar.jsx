import {
  LayoutDashboard,
  FolderKanban,
  History,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/lib/api";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    icon: FolderKanban,
  },
  {
    title: "History",
    icon: History,
  },
  {
    title: "Settings",
    icon: Settings,
  },
];

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Logout failed"
        );
      }

      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
      
      {/* Logo */}
      <div>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Sparkles className="text-white" size={20} />
            </div>

            <div>
              <h2 className="text-white font-bold">
                AI App Builder
              </h2>

              <p className="text-slate-400 text-xs">
                Multi-Agent Platform
              </p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="mt-6 px-3">
          {menuItems.map((item) => (
            <button
              key={item.title}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition mb-2"
            >
              <item.icon size={20} />
              <span>{item.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;