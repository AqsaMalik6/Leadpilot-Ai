import { AgentConfigForm } from "@/components/dashboard/agent-config-form";
import { getAgentConfig } from "@/lib/data/agent-config";

export default async function AgentPage() {
  const config = await getAgentConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Agent configuration</h1>
        <p className="text-sm text-slate-500">
          Control exactly how LeadPilot talks to leads and when it hands off to your team.
        </p>
      </div>
      <AgentConfigForm config={config} />
    </div>
  );
}
