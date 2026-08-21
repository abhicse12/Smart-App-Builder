import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function WelcomeBanner({ onNewProject }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-8 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-blue-500" size={22} />
          <span className="text-blue-400 font-medium">
            AI Powered Development
          </span>
        </div>

        <h1 className="text-4xl font-bold text-white">
          Welcome Back, User 👋
        </h1>

        <p className="mt-3 text-slate-400 max-w-2xl">
          Build full-stack applications using Multi-Agent AI,
          Retrieval-Augmented Generation (RAG), and autonomous
          code generation.
        </p>
      </div>

      <Button size="lg" onClick={onNewProject}>
        + New Project
      </Button>
    </div>
  );
}

export default WelcomeBanner;