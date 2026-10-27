import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
    <div className="glass float-in relative overflow-hidden rounded-3xl p-6 sm:p-8">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-10 -top-28 size-80 rounded-full bg-linear-to-br from-violet-400/40 to-pink-300/30 blur-3xl dark:from-violet-600/25 dark:to-pink-600/15" />
      <div className="pointer-events-none absolute -bottom-36 right-1/4 size-72 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-600/15" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="glass-inset mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>

            <span className="text-xs font-medium text-primary">
              AI Powered Development
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {firstName ? (
              <>
                Hello, <span className="text-gradient">{firstName}</span>
              </>
            ) : (
              "Hello"
            )}{" "}
            <span className="wave">👋</span>
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build full-stack applications using Multi-Agent AI,
            Retrieval-Augmented Generation (RAG), and autonomous
            code generation.
          </p>
        </div>

        <Button
          onClick={onNewProject}
          className="h-11 shrink-0 gap-2 rounded-xl px-6 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          New Project
        </Button>
      </div>
    </div>
  );
}

export default WelcomeBanner;
