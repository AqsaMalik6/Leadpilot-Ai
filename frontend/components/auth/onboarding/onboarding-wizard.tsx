"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Step1ConnectChannel } from "@/components/auth/onboarding/step-1-connect-channel";
import { Step2QualifyingQuestions } from "@/components/auth/onboarding/step-2-qualifying-questions";
import { Step3Notifications } from "@/components/auth/onboarding/step-3-notifications";
import { Step4TestLead } from "@/components/auth/onboarding/step-4-test-lead";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AgentConfig } from "@/lib/schema";

const STEP_LABELS = ["Connect a channel", "Qualifying questions", "Calendly & alerts", "Send a test lead"];

export function OnboardingWizard({ initialConfig }: { initialConfig: AgentConfig }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const [channel, setChannel] = useState("website_form");
  const [questions, setQuestions] = useState(initialConfig.qualifyingQuestions);
  const [calendlyUrl, setCalendlyUrl] = useState(initialConfig.calendlyUrl ?? "");
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/auth/onboarding")
      .then((res) => res.json())
      .then((data) => {
        setStep(data.step ?? 1);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function saveStep(leavingStep: number) {
    try {
      if (leavingStep === 1) {
        await fetch("/api/onboarding/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelType: channel }),
        });
      } else if (leavingStep === 2) {
        await fetch("/api/agent/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...initialConfig, qualifyingQuestions: questions }),
        });
      } else if (leavingStep === 3) {
        await Promise.all([
          fetch("/api/onboarding/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ calendlyUrl }),
          }),
          fetch("/api/notifications/rules", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slack: slackEnabled, email: emailEnabled }),
          }),
        ]);
      }
    } catch {
      // best-effort — the wizard still advances locally either way
    }
  }

  async function goTo(nextStep: number) {
    const leavingStep = step;
    setStep(nextStep);
    await saveStep(leavingStep);
    await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: nextStep }),
    });
  }

  async function finish() {
    await saveStep(step);
    await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: true }),
    });
    router.push("/dashboard");
    router.refresh();
  }

  if (!loaded) return null;

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Step {step} of {STEP_LABELS.length}
          </span>
          <span className="font-medium text-ink-950">{STEP_LABELS[step - 1]}</span>
        </div>
        <Progress value={(step / STEP_LABELS.length) * 100} className="mt-2" />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-8">
        {step === 1 && <Step1ConnectChannel value={channel} onChange={setChannel} />}
        {step === 2 && <Step2QualifyingQuestions questions={questions} onChange={setQuestions} />}
        {step === 3 && (
          <Step3Notifications
            calendlyUrl={calendlyUrl}
            onCalendlyChange={setCalendlyUrl}
            slackEnabled={slackEnabled}
            onSlackChange={setSlackEnabled}
            emailEnabled={emailEnabled}
            onEmailChange={setEmailEnabled}
          />
        )}
        {step === 4 && <Step4TestLead />}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEP_LABELS.length ? (
            <Button onClick={() => goTo(step + 1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish}>Go to dashboard</Button>
          )}
        </div>
      </div>
    </div>
  );
}
