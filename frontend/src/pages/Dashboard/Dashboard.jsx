import { useState } from "react";

import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import WelcomeBanner from "@/components/WelcomeBanner/WelcomeBanner";
import StatsCards from "@/components/StatsCards/StatsCards";
import AgentStatus from "@/components/AgentStatus/AgentStatus";
import GenerationProgress from "@/components/GenerationProgress/GenerationProgress";
import NewProject from "@/components/NewProject/NewProject";
import ProjectsList from "@/components/ProjectsList/ProjectsList";

function Dashboard() {
  const [projects, setProjects] = useState([]);

  const [showNewProject, setShowNewProject] =
    useState(false);

  const handleProjectCreated = (project) => {
    setProjects((prevProjects) => [
      project,
      ...prevProjects,
    ]);
  };

  return (
    <DashboardLayout>
      <WelcomeBanner
        onNewProject={() => setShowNewProject(true)}
      />

      <StatsCards projects={projects} />

      <ProjectsList
        projects={projects}
        setProjects={setProjects}
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