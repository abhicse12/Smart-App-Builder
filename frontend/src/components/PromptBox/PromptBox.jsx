import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useParams } from "react-router-dom";

function PromptBox({ setIsGenerating, setAgentStep }) {
  const { id } = useParams();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Please describe the application you want to build.");
      return;
    }

    if (!id) {
      alert("Project ID not found.");
      return;
    }

    try {
      setLoading(true);
      setIsGenerating(true);

      // Architect Agent
      setAgentStep(0);

      console.log("Starting application generation...");

      const response = await fetch(
        "http://localhost:5000/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: id,
            prompt: prompt,
          }),
        }
      );

      // Coder Agent
      setAgentStep(1);

      const data = await response.json();

      console.log("Generation response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to generate application"
        );
      }

      // Tester Agent
      setAgentStep(2);

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      // Completed
      setAgentStep(3);

      console.log("Application generation completed!");

      setPrompt("");

      alert("Application generated successfully!");

      // Refresh project page to show new data
      window.location.reload();
    } catch (error) {
      console.error("Generation Error:", error);

      alert(
        error.message ||
          "Something went wrong while generating the application."
      );

      setAgentStep(0);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center gap-2 mb-4">
        <WandSparkles
          className="text-blue-500"
          size={22}
        />

        <h2 className="text-xl font-semibold text-white">
          AI Prompt Studio
        </h2>
      </div>

      <p className="text-slate-400 mb-4">
        Describe the application you want to build. Our AI
        agents will analyze your prompt, generate code, test
        it, and prepare your project automatically.
      </p>

      <Textarea
        rows={8}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Example:
Create a MERN Stack E-commerce website with JWT authentication...`}
        className="bg-slate-950 border-slate-700 text-white resize-none"
        disabled={loading}
      />

      <div className="flex justify-end mt-5">
        <Button
          className="px-8"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? "⚙️ Generating..."
            : "✨ Generate Application"}
        </Button>
      </div>
    </div>
  );
}

export default PromptBox;