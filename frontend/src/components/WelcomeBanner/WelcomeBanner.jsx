import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

function WelcomeBanner({ onNewProject }) {
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (response.ok) {
          // First word of the account name, e.g. "Abhishek Kumar" -> "Abhishek"
          setFirstName(
            (data.user?.name || "").trim().split(/\s+/)[0]
          );
        }
      } catch (error) {
        console.error("Fetch User Error:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/15" />
      <div className="pointer-events-none absolute -bottom-28 right-1/3 size-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              AI Powered Development
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {firstName ? `Hello, ${firstName} 👋` : "Hello 👋"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build full-stack applications using Multi-Agent AI,
            Retrieval-Augmented Generation (RAG), and autonomous
            code generation.
          </p>
        </div>

        <Button
          onClick={onNewProject}
          className="h-10 shrink-0 gap-2 rounded-lg px-5 shadow-md shadow-primary/25"
        >
          <Plus className="size-4" />
          New Project
        </Button>
      </div>
    </div>
  );
}

export default WelcomeBanner;
