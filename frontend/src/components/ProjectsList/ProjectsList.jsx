import { useEffect, useState } from "react";

import {
  FolderKanban,
  Clock,
  Code2,
  ExternalLink,
  Trash2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/lib/api";

function ProjectsList({ projects, setProjects }) {
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  const fetchProjects = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/projects`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch projects"
      );
    }

    setProjects(data.projects);
  } catch (error) {
    console.error("Fetch Projects Error:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e, projectId, projectName) => {
    // Prevent card click
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(projectId);

      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete project"
        );
      }

      // Remove deleted project from UI
      setProjects((prevProjects) =>
        prevProjects.filter(
          (project) => project._id !== projectId
        )
      );
    } catch (error) {
      console.error("Delete Project Error:", error);
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenProject = (e, projectId) => {
    e.stopPropagation();

    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        id="projects"
        className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <FolderKanban className="size-6 text-primary" />
        </div>

        <h3 className="mt-4 text-base font-semibold text-foreground">
          No projects yet
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Create your first project to get started.
        </p>
      </div>
    );
  }

  return (
    <div id="projects" className="mt-8 scroll-mt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Your Projects
        </h2>

        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {projects.length} project
          {projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {projects.map((project) => (
          <div
            key={project._id}
            onClick={() =>
              navigate(`/projects/${project._id}`)
            }
            className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <FolderKanban className="size-5 text-primary transition-colors group-hover:text-primary-foreground" />
              </div>

              <StatusBadge status={project.status} />
            </div>

            {/* Project Name */}
            <h3 className="mt-4 truncate text-base font-semibold text-foreground">
              {project.name}
            </h3>

            {/* Description */}
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
              {project.description?.trim()
                ? project.description
                : "Project created. Add your application requirements and start generating."}
            </p>

            {/* Tech Stack */}
            {project.techStack?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
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
            )}

            <div className="flex-1" />

            {/* Date */}
            <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <Clock className="size-3.5" />

              {new Date(
                project.createdAt
              ).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              {/* Open Project */}
              <button
                type="button"
                onClick={(e) =>
                  handleOpenProject(e, project._id)
                }
                className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ExternalLink className="size-4" />
                Open Project
              </button>

              {/* Delete */}
              <button
                type="button"
                disabled={deletingId === project._id}
                onClick={(e) =>
                  handleDelete(
                    e,
                    project._id,
                    project.name
                  )
                }
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="size-4" />

                {deletingId === project._id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Colour the project status: failed = red, generated/modified = green, others neutral
function StatusBadge({ status = "active" }) {
  const tone =
    status === "validation_failed"
      ? "bg-destructive/10 text-destructive"
      : status === "generated" || status === "modified"
      ? "bg-success/10 text-success"
      : "bg-primary/10 text-primary";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default ProjectsList;