"""Content-uniqueness moderation for the Phase 2 CMS admin endpoints
(SKILL-BACKEND.md §8: "reject blog/industry/comparison content that fails a
minimum-uniqueness check ... to prevent the thin/duplicate-content anti-pattern").

Honest scope note: this is a lexical-similarity heuristic (difflib's SequenceMatcher
ratio against existing rows' key text fields), not a semantic/embedding-based
similarity check. An embeddings-based version is a reasonable upgrade once there's an
embeddings API budget — this catches near-duplicate copy-paste, not paraphrased
duplicates.
"""

from difflib import SequenceMatcher

SIMILARITY_REJECT_THRESHOLD = 0.85


def is_too_similar(candidate_text: str, existing_texts: list[str]) -> tuple[bool, float]:
    best = 0.0
    for existing in existing_texts:
        ratio = SequenceMatcher(None, candidate_text.lower(), existing.lower()).ratio()
        best = max(best, ratio)
    return best >= SIMILARITY_REJECT_THRESHOLD, best
