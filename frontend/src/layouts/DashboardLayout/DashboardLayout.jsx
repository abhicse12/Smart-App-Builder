import Sidebar from "@/components/Sidebar/Sidebar";
import Navbar from "@/components/Navbar/Navbar";
import Wallpaper from "@/components/Wallpaper/Wallpaper";

function DashboardLayout({ children }) {
  return (
    <div className="flex h-dvh w-full gap-3 overflow-hidden p-3 text-foreground">
      <Wallpaper />

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Navbar />

        <main className="-mx-3 flex-1 overflow-y-auto px-3">
          <div className="w-full py-3 sm:px-2 lg:px-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
