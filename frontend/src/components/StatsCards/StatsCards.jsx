import { useEffect, useState } from "react";
import {
  FolderKanban,
  Bot,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { trackSpotlight } from "@/lib/spotlight";

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
      tone: "from-indigo-500 to-violet-500 shadow-indigo-500/30",
    },
    {
      title: "Generated",
      value: generated.length,
      icon: Bot,
      hint: "Projects generated successfully",
      tone: "from-sky-500 to-cyan-400 shadow-sky-500/30",
    },
    {
      title: "Success Rate",
      value:
        attempted.length > 0
          ? `${Math.round((generated.length / attempted.length) * 100)}%`
          : "–",
      icon: CheckCircle2,
      hint: `${generated.length} of ${attempted.length} generations succeeded${failed.length ? ` (${failed.length} failed validation)` : ""}; projects not generated yet are not counted`,
      tone: "from-emerald-500 to-teal-400 shadow-emerald-500/30",
    },
    {
      title: "Not Generated",
      value: projects.length - attempted.length,
      icon: Clock,
      hint: "Projects created but not generated yet",
      tone: "from-amber-400 to-orange-500 shadow-orange-500/30",
    },
  ];
};

function StatsCards({ projects = [] }) {
  const stats = getStats(projects);

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item, index) => (
        <div
          key={item.title}
          title={item.hint}
          onMouseMove={trackSpotlight}
          className="glass glass-hover spotlight float-in group rounded-2xl p-5"
          style={{ "--d": `${120 + index * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {item.title}
              </p>

              <h2 className="mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                <AnimatedValue value={item.value} />
              </h2>
            </div>

            <div
              className={`flex size-12 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${item.tone}`}
            >
              <item.icon className="size-5.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Counts up to a number like 6 or "80%"; other values are shown as-is
function AnimatedValue({ value }) {
  const match = String(value).match(/^(\d+)(.*)$/);
  const target = match ? Number(match[1]) : null;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === null) return;

    let frame;
    const start = performance.now();
    const duration = 900;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setCurrent(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return target === null ? value : `${current}${match[2]}`;
}

export default StatsCards;
