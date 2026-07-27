import { DemoScriptSchema, type DemoScript } from "@/lib/schema";

const raw: DemoScript[] = [
  {
    id: "hero-loop",
    label: "Hero loop",
    industry: "Real estate",
    outcome: "booked",
    steps: [
      { id: "s1", role: "lead", text: "Hi, I saw your listing for 42 Ridgeview Ave — is it still available?", delayMs: 0 },
      { id: "s2", role: "agent", text: "Hi! Yes, 42 Ridgeview is still on the market. I'm LeadPilot, the team's AI assistant — mind if I ask a couple quick questions so I can get you the right info fast?", delayMs: 1400 },
      { id: "s3", role: "lead", text: "Sure.", delayMs: 1800 },
      { id: "s4", role: "agent", text: "Great — are you pre-approved for financing, and are you hoping to move in the next 30 days?", delayMs: 1300 },
      { id: "s5", role: "lead", text: "Yes, pre-approved, and yes we'd like to move fast.", delayMs: 2200 },
      { id: "s6", role: "agent", text: "Perfect — that's exactly the kind of buyer our agents prioritize. I've booked you a showing for tomorrow at 4pm and sent a confirmation to your email.", delayMs: 1500 },
    ],
  },
  {
    id: "demo-real-estate",
    label: "Real estate — buyer inquiry",
    industry: "Real estate",
    outcome: "booked",
    steps: [
      { id: "s1", role: "lead", text: "Hi, I'm interested in the 3-bedroom listing downtown. Can someone tell me more?", delayMs: 0 },
      { id: "s2", role: "agent", text: "Hi there — I'm LeadPilot, your AI assistant. Happy to help! Are you working with an agent already, or exploring on your own for now?", delayMs: 1300 },
      { id: "s3", role: "lead", text: "Exploring on my own, no agent yet.", delayMs: 2000 },
      { id: "s4", role: "agent", text: "Got it. What's your target move-in timeline, and do you have financing pre-approval in place?", delayMs: 1300 },
      { id: "s5", role: "lead", text: "Move in 2 months, and yes, pre-approved for $650k.", delayMs: 2400 },
      { id: "s6", role: "agent", text: "That's a strong match for this listing. I'm booking you a private showing with our agent Sam this Saturday at 11am — confirmation is on its way to your inbox.", delayMs: 1500 },
    ],
  },
  {
    id: "demo-home-services",
    label: "Home services — after-hours job",
    industry: "Home services",
    outcome: "qualified",
    steps: [
      { id: "s1", role: "lead", text: "Our water heater just started leaking, can someone come out tonight?", delayMs: 0 },
      { id: "s2", role: "agent", text: "Sorry to hear that — I'm LeadPilot, on call for the team right now. Is the leak actively flooding the area, or is it a slow drip?", delayMs: 1200 },
      { id: "s3", role: "lead", text: "Slow drip for now but getting worse.", delayMs: 1900 },
      { id: "s4", role: "agent", text: "Understood — I'm flagging this as urgent and notifying our on-call technician now. What's the best number to reach you at in the next 30 minutes?", delayMs: 1400 },
      { id: "s5", role: "lead", text: "555-0148, that's my cell.", delayMs: 1600 },
      { id: "s6", role: "agent", text: "Got it, a technician will call you within 30 minutes. I've flagged this as high priority for your team's morning queue too.", delayMs: 1300 },
    ],
  },
  {
    id: "demo-saas",
    label: "B2B SaaS — pricing inquiry",
    industry: "SaaS",
    outcome: "rejected",
    steps: [
      { id: "s1", role: "lead", text: "What's the cheapest plan you have? Just checking prices for a comparison doc.", delayMs: 0 },
      { id: "s2", role: "agent", text: "Happy to share — plans start at $299/mo. Out of curiosity, are you currently evaluating a switch, or building out a vendor comparison for later?", delayMs: 1300 },
      { id: "s3", role: "lead", text: "Just building a spreadsheet for a class assignment, not an actual company.", delayMs: 2000 },
      { id: "s4", role: "agent", text: "Ah, got it — thanks for being upfront! This one's outside what our sales team handles, but our pricing page has everything you need for the spreadsheet.", delayMs: 1200 },
    ],
  },
];

export const demoScriptsFixture = DemoScriptSchema.array().parse(raw);

export function getDemoScriptById(id: string) {
  return demoScriptsFixture.find((script) => script.id === id) ?? null;
}
