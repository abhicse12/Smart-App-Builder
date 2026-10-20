import { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, WandSparkles } from "lucide-react";

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
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">

      {/* Header */}

      <div className="mb-3 flex items-center gap-3">

        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <WandSparkles className="size-5 text-primary" />
        </div>

        <div>

          <h2 className="text-base font-semibold text-foreground">
            {mode === "modify"
              ? "Modify Application"
              : "Application Requirements"}
          </h2>

          <p className="text-sm text-muted-foreground">
            Describe what you want your application to do.
          </p>

        </div>

      </div>

      {/* Description */}

      <p className="mb-4 text-sm leading-6 text-muted-foreground">
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
        className="min-h-64 flex-1 resize-none rounded-xl bg-background px-4 py-3 text-sm leading-6 dark:bg-background/60"
      />

      {/* Generate Button */}

      <div className="mt-4 flex justify-end">

        <Button
          className="h-10 gap-2 rounded-lg px-6 shadow-md shadow-primary/25"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating Application...
            </>
          ) : (
            <>
              <WandSparkles className="size-4" />
              Generate Application
            </>
          )}
        </Button>

      </div>

    </div>
  );
}

export default PromptBox;