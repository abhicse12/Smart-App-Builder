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
      <div className="mt-8 text-slate-400">
        Loading projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <FolderKanban
          className="mx-auto text-slate-500"
          size={40}
        />

        <h3 className="mt-4 text-xl font-semibold text-white">
          No projects yet
        </h3>

        <p className="mt-2 text-slate-400">
          Create your first project to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Your Projects
        </h2>

        <span className="text-sm text-slate-400">
          {projects.length} project
          {projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project._id}
            onClick={() =>
              navigate(`/projects/${project._id}`)
            }
            className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/50 hover:bg-slate-800/70"
          >
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-blue-600/20 p-3">
                <FolderKanban
                  size={24}
                  className="text-blue-500"
                />
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                {project.status || "active"}
              </span>
            </div>

            {/* Project Name */}
            <h3 className="mt-5 text-xl font-semibold text-white">
              {project.name}
            </h3>

            {/* Description */}
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">
              {project.description?.trim()
                ? project.description
                : "Project created. Add your application requirements and start generating."}
            </p>

            {/* Tech Stack */}
            {project.techStack?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
                  >
                    <Code2 size={13} />
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {/* Date */}
            <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
              <Clock size={14} />

              {new Date(
                project.createdAt
              ).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              {/* Open Project */}
              <button
                type="button"
                onClick={(e) =>
                  handleOpenProject(e, project._id)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <ExternalLink size={16} />
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
                className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} />

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

export default ProjectsList;