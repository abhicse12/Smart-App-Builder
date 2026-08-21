import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

function NewProject({ onClose, onProjectCreated }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    techStack: "",
    status: "active",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          techStack: formData.techStack
            .split(",")
            .map((tech) => tech.trim())
            .filter(Boolean),
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create project");
      }

      alert("Project created successfully! 🚀");

      onProjectCreated(data.project);
      onClose();

    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Create New Project
          </h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-slate-300 text-sm">
              Project Name
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. AI Resume Builder"
              required
              className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">
              Description
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your project..."
              required
              rows="4"
              className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm">
              Tech Stack
            </label>

            <input
              type="text"
              name="techStack"
              value={formData.techStack}
              onChange={handleChange}
              placeholder="React, Node.js, MongoDB"
              className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />

            <p className="text-xs text-slate-500 mt-1">
              Separate technologies using commas
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3">

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