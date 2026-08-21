import { useState } from "react";

import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import WelcomeBanner from "@/components/WelcomeBanner/WelcomeBanner";
import StatsCards from "@/components/StatsCards/StatsCards";
import PromptBox from "@/components/PromptBox/PromptBox";
import AgentStatus from "@/components/AgentStatus/AgentStatus";
import GenerationProgress from "@/components/GenerationProgress/GenerationProgress";
import NewProject from "@/components/NewProject/NewProject";

function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStep, setAgentStep] = useState(0);

  // New Project modal
  const [showNewProject, setShowNewProject] = useState(false);

  const handleProjectCreated = (project) => {
    console.log("New project:", project);
  };

  return (
    <DashboardLayout>
      <WelcomeBanner
        onNewProject={() => setShowNewProject(true)}
      />

      <StatsCards />

      <PromptBox
        setIsGenerating={setIsGenerating}
        setAgentStep={setAgentStep}
      />

      <AgentStatus
        isGenerating={isGenerating}
        agentStep={agentStep}
      />

      <GenerationProgress
        agentStep={agentStep}
      />

      {showNewProject && (
        <NewProject
          onClose={() => setShowNewProject(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </DashboardLayout>
  );
}

export default Dashboard;