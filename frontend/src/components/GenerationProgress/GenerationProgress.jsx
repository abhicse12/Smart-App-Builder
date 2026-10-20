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
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {completed
              ? "Application Generated"
              : "Application Generation"}
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            {completed
              ? "Your application has been generated successfully"
              : idle
              ? "Describe your application above and click Generate"
              : "AI agents are working on your application"}
          </p>
        </div>

        <span className="text-blue-400 font-semibold">
          {progress}%
        </span>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-blue-600 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-5">
        {steps.map((step, index) => {
          const stepCompleted = agentStep > index;
          const running = agentStep === index && !completed;

          return (
            <div
              key={step.name}
              className="flex items-center gap-4"
            >
              {stepCompleted || completed ? (
                <CheckCircle2
                  className="text-green-500"
                  size={24}
                />
              ) : running ? (
                <Loader2
                  className="text-blue-500 animate-spin"
                  size={24}
                />
              ) : (
                <Circle
                  className="text-slate-600"
                  size={24}
                />
              )}

              <div>
                <h3 className="text-white font-medium">
                  {step.name}
                </h3>

                <p className="text-sm text-slate-500">
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
        <div className="mt-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <p className="text-green-400 font-medium">
            ✓ Application generation completed successfully
          </p>
        </div>
      )}
    </div>
  );
}

export default GenerationProgress;