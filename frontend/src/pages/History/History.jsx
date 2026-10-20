import { useEffect, useState } from "react";
import { Code2, History as HistoryIcon, Loader2, Trash2 } from "lucide-react";

import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import { API_BASE_URL } from "@/lib/api";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "–";

function History() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/projects/history`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch project history"
          );
        }

        setProjects(data.projects || []);
      } catch (error) {
        console.error("Fetch History Error:", error);
        setError(error.message || "Failed to fetch project history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Project History
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Projects you have deleted.
          </p>
        </div>

        {!loading && !error && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {projects.length} deleted project
            {projects.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading history...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <HistoryIcon className="size-6 text-primary" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-foreground">
            No deleted projects
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Projects you delete will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 font-semibold">Tech Stack</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold">Deleted</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {projects.map((project) => (
                  <tr
                    key={project._id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                          <Trash2 className="size-4 text-destructive" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {project.name}
                          </p>

                          {project.description?.trim() && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {project.techStack?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {project.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              <Code2 className="size-3" />
                              {tech}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDate(project.projectCreatedAt)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDate(project.deletedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default History;
