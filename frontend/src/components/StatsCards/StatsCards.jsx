import { Card, CardContent } from "@/components/ui/card";
import {
  FolderKanban,
  Bot,
  CheckCircle2,
  Clock,
} from "lucide-react";

// Stats computed from the user's projects (same list as "Your Projects")
const getStats = (projects = []) => {
  const generated = projects.filter(
    (project) => project.files?.length > 0
  );

  const verified = generated.filter(
    (project) => project.status === "verified"
  );

  return [
    {
      title: "Projects",
      value: projects.length,
      icon: FolderKanban,
      hint: "All your projects",
    },
    {
      title: "Generated",
      value: generated.length,
      icon: Bot,
      hint: "Projects that have generated code",
    },
    {
      title: "Success Rate",
      value:
        generated.length > 0
          ? `${Math.round((verified.length / generated.length) * 100)}%`
          : "–",
      icon: CheckCircle2,
      hint: "Generated projects whose last generation passed the Docker runtime check",
    },
    {
      title: "Not Generated",
      value: projects.length - generated.length,
      icon: Clock,
      hint: "Projects created but not generated yet",
    },
  ];
};

function StatsCards({ projects = [] }) {
  const stats = getStats(projects);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
      {stats.map((item) => (
        <Card
          key={item.title}
          title={item.hint}
          className="bg-slate-900 border-slate-800"
        >
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p className="text-slate-400 text-sm">
                {item.title}
              </p>

              <h2 className="text-3xl font-bold text-white mt-2">
                {item.value}
              </h2>
            </div>

            <div className="bg-blue-600/20 p-3 rounded-xl">
              <item.icon className="text-blue-500" size={28} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default StatsCards;