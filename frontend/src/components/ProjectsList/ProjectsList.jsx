import { useEffect, useState } from "react";
import { FolderKanban, Clock, Code2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function ProjectsList({ projects, setProjects }) {
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/projects"
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-white">
          Your Projects
        </h2>

        <span className="text-sm text-slate-400">
          {projects.length} project
          {projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.map((project) => (
          <div
            key={project._id}
            onClick={() =>
              navigate(`/projects/${project._id}`)
            }
            className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-500/50 hover:bg-slate-800/70 transition"
          >
            <div className="flex items-start justify-between">
              <div className="bg-blue-600/20 p-3 rounded-xl">
                <FolderKanban
                  size={24}
                  className="text-blue-500"
                />
              </div>

              <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                {project.status}
              </span>
            </div>

            <h3 className="mt-5 text-xl font-semibold text-white">
              {project.name}
            </h3>

            <p className="mt-2 text-sm text-slate-400 line-clamp-2">
              {project.description}
            </p>

            {project.techStack?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs"
                  >
                    <Code2 size={13} />
                    {tech}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 text-xs text-slate-500">
              <Clock size={14} />

              {new Date(
                project.createdAt
              ).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsList;