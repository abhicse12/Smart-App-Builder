import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

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
        "http://localhost:5000/api/projects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      // Update dashboard project list
      onProjectCreated(data.project);

      // Close modal
      onClose();

      // Automatically open Project Details page
      navigate(`/projects/${data.project._id}`);
    } catch (error) {
      console.error("Create Project Error:", error);
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Create New Project
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Set up your project before generating the application.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Project Name */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Project Name
            </label>

            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. AI Resume Builder"
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Technology Stack
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Select the technologies you want to use.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {techOptions.map((tech) => {
                const selected =
                  formData.techStack.includes(tech);

                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => handleTechToggle(tech)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                          selected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-slate-600"
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

            {/* Selected Technologies */}
            {formData.techStack.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-slate-500">
                  Selected:
                </p>

                <div className="flex flex-wrap gap-2">
                  {formData.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button type="submit">
              Create Project
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default NewProject;