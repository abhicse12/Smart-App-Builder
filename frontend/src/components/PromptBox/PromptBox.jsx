import { useState } from "react";
import { useParams } from "react-router-dom";
import { WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/api";

function PromptBox({ setIsGenerating, setAgentStep,mode = "generate", }) {
  const { id } = useParams();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
  if (!prompt.trim()) {
    alert("Please describe the application requirements.");
    return;
  }

  if (!id) {
    alert("Project ID not found.");
    return;
  }

  try {
    setLoading(true);
    setIsGenerating(true);

    // ==============================
    // Architect Agent
    // ==============================

    setAgentStep(0);

    console.log("Starting application generation...");

    // Modify uses the protected project modify endpoint.
    // New generation keeps using /api/generate.
    const isModify = mode === "modify";

    const url = isModify
      ? `${API_BASE_URL}/api/projects/${id}/modify`
      : `${API_BASE_URL}/api/generate`;

    const body = isModify
      ? {
          userRequest: prompt.trim(),
        }
      : {
          projectId: id,
          prompt: prompt.trim(),
          mode: mode,
        };

    const response = await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        // HttpOnly cookie automatically send hogi
        credentials: "include",

        body: JSON.stringify(body),
      }
    );

    // ==============================
    // Coder Agent
    // ==============================

    setAgentStep(1);

    const data = await response.json();

    console.log("Generation response:", data);

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to generate application"
      );
    }

    // ==============================
    // Tester / Validator Agent
    // ==============================

    setAgentStep(2);

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    // ==============================
    // Generation Completed
    // ==============================

    setAgentStep(3);

    console.log(
      "Application generation completed!"
    );

    setPrompt("");

    alert(
      "Application generated successfully!"
    );

    window.location.reload();

  } catch (error) {
    console.error(
      "Generation Error:",
      error
    );

    alert(
      error.message ||
        "Something went wrong while generating the application."
    );

    // back to idle
    setAgentStep(-1);

  } finally {
    setLoading(false);
    setIsGenerating(false);
  }
};

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">

      {/* Header */}

      <div className="mb-4 flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">

          <WandSparkles
            className="text-blue-500"
            size={22}
          />

        </div>

        <div>

          <h2 className="text-xl font-semibold text-white">
            Application Requirements
          </h2>

          <p className="text-sm text-slate-500">
            Describe what you want your application to do.
          </p>

        </div>

      </div>

      {/* Description */}

      <p className="mb-4 text-sm leading-6 text-slate-400">
        Explain the application's features, users,
        pages, functionality, authentication,
        database requirements, and any other
        important details. Our AI agents will use
        these requirements to design and generate
        your application.
      </p>

      {/* Requirements Input */}

      <Textarea
        rows={10}
        value={prompt}
        onChange={(e) =>
          setPrompt(e.target.value)
        }
        disabled={loading}
        placeholder={`Example:

Create a library management application.

Requirements:
- Users can sign up, log in and log out
- Users can add, edit and delete books
- Each book has a title, author, genre and status (available / borrowed)
- Search books by title and filter by genre or status
- Provide a dashboard with total, available and borrowed books
- Create a clean and responsive UI`}
        className="resize-none border-slate-700 bg-slate-950 text-white placeholder:text-slate-600"
      />

      {/* Generate Button */}

      <div className="mt-5 flex justify-end">

        <Button
          className="px-8"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? "⚙️ Generating Application..."
            : "✨ Generate Application"}
        </Button>

      </div>

    </div>
  );
}

export default PromptBox;