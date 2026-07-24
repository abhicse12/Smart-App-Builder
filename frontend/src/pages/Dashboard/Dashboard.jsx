import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import WelcomeBanner from "@/components/WelcomeBanner/WelcomeBanner";
import StatsCards from "@/components/StatsCards/StatsCards";
import PromptBox from "@/components/PromptBox/PromptBox";
import AgentStatus from "@/components/AgentStatus/AgentStatus";

function Dashboard() {
  return (
    <DashboardLayout>
      <WelcomeBanner />
      <StatsCards />
      <PromptBox />
      <AgentStatus />
    </DashboardLayout>
  );
}

export default Dashboard;