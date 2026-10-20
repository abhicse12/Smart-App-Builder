import { Bot, Code2, ShieldCheck } from "lucide-react";

function AgentStatus({ isGenerating, agentStep }) {
  const agents = [
    {
      name: "Architect Agent",
      status:
        agentStep === 0
          ? "Running"
          : agentStep >= 1
          ? "Completed"
          : "Ready",
      color:
        agentStep === 0
          ? "bg-primary animate-pulse"
          : agentStep >= 1
          ? "bg-success"
          : "bg-muted-foreground/40",
      icon: Bot,
    },

    {
      name: "Coder Agent",
      status:
        agentStep === 1
          ? "Running"
          : agentStep >= 2
          ? "Completed"
          : "Waiting",
      color:
        agentStep === 1
          ? "bg-primary animate-pulse"
          : agentStep >= 2
          ? "bg-success"
          : "bg-warning",
      icon: Code2,
    },

    {
      name: "Tester Agent",
      status:
        agentStep === 2
          ? "Running"
          : agentStep >= 3
          ? "Completed"
          : "Waiting",
      color:
        agentStep === 2
          ? "bg-primary animate-pulse"
          : agentStep >= 3
          ? "bg-success"
          : "bg-muted-foreground/40",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="glass float-in rounded-2xl p-5" style={{ "--d": "120ms" }}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        AI Agent Status
      </h2>

      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className={`glass-inset flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ${
              agent.status === "Running"
                ? "scale-[1.02] ring-2 ring-primary/40 shadow-lg shadow-primary/20"
                : ""
            }`}
          >
            <div className="btn-glow flex size-8 shrink-0 items-center justify-center rounded-lg">
              <agent.icon className="size-4 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-foreground">
                {agent.name}
              </h3>
            </div>

            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`size-2 rounded-full ${agent.color}`}
              />
              {agent.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentStatus;