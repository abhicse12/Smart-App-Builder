import PromptBox from "@/components/PromptBox/PromptBox";
import AgentStatus from "@/components/AgentStatus/AgentStatus";
import GenerationProgress from "@/components/GenerationProgress/GenerationProgress";
import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Code2,
  Calendar,
  Copy,
  Check,
  Download,
  Play,
  ExternalLink,
  Loader2,
  FileCode2,
  FolderOpen,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  // -1 = idle (no generation running), 0-3 = agent steps
  const [agentStep, setAgentStep] = useState(-1);

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filesLoading, setFilesLoading] = useState(true);

  const [copied, setCopied] = useState(false);

  // Runner states
  const [isRunning, setIsRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [runError, setRunError] = useState("");

  useEffect(() => {
    const fetchProject = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${id}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch project"
      );
    }

    setProject(data.project);
  } catch (error) {
    console.error("Fetch Project Error:", error);
  } finally {
    setLoading(false);
  }
};

    const fetchProjectFiles = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${id}/files`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch files"
      );
    }

    setFiles(data.files || []);

    if (data.files?.length > 0) {
      setSelectedFile(data.files[0]);
    }
  } catch (error) {
    console.error(
      "Fetch Project Files Error:",
      error
    );
  } finally {
    setFilesLoading(false);
  }
};

    fetchProject();
    fetchProjectFiles();
  }, [id]);

  // =========================================
  // Run Project
  // =========================================

  const handleRunProject = async () => {
    try {
      setIsRunning(true);
      setRunError("");
      setPreviewUrl("");

      const response = await fetch(
        `${API_BASE_URL}/api/projects/${id}/run`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to run project"
        );
      }

      const url =
        data?.runner?.frontend?.previewUrl;

      if (!url) {
        throw new Error(
          "Preview URL was not returned by Runner Agent"
        );
      }

      setPreviewUrl(url);

      console.log(
        "Project started successfully:",
        data
      );
    } catch (error) {
      console.error("Run Project Error:", error);

      setRunError(
        error.message || "Failed to run project"
      );
    } finally {
      setIsRunning(false);
    }
  };

  // =========================================
  // Copy code
  // =========================================

  const handleCopy = async () => {
    if (!selectedFile?.content) return;

    try {
      await navigator.clipboard.writeText(
        selectedFile.content
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Failed to copy code:",
        error
      );
    }
  };

  // =========================================
  // Download project
  // =========================================

  const handleDownload = async () => {
  try {
    // Authentication uses the HttpOnly cookie, like every other request
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${id}/download`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        data.message || "Failed to download project"
      );
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name || "project"}.zip`;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download Project Error:", error);
    alert(error.message || "Failed to download project");
  }
};

  // =========================================
  // Loading project
  // =========================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading project...
        </div>
      </DashboardLayout>
    );
  }

  // =========================================
  // Project not found
  // =========================================

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center">
          <h2 className="text-xl font-semibold text-foreground">
            Project not found
          </h2>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusTone =
    project.status === "validation_failed"
      ? "bg-destructive/10 text-destructive"
      : project.status === "generated" ||
        project.status === "modified"
      ? "bg-success/10 text-success"
      : "bg-primary/10 text-primary";

  return (
    <DashboardLayout>
      {/* Back button */}

      <button
        onClick={() => navigate("/dashboard")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </button>

      {/* =========================================
          Project Header
      ========================================= */}

      <div className="glass float-in relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/10" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>

              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusTone}`}>
                {(project.status || "active").replace(/_/g, " ")}
              </span>
            </div>

            {project.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {project.description}
              </p>
            )}

            {/* Tech Stack */}

            {project.techStack?.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Code2 className="mr-1 size-4 text-muted-foreground" />

                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:text-secondary-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Created Date */}

          <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />

            Created{" "}
            {new Date(
              project.createdAt
            ).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* =========================================
          AI Builder + Run Project
      ========================================= */}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PromptBox
            setIsGenerating={setIsGenerating}
            setAgentStep={setAgentStep}
            mode={files.length > 0 ? "modify" : "generate"}
          />
        </div>

        <div className="space-y-6">
          {/* Run Project */}

          <div className="glass float-in rounded-2xl p-5" style={{ "--d": "60ms" }}>
            <h2 className="text-sm font-semibold text-foreground">
              Run Project
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Start the generated application inside
              the Docker sandbox.
            </p>

            <button
              onClick={handleRunProject}
              disabled={isRunning}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] hover:shadow-emerald-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Run Project
                </>
              )}
            </button>

            {/* Run Error */}

            {runError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {runError}
              </div>
            )}
          </div>

          <AgentStatus
            isGenerating={isGenerating}
            agentStep={agentStep}
          />

          <GenerationProgress
            agentStep={agentStep}
          />
        </div>
      </div>

      {/* =========================================
          Live Preview
      ========================================= */}

      {previewUrl && (
        <div className="glass float-in mt-6 overflow-hidden rounded-2xl">
          {/* Preview Header */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                Live Preview
              </h2>

              <p className="mt-0.5 truncate text-xs text-success">
                {previewUrl}
              </p>
            </div>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-inset flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink className="size-3.5" />
              Open in New Tab
            </a>
          </div>

          {/* Iframe */}

          <div className="bg-white">
            <iframe
              src={previewUrl}
              title="Generated Application Preview"
              className="h-[75vh] w-full border-0"
            />
          </div>
        </div>
      )}

      {/* =========================================
          Generated Project
      ========================================= */}

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Generated Project
          </h2>

          <button
            onClick={handleDownload}
            className="btn-glow flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Download className="size-4" />
            Download ZIP
          </button>
        </div>

        {filesLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading files...
          </p>
        ) : files.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <FolderOpen className="mx-auto size-8 text-muted-foreground/60" />

            <p className="mt-3 text-sm text-muted-foreground">
              No generated files yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* =====================================
                File Explorer
            ===================================== */}

            <div className="glass float-in flex max-h-[75vh] flex-col overflow-hidden rounded-2xl lg:col-span-4 2xl:col-span-3">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Files
                </h3>

                <span className="text-xs text-muted-foreground">
                  {files.length}
                </span>
              </div>

              <div className="space-y-0.5 overflow-y-auto p-2">
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() =>
                      setSelectedFile(file)
                    }
                    title={file.path}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                      selectedFile?.path ===
                      file.path
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:translate-x-0.5 hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5"
                    }`}
                  >
                    <FileCode2 className="size-3.5 shrink-0" />

                    <span className="truncate">
                      {file.path}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* =====================================
                Code Viewer
            ===================================== */}

            <div className="glass float-in flex max-h-[75vh] flex-col overflow-hidden rounded-2xl lg:col-span-8 2xl:col-span-9">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {selectedFile?.path ||
                    "Select a file"}
                </span>

                <button
                  onClick={handleCopy}
                  disabled={!selectedFile}
                  className="glass-inset flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-success" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <pre className="flex-1 overflow-auto bg-white/35 p-4 dark:bg-black/25 [&_code]:font-mono font-mono text-[13px] leading-6 text-foreground/90">
                <code>
                  {selectedFile?.content ||
                    "No content"}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ProjectDetails;