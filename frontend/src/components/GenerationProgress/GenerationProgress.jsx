import { CheckCircle2, Loader2, Circle } from "lucide-react";

function GenerationProgress({ agentStep }) {
  const steps = [
    {
      name: "Architect Agent",
      description: "Analyzing requirements and designing architecture",
    },
    {
      name: "Coder Agent",
      description: "Generating application source code",
    },
    {
      name: "Tester Agent",
      description: "Testing generated application",
    },
  ];

  const progress =
    agentStep === 0
      ? 10
      : agentStep === 1
      ? 45
      : agentStep === 2
      ? 75
      : 100;

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Application Generation
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            AI agents are working on your application
          </p>
        </div>

        <span className="text-blue-400 font-semibold">
          {progress}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-blue-600 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-5">
        {steps.map((step, index) => {
          const completed = agentStep > index;
          const running = agentStep === index;

          return (
            <div
              key={step.name}
              className="flex items-center gap-4"
            >
              {completed ? (
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
                  {completed
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
    </div>
  );
}

export default GenerationProgress;