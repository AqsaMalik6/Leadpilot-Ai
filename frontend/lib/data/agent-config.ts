import { backendFetch } from "@/lib/backend-fetch";
import { AgentConfigSchema, type AgentConfig } from "@/lib/schema";

export async function getAgentConfig(): Promise<AgentConfig> {
  const res = await backendFetch("/api/agent/config");
  if (!res.ok) throw new Error(`Failed to load agent config (${res.status})`);
  return AgentConfigSchema.parse(await res.json());
}

export async function updateAgentConfig(config: AgentConfig): Promise<AgentConfig> {
  const res = await backendFetch("/api/agent/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Failed to update agent config (${res.status})`);
  return AgentConfigSchema.parse(await res.json());
}
