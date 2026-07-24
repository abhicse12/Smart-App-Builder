import {
  LuLayoutDashboard,
  LuFolder,
  LuHistory,
  LuSettings,
  LuLogOut,
} from "react-icons/lu";

function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800">

      {/* Logo */}

      <div className="h-20 flex items-center justify-center border-b border-slate-800">

        <h1 className="text-2xl font-bold text-blue-500">

          🤖 AI Builder

        </h1>

      </div>

      {/* Menu */}

      <nav className="p-4 space-y-3">

        <button className="flex items-center gap-3 w-full p-3 rounded-lg bg-blue-600">

          <LuLayoutDashboard size={20} />

          Dashboard

        </button>

        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800">

          <LuFolder size={20} />

          Projects

        </button>

        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800">

          <LuHistory size={20} />

          History

        </button>

        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-800">

          <LuSettings size={20} />

          Settings

        </button>

      </nav>

      {/* Bottom */}

      <div className="absolute bottom-5 left-0 w-64 px-4">

        <button className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-500">

          <LuLogOut size={20} />

          Logout

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;