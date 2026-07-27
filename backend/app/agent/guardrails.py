"""Input/output guardrails for the qualification agent (SKILL-BACKEND.md §3.4).

Heuristic/pattern-based rather than a separate model call — cheap, fast, and
sufficient for the MVP's guardrail surface (prompt-injection attempts, invented
pricing/guarantees). A learned-classifier guardrail is a reasonable Phase 2 upgrade
once there's real abuse traffic to tune it against.
"""

import re

from agents import Agent, GuardrailFunctionOutput, RunContextWrapper, input_guardrail, output_guardrail

from app.agent.context import AgentRunContext

_INJECTION_PATTERNS = re.compile(
    r"(ignore (all|the) (previous|above) instructions|"
    r"you are now|forget (your|all) (instructions|rules)|"
    r"system prompt|reveal your (prompt|instructions)|act as (if|though) you (have no|are not))",
    re.IGNORECASE,
)

_HALLUCINATION_PATTERNS = re.compile(
    r"(i guarantee|100% guaranteed|guaranteed results|free forever|"
    r"lifetime free|no cost ever|legally binding|money[- ]back guarantee)",
    re.IGNORECASE,
)


@input_guardrail
async def reject_prompt_injection(
    ctx: RunContextWrapper[AgentRunContext], agent: Agent, input_data: str | list
) -> GuardrailFunctionOutput:
    text = input_data if isinstance(input_data, str) else str(input_data)
    matched = _INJECTION_PATTERNS.search(text)
    return GuardrailFunctionOutput(
        output_info={"matched": matched.group(0) if matched else None},
        tripwire_triggered=bool(matched),
    )


@output_guardrail
async def block_hallucinated_claims(
    ctx: RunContextWrapper[AgentRunContext], agent: Agent, output: str
) -> GuardrailFunctionOutput:
    text = output if isinstance(output, str) else getattr(output, "response", str(output))
    matched = _HALLUCINATION_PATTERNS.search(text)
    return GuardrailFunctionOutput(
        output_info={"matched": matched.group(0) if matched else None},
        tripwire_triggered=bool(matched),
    )
