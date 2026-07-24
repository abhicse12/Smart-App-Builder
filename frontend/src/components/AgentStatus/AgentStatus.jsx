import { Card, CardContent } from "@/components/ui/card";
import { Bot, Code2, ShieldCheck } from "lucide-react";

const agents = [
  {
    name: "Architect Agent",
    status: "Ready",
    color: "bg-green-500",
    icon: Bot,
  },
  {
    name: "Coder Agent",
    status: "Waiting",
    color: "bg-yellow-500",
    icon: Code2,
  },
  {
    name: "Tester Agent",
    status: "Waiting",
    color: "bg-slate-500",
    icon: ShieldCheck,
  },
];

function AgentStatus() {
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        AI Agent Status
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card
            key={agent.name}
            className="bg-slate-900 border-slate-800"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <agent.icon
                  className="text-blue-500"
                  size={30}
                />

                <div
                  className={`h-3 w-3 rounded-full ${agent.color}`}
                />
              </div>

              <h3 className="text-lg text-white font-semibold mt-4">
                {agent.name}
              </h3>

              <p className="text-slate-400 mt-2">
                Status: {agent.status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AgentStatus;