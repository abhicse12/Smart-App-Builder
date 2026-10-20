import {
  CheckCircle2,
  Loader2,
  Circle,
} from "lucide-react";

function GenerationProgress({ agentStep }) {
  const steps = [
    {
      name: "Architect Agent",
      description:
        "Analyzing requirements and designing architecture",
    },
    {
      name: "Coder Agent",
      description:
        "Generating application source code",
    },
    {
      name: "Tester Agent",
      description:
        "Testing generated application",
    },
  ];

  // agentStep -1 means idle (no generation running)
  const idle = agentStep < 0;

  const progress =
    idle
      ? 0
      : agentStep === 0
      ? 10
      : agentStep === 1
      ? 45
      : agentStep === 2
      ? 75
      : 100;

  const completed = agentStep >= 3;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {completed
              ? "Application Generated"
              : "Application Generation"}
          </h2>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {completed
              ? "Your application has been generated successfully"
              : idle
              ? "Describe your application and click Generate"
              : "AI agents are working on your application"}
          </p>
        </div>

        <span className="text-sm font-semibold text-primary">
          {progress}%
        </span>
      </div>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-violet-500 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3.5">
        {steps.map((step, index) => {
          const stepCompleted = agentStep > index;
          const running = agentStep === index && !completed;

          return (
            <div
              key={step.name}
              className="flex items-center gap-3"
            >
              {stepCompleted || completed ? (
                <CheckCircle2 className="size-5 shrink-0 text-success" />
              ) : running ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground/40" />
              )}

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {step.name}
                </h3>

                <p className="text-xs text-muted-foreground">
                  {stepCompleted || completed
                    ? "Completed successfully"
                    : running
                    ? step.description
                    : "Waiting"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {completed && (
        <div className="mt-5 rounded-lg border border-success/20 bg-success/10 px-3 py-2.5">
          <p className="text-sm font-medium text-success">
            ✓ Application generation completed successfully
          </p>
        </div>
      )}
    </div>
  );
}

export default GenerationProgress;