import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

function PromptBox({ setIsGenerating, setAgentStep }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);


  const handleGenerate = () => {
    if (!prompt.trim()) {
      alert("Please describe the application you want to build.");
      return;
    }

    setIsGenerating(true);
    setLoading(true);

    // Architect starts
    setAgentStep(0);

    // Coder starts after 1.5 seconds
    setTimeout(() => {
      setAgentStep(1);
    }, 1500);

    // Tester starts after 3 seconds
    setTimeout(() => {
      setAgentStep(2);
    }, 3000);

    // Everything completed
    setTimeout(() => {
      setAgentStep(3);
      setLoading(false);
      setIsGenerating(false);
    }, 4500);
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center gap-2 mb-4">
        <WandSparkles className="text-blue-500" size={22} />
        <h2 className="text-xl font-semibold text-white">
          AI Prompt Studio
        </h2>
      </div>

      <p className="text-slate-400 mb-4">
        Describe the application you want to build. Our AI agents will
        analyze your prompt, generate code, test it, and prepare your
        project automatically.
      </p>

      <Textarea
        rows={8}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Example:
      Create a MERN Stack E-commerce website with JWT authentication..."
        className="bg-slate-950 border-slate-700 text-white resize-none"
      />

      <div className="flex justify-end mt-5">
        <Button
          className="px-8"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "⚙️ Generating..." : "✨ Generate Application"}
        </Button>
      </div>
    </div>
  );
}

export default PromptBox;