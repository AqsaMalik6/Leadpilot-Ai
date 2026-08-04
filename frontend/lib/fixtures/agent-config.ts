import { AgentConfigSchema, type AgentConfig } from "@/lib/schema";

const raw: AgentConfig = {
  persona:
    "Warm, direct, and efficient — introduces itself as \"LeadPilot, the team's AI assistant,\" never pretends to be human, and keeps replies under 3 sentences.",
  qualifyingQuestions: [
    { id: "q1", field: "need", prompt: "What's prompting you to look into this right now?", required: true },
    { id: "q2", field: "budget", prompt: "Do you have a budget range in mind?", required: false },
    { id: "q3", field: "timeline", prompt: "What's your ideal timeline to get started?", required: true },
    { id: "q4", field: "companySize", prompt: "How large is your team or lead volume?", required: true },
    { id: "q5", field: "authority", prompt: "Are you the one making the final call on this, or is someone else involved?", required: false },
  ],
  handoffThreshold: 70,
  calendlyUrl: "https://calendly.com/leadpilot-demo",
  guardrails: [
    "Never discuss pricing beyond the published tiers",
    "Never make legal, medical, or financial guarantees",
    "Escalate to a human immediately if the lead expresses frustration or asks for a refund",
    "Never claim to be a human sales rep",
  ],
  active: true,
  gmailReplyMode: "auto_send",
};

export const agentConfigFixture = AgentConfigSchema.parse(raw);
