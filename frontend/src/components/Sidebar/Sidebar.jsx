import {
  LayoutDashboard,
  FolderKanban,
  History,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Projects",
    icon: FolderKanban,
    path: "/dashboard#projects",
  },
  {
    title: "History",
    icon: History,
    path: "/history",
  },
  {
    title: "Settings",
    icon: Settings,
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleMenuClick = (item) => {
    if (!item.path) return;

    navigate(item.path);

    const [, hash] = item.path.split("#");
    if (hash) {
      // Let the dashboard render before scrolling to the section
      setTimeout(() => {
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  const isActive = (item) =>
    item.path === `${location.pathname}${location.hash}` ||
    (item.title === "Dashboard" &&
      location.pathname.startsWith("/projects"));

  return (
    <aside className="flex h-dvh w-16 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar md:w-60">
      <div>
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex h-16 w-full items-center justify-center gap-3 border-b border-sidebar-border px-3 text-left md:justify-start md:px-5"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-violet-500 shadow-md shadow-primary/25">
            <Sparkles className="size-4.5 text-white" />
          </div>

          <div className="hidden leading-tight md:block">
            <h2 className="text-sm font-semibold text-foreground">
              AI App Builder
            </h2>

            <p className="text-xs text-muted-foreground">
              Multi-Agent Platform
            </p>
          </div>
        </button>

        {/* Menu */}
        <nav className="space-y-1 px-2 py-5 md:px-3">
          <p className="hidden px-3 pb-2 text-[11px] md:block font-semibold uppercase tracking-wider text-muted-foreground/80">
            Menu
          </p>

          {menuItems.map((item) => {
            const active = isActive(item);

            return (
              <button
                key={item.title}
                type="button"
                title={item.title}
                onClick={() => handleMenuClick(item)}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors md:justify-start",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "size-4.5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="hidden md:inline">{item.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 md:p-3">
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="flex h-10 w-full items-center justify-center gap-3 md:justify-start rounded-lg px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4.5" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
