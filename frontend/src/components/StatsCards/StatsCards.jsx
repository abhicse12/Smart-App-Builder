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

  // "modified" (set by an older modify flow) does not record whether
  // the runtime check passed, so those projects are left out of the rate
  const withRuntimeResult = generated.filter(
    (project) => project.status !== "modified"
  );

  const verified = withRuntimeResult.filter(
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
        withRuntimeResult.length > 0
          ? `${Math.round((verified.length / withRuntimeResult.length) * 100)}%`
          : "–",
      icon: CheckCircle2,
      hint: `${verified.length} of ${withRuntimeResult.length} generated projects passed the Docker runtime check (projects with status "modified" are not counted)`,
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