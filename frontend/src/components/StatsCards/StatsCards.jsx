import { Card, CardContent } from "@/components/ui/card";
import {
  FolderKanban,
  Bot,
  CheckCircle2,
  Clock,
} from "lucide-react";

const stats = [
  {
    title: "Projects",
    value: "12",
    icon: FolderKanban,
  },
  {
    title: "AI Runs",
    value: "48",
    icon: Bot,
  },
  {
    title: "Success Rate",
    value: "97%",
    icon: CheckCircle2,
  },
  {
    title: "Processing",
    value: "3",
    icon: Clock,
  },
];

function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
      {stats.map((item) => (
        <Card
          key={item.title}
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