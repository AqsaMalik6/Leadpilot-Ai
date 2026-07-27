from datetime import datetime

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.lead import Channel


class PainPoint(CamelModel):
    title: str
    description: str


class Faq(CamelModel):
    question: str
    answer: str


class Industry(CamelModel):
    slug: str
    name: str
    meta_title: str = Field(max_length=60)
    meta_description: str = Field(max_length=155)
    hero_headline: str
    hero_subhead: str
    pain_points: list[PainPoint] = Field(min_length=3)
    case_study_slug: str | None = None
    faqs: list[Faq] = Field(min_length=3)
    relevant_channels: list[Channel]
    published_at: datetime
    updated_at: datetime


class ComparisonFeatureRow(CamelModel):
    feature: str
    lead_pilot: bool | str
    competitor: bool | str
    note: str | None = None


class Comparison(CamelModel):
    slug: str
    competitor_name: str
    meta_title: str = Field(max_length=60)
    meta_description: str = Field(max_length=155)
    intro: str
    feature_rows: list[ComparisonFeatureRow] = Field(min_length=5)
    when_to_choose_lead_pilot: list[str]
    when_to_choose_competitor: list[str]
    faqs: list[Faq]
    updated_at: datetime


class Testimonial(CamelModel):
    id: str
    quote: str
    author_name: str
    author_title: str
    company_name: str
    company_logo_src: str | None = None
    avatar_src: str | None = None
    metric_callout: str | None = None
    is_illustrative: bool


class CaseStudyMetric(CamelModel):
    label: str
    value: str


class CaseStudy(CamelModel):
    slug: str
    company_name: str
    industry: str
    summary: str
    metrics: list[CaseStudyMetric]
    narrative: str
    quote: Testimonial | None = None
    is_illustrative: bool
    published_at: datetime


class PricingTier(CamelModel):
    id: str
    name: str
    tagline: str
    monthly_price_cents: int | None = None
    annual_price_cents: int | None = None
    leads_included_per_month: int | None = None
    feature_bullets: list[str]
    highlighted: bool
    cta_label: str
    cta_href: str


class Author(CamelModel):
    id: str
    name: str
    title: str
    avatar_src: str
    bio: str


class BlogPost(CamelModel):
    slug: str
    title: str
    meta_title: str = Field(max_length=60)
    meta_description: str = Field(max_length=155)
    tldr: str
    body_mdx_path: str
    author: Author
    published_at: datetime
    updated_at: datetime
    tags: list[str]
    cover_image_src: str
    reading_time_minutes: int
    faqs: list[Faq] | None = None
    related_slugs: list[str] = Field(max_length=3)


class IndustryUpsert(Industry):
    """Admin CRUD input — same shape as the read model (Phase 2 CMS admin)."""


class ComparisonUpsert(Comparison):
    pass
