import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import {
  getBasicWebLanguage,
  getConsoleLanguage,
  languageLabel,
} from "@/lib/projectType";

function NewProject({ onClose, onProjectCreated }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    techStack: [],
  });

  const techOptions = [
    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "Node.js",
    "Express",
    "MongoDB",
    "Vite",
    "Tailwind CSS",
    "Next.js",
    "MySQL",
    "PostgreSQL",
    "Python",
    "Java",
  ];

  const handleNameChange = (e) => {
    setFormData({
      ...formData,
      name: e.target.value,
    });
  };

  const handleTechToggle = (tech) => {
    setFormData((prev) => {
      const alreadySelected = prev.techStack.includes(tech);

      return {
        ...prev,
        techStack: alreadySelected
          ? prev.techStack.filter((item) => item !== tech)
          : [...prev.techStack, tech],
      };
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.name.trim()) {
    alert("Please enter project name");
    return;
  }

  if (formData.techStack.length === 0) {
    alert("Please select at least one technology");
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/projects`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          description: "",
          techStack: formData.techStack,
          status: "active",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to create project"
      );
    }

    onProjectCreated(data.project);
    onClose();

    navigate(`/projects/${data.project._id}`);
  } catch (error) {
    console.error("Create Project Error:", error);
    alert(error.message);
  }
};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/20 px-4 backdrop-blur-md animate-in fade-in duration-200 dark:bg-black/50"
      onClick={onClose}
    >
      <div
        className="glass-strong pop-in max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Create New Project
            </h2>

            <p className="mt-0.5 text-sm text-muted-foreground">
              Set up your project before generating the application.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Project Name */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Project Name
            </label>

            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. AI Resume Builder"
              required
              autoFocus
              className="mt-1.5 h-10 w-full rounded-xl border px-3 border-indigo-950/10 bg-white/65 dark:border-white/10 dark:bg-white/5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-ring/30"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="text-sm font-medium text-foreground">
              Technology Stack
            </label>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Select the technologies you want to use.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {techOptions.map((tech) => {
                const selected =
                  formData.techStack.includes(tech);

                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => handleTechToggle(tech)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                      selected
                        ? "border-primary bg-primary/10 font-medium text-primary shadow-md shadow-primary/15"
                        : "border-indigo-950/10 bg-white/65 dark:border-white/10 dark:bg-white/5 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-4 items-center justify-center rounded border text-[10px] ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>

                      {tech}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Python-only / Java-only stacks build a terminal program */}
            {getConsoleLanguage(formData.techStack) && (
              <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">
                {languageLabel(getConsoleLanguage(formData.techStack))} only:
                a basic console program (runs in the terminal, with tests).
                Add web technologies like React or HTML for a web app.
              </p>
            )}

            {/* Python / Java + HTML/CSS: built-in server, logic in that language */}
            {getBasicWebLanguage(formData.techStack) && (
              <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-primary">
                {languageLabel(getBasicWebLanguage(formData.techStack))} +{" "}
                {formData.techStack
                  .filter((tech) => !["Python", "Java"].includes(tech))
                  .join(" + ")}
                : web pages served by {languageLabel(getBasicWebLanguage(formData.techStack))}
                {"'"}s built-in server (no frameworks), with the program logic
                in {languageLabel(getBasicWebLanguage(formData.techStack))}.
              </p>
            )}

            {/* Selected Technologies */}
            {formData.techStack.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Selected:
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {formData.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl px-4"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button type="submit" className="h-9 rounded-xl px-5">
              Create Project
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default NewProject;