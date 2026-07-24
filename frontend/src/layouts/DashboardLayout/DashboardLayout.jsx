import Sidebar from "../../components/Sidebar";

function DashboardLayout() {
  return (
    <div className="flex bg-slate-950 text-white">

      <Sidebar />

      <main className="flex-1 p-8">

        <h1 className="text-4xl font-bold">

          Dashboard

        </h1>

      </main>

    </div>
  );
}

export default DashboardLayout;