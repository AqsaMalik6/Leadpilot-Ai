"""Phase 2 CMS tables.

Corrected shapes vs. the original spec (checked field-by-field against the frontend's
actual Zod schemas — lib/schema/industry.ts, comparison.ts, testimonial.ts, blog.ts,
pricing.ts — see SKILL-BACKEND.md §1 "Phase 2 — CMS content"). Seeded from the
frontend's existing lib/fixtures/*.ts content via scripts/seed.py so nothing has to be
authored twice.
"""

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

BLOG_STATUS_VALUES = ("draft", "published")


class Industry(Base, UUIDPk):
    __tablename__ = "industries"

    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    meta_title: Mapped[str] = mapped_column(String(60))
    meta_description: Mapped[str] = mapped_column(String(155))
    hero_headline: Mapped[str] = mapped_column(Text)
    hero_subhead: Mapped[str] = mapped_column(Text)
    pain_points: Mapped[list] = mapped_column(JSONB, default=list)  # [{title, description}], min 3
    case_study_slug: Mapped[str | None] = mapped_column(String(100), nullable=True)
    faqs: Mapped[list] = mapped_column(JSONB, default=list)  # [{question, answer}], min 3
    relevant_channels: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Comparison(Base, UUIDPk):
    __tablename__ = "comparisons"

    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)  # competitor_slug
    competitor_name: Mapped[str] = mapped_column(String(200))
    meta_title: Mapped[str] = mapped_column(String(60))
    meta_description: Mapped[str] = mapped_column(String(155))
    intro: Mapped[str] = mapped_column(Text)
    feature_rows: Mapped[list] = mapped_column(JSONB, default=list)  # [{feature, leadPilot, competitor, note?}], min 5
    when_to_choose_lead_pilot: Mapped[list[str]] = mapped_column("when_to_choose_leadpilot", JSONB, default=list)
    when_to_choose_competitor: Mapped[list[str]] = mapped_column(JSONB, default=list)
    faqs: Mapped[list] = mapped_column(JSONB, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Testimonial(Base, UUIDPk):
    __tablename__ = "testimonials"

    quote: Mapped[str] = mapped_column(Text)
    author_name: Mapped[str] = mapped_column(String(200))
    author_title: Mapped[str] = mapped_column(String(200))
    company_name: Mapped[str] = mapped_column(String(200))
    company_logo_src: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_src: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metric_callout: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_illustrative: Mapped[bool] = mapped_column(Boolean, default=True)


class CaseStudy(Base, UUIDPk):
    __tablename__ = "case_studies"

    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    company_name: Mapped[str] = mapped_column(String(200))
    industry: Mapped[str] = mapped_column(String(100))
    summary: Mapped[str] = mapped_column(Text)
    metrics: Mapped[list] = mapped_column(JSONB, default=list)  # [{label, value}]
    narrative: Mapped[str] = mapped_column(Text)
    quote_testimonial_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("testimonials.id"), nullable=True
    )
    is_illustrative: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PricingTier(Base):
    __tablename__ = "pricing_tiers"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. "starter" — matches PricingTierSchema.id (plain string)
    name: Mapped[str] = mapped_column(String(100))
    tagline: Mapped[str] = mapped_column(String(300))
    monthly_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    annual_price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leads_included_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feature_bullets: Mapped[list[str]] = mapped_column(JSONB, default=list)
    highlighted: Mapped[bool] = mapped_column(Boolean, default=False)
    cta_label: Mapped[str] = mapped_column(String(100))
    cta_href: Mapped[str] = mapped_column(String(300))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class BlogPost(Base, UUIDPk):
    __tablename__ = "blog_posts"

    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    meta_title: Mapped[str] = mapped_column(String(60))
    meta_description: Mapped[str] = mapped_column(String(155))
    tldr: Mapped[str] = mapped_column(Text)
    # Phase 2 CMS-authored body. If null, the post still ships as a frontend-bundled
    # content/blog/*.mdx file referenced by body_mdx_path (see SKILL-BACKEND.md §1).
    content_mdx: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_mdx_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    author_name: Mapped[str] = mapped_column(String(200))
    author_title: Mapped[str] = mapped_column(String(200))
    author_avatar_src: Mapped[str | None] = mapped_column(String(500), nullable=True)
    author_bio: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    cover_image_src: Mapped[str] = mapped_column(String(500), default="")
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=5)
    faqs: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    related_slugs: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)  # max 3, enforced in Pydantic
    status: Mapped[str] = mapped_column(Enum(*BLOG_STATUS_VALUES, name="blog_status"), default="published")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
