import PromptBox from "@/components/PromptBox/PromptBox";
import AgentStatus from "@/components/AgentStatus/AgentStatus";
import GenerationProgress from "@/components/GenerationProgress/GenerationProgress";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { ArrowLeft, Code2, Calendar } from "lucide-react";

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStep, setAgentStep] = useState(0);

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filesLoading, setFilesLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/projects/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch project");
        }

        setProject(data.project);

        // If project is already generated
        if (data.project.status === "generated") {
          setAgentStep(3);
          setIsGenerating(false);
        }
      } catch (error) {
        console.error("Fetch Project Error:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchProjectFiles = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/projects/${id}/files`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch files");
        }

        setFiles(data.files || []);

        if (data.files?.length > 0) {
          setSelectedFile(data.files[0]);
        }
      } catch (error) {
        console.error("Fetch Project Files Error:", error);
      } finally {
        setFilesLoading(false);
      }
    };

    fetchProject();
    fetchProjectFiles();
  }, [id]);

  // Loading project
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Loading project...
      </div>
    );
  }

  // Project not found
  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold">
          Project not found
        </h2>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-blue-400"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div className="max-w-5xl mx-auto">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">

          {/* Project Header */}
          <div className="flex items-start justify-between">

            <div>
              <h1 className="text-4xl font-bold">
                {project.name}
              </h1>

              <p className="mt-3 text-slate-400">
                {project.description}
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-sm bg-emerald-500/10 text-emerald-400">
              {project.status}
            </span>

          </div>

          {/* Tech Stack */}
          {project.techStack?.length > 0 && (
            <div className="mt-8">

              <div className="flex items-center gap-2 mb-3">
                <Code2 size={18} />

                <h2 className="font-semibold">
                  Tech Stack
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>

            </div>
          )}

          {/* Created Date */}
          <div className="mt-8 flex items-center gap-2 text-slate-500 text-sm">
            <Calendar size={16} />

            Created{" "}
            {new Date(project.createdAt).toLocaleDateString()}
          </div>

          {/* AI Builder */}
          <div className="mt-8">

            <PromptBox
              setIsGenerating={setIsGenerating}
              setAgentStep={setAgentStep}
            />

            <AgentStatus
              isGenerating={isGenerating}
              agentStep={agentStep}
            />

            <GenerationProgress
              agentStep={agentStep}
            />

          </div>

          {/* Generated Project */}
          <div className="mt-10">

            <h2 className="text-2xl font-bold mb-5">
              Generated Project
            </h2>

            {filesLoading ? (
              <p className="text-slate-400">
                Loading files...
              </p>
            ) : files.length === 0 ? (
              <p className="text-slate-400">
                No generated files yet.
              </p>
            ) : (

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* File Explorer */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <h3 className="font-semibold mb-4">
                    Files
                  </h3>

                  <div className="space-y-2">

                    {files.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          selectedFile?.path === file.path
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <Code2
                          size={14}
                          className="inline mr-2"
                        />

                        {file.path}
                      </button>
                    ))}

                  </div>

                </div>

                {/* Code Viewer */}
                <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">

                  <div className="border-b border-slate-800 px-4 py-3 text-sm text-slate-400">
                    {selectedFile?.path || "Select a file"}
                  </div>

                  <pre className="p-5 overflow-auto max-h-[600px] text-sm text-slate-300 whitespace-pre-wrap break-words">
                    <code>
                      {selectedFile?.content
                        ? selectedFile.content
                            .replace(/\\r\\n/g, "\n")
                            .replace(/\\n/g, "\n")
                        : "No content"}
                    </code>
                  </pre>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default ProjectDetails;