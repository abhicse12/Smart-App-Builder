import { Card, CardContent } from "@/components/ui/card";
import {
  FolderKanban,
  Bot,
  CheckCircle2,
  Clock,
} from "lucide-react";

// Stats computed from the user's projects (same list as "Your Projects")
const getStats = (projects = []) => {
  // Projects that went through generation (they have saved files)
  const attempted = projects.filter(
    (project) => project.files?.length > 0
  );

  // A failed generation keeps its files with status "validation_failed"
  const failed = attempted.filter(
    (project) => project.status === "validation_failed"
  );

  const generated = attempted.filter(
    (project) => project.status !== "validation_failed"
  );

  return [
    {
      title: "Projects",
      value: projects.length,
      icon: FolderKanban,
      hint: "All your projects",
      tone: "bg-primary/10 text-primary",
    },
    {
      title: "Generated",
      value: generated.length,
      icon: Bot,
      hint: "Projects generated successfully",
      tone: "bg-info/10 text-info",
    },
    {
      title: "Success Rate",
      value:
        attempted.length > 0
          ? `${Math.round((generated.length / attempted.length) * 100)}%`
          : "–",
      icon: CheckCircle2,
      hint: `${generated.length} of ${attempted.length} generations succeeded${failed.length ? ` (${failed.length} failed validation)` : ""}; projects not generated yet are not counted`,
      tone: "bg-success/10 text-success",
    },
    {
      title: "Not Generated",
      value: projects.length - attempted.length,
      icon: Clock,
      hint: "Projects created but not generated yet",
      tone: "bg-warning/15 text-warning",
    },
  ];
};

function StatsCards({ projects = [] }) {
  const stats = getStats(projects);

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <Card
          key={item.title}
          title={item.hint}
          className="py-0 shadow-sm ring-border transition-shadow hover:shadow-md"
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {item.title}
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {item.value}
              </h2>
            </div>

            <div className={`flex size-11 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="size-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default StatsCards;
