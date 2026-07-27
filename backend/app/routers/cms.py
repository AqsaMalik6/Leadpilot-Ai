"""Phase 2 CMS — public read endpoints + admin CRUD with uniqueness moderation
(SKILL-BACKEND.md §2.12, §8). Not consumed by the frontend today (it still reads
lib/fixtures/*.ts directly) — this exists so content can move off static fixtures
once there's a real reason to edit it without a code deploy.

Admin CRUD is gated to owner/admin same as other admin actions. A real multi-tenant
product would likely want a separate platform-staff-only role for this rather than
reusing a customer org's owner/admin — simplified here since no such role is modeled
yet (see delivery notes)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import require_roles
from app.models.cms import BlogPost, CaseStudy, Comparison, Industry, PricingTier, Testimonial
from app.schemas import cms as cms_schemas
from app.services.uniqueness_service import is_too_similar

router = APIRouter(prefix="/api/cms", tags=["cms"])


# ---- Industries ----------------------------------------------------------------
@router.get("/industries")
async def list_industries(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Industry))).scalars().all()
    return {"industries": [cms_schemas.Industry.model_validate(r) for r in rows]}


@router.get("/industries/{slug}")
async def get_industry(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Industry).where(Industry.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return cms_schemas.Industry.model_validate(row)


@router.post("/industries", dependencies=[Depends(require_roles("owner", "admin"))])
async def create_industry(payload: cms_schemas.IndustryUpsert, db: AsyncSession = Depends(get_db)):
    existing_texts = [r.hero_headline for r in (await db.execute(select(Industry))).scalars().all()]
    too_similar, ratio = is_too_similar(payload.hero_headline, existing_texts)
    if too_similar:
        raise HTTPException(status_code=422, detail=f"Too similar to existing industry content (similarity={ratio:.2f})")

    row = Industry(**payload.model_dump(exclude={"published_at", "updated_at"}))
    db.add(row)
    await db.commit()
    return cms_schemas.Industry.model_validate(row)


@router.put("/industries/{slug}", dependencies=[Depends(require_roles("owner", "admin"))])
async def update_industry(slug: str, payload: cms_schemas.IndustryUpsert, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Industry).where(Industry.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude={"published_at", "updated_at"}).items():
        setattr(row, field, value)
    await db.commit()
    return cms_schemas.Industry.model_validate(row)


@router.delete("/industries/{slug}", dependencies=[Depends(require_roles("owner", "admin"))])
async def delete_industry(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Industry).where(Industry.slug == slug))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


# ---- Comparisons ----------------------------------------------------------------
@router.get("/comparisons")
async def list_comparisons(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Comparison))).scalars().all()
    return {"comparisons": [cms_schemas.Comparison.model_validate(r) for r in rows]}


@router.get("/comparisons/{slug}")
async def get_comparison(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Comparison).where(Comparison.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return cms_schemas.Comparison.model_validate(row)


@router.post("/comparisons", dependencies=[Depends(require_roles("owner", "admin"))])
async def create_comparison(payload: cms_schemas.ComparisonUpsert, db: AsyncSession = Depends(get_db)):
    existing_texts = [r.intro for r in (await db.execute(select(Comparison))).scalars().all()]
    too_similar, ratio = is_too_similar(payload.intro, existing_texts)
    if too_similar:
        raise HTTPException(status_code=422, detail=f"Too similar to an existing comparison page (similarity={ratio:.2f})")

    row = Comparison(**payload.model_dump(exclude={"updated_at"}))
    db.add(row)
    await db.commit()
    return cms_schemas.Comparison.model_validate(row)


@router.put("/comparisons/{slug}", dependencies=[Depends(require_roles("owner", "admin"))])
async def update_comparison(slug: str, payload: cms_schemas.ComparisonUpsert, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Comparison).where(Comparison.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude={"updated_at"}).items():
        setattr(row, field, value)
    await db.commit()
    return cms_schemas.Comparison.model_validate(row)


@router.delete("/comparisons/{slug}", dependencies=[Depends(require_roles("owner", "admin"))])
async def delete_comparison(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Comparison).where(Comparison.slug == slug))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


# ---- Testimonials ----------------------------------------------------------------
@router.get("/testimonials")
async def list_testimonials(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Testimonial))).scalars().all()
    return {"testimonials": [_testimonial_to_schema(r) for r in rows]}


def _testimonial_to_schema(row: Testimonial) -> cms_schemas.Testimonial:
    return cms_schemas.Testimonial(
        id=str(row.id),
        quote=row.quote,
        author_name=row.author_name,
        author_title=row.author_title,
        company_name=row.company_name,
        company_logo_src=row.company_logo_src,
        avatar_src=row.avatar_src,
        metric_callout=row.metric_callout,
        is_illustrative=row.is_illustrative,
    )


@router.post("/testimonials", dependencies=[Depends(require_roles("owner", "admin"))])
async def create_testimonial(payload: cms_schemas.Testimonial, db: AsyncSession = Depends(get_db)):
    row = Testimonial(
        quote=payload.quote,
        author_name=payload.author_name,
        author_title=payload.author_title,
        company_name=payload.company_name,
        company_logo_src=payload.company_logo_src,
        avatar_src=payload.avatar_src,
        metric_callout=payload.metric_callout,
        is_illustrative=payload.is_illustrative,
    )
    db.add(row)
    await db.commit()
    return _testimonial_to_schema(row)


@router.delete("/testimonials/{testimonial_id}", dependencies=[Depends(require_roles("owner", "admin"))])
async def delete_testimonial(testimonial_id: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(Testimonial).where(Testimonial.id == testimonial_id))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


# ---- Case studies ----------------------------------------------------------------
@router.get("/case-studies")
async def list_case_studies(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(CaseStudy))).scalars().all()
    return {"caseStudies": [await _case_study_to_schema(db, r) for r in rows]}


@router.get("/case-studies/{slug}")
async def get_case_study(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(CaseStudy).where(CaseStudy.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return await _case_study_to_schema(db, row)


async def _case_study_to_schema(db: AsyncSession, row: CaseStudy) -> cms_schemas.CaseStudy:
    quote = None
    if row.quote_testimonial_id:
        t = (await db.execute(select(Testimonial).where(Testimonial.id == row.quote_testimonial_id))).scalar_one_or_none()
        if t:
            quote = _testimonial_to_schema(t)
    return cms_schemas.CaseStudy(
        slug=row.slug,
        company_name=row.company_name,
        industry=row.industry,
        summary=row.summary,
        metrics=row.metrics,
        narrative=row.narrative,
        quote=quote,
        is_illustrative=row.is_illustrative,
        published_at=row.published_at,
    )


@router.delete("/case-studies/{slug}", dependencies=[Depends(require_roles("owner", "admin"))])
async def delete_case_study(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(CaseStudy).where(CaseStudy.slug == slug))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


# ---- Pricing tiers ----------------------------------------------------------------
@router.get("/pricing-tiers")
async def list_pricing_tiers(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(PricingTier).order_by(PricingTier.sort_order))).scalars().all()
    return {
        "pricingTiers": [
            cms_schemas.PricingTier(
                id=r.id,
                name=r.name,
                tagline=r.tagline,
                monthly_price_cents=r.monthly_price_cents,
                annual_price_cents=r.annual_price_cents,
                leads_included_per_month=r.leads_included_per_month,
                feature_bullets=r.feature_bullets,
                highlighted=r.highlighted,
                cta_label=r.cta_label,
                cta_href=r.cta_href,
            )
            for r in rows
        ]
    }


# ---- Blog posts ----------------------------------------------------------------
@router.get("/blog-posts")
async def list_blog_posts(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(BlogPost).where(BlogPost.status == "published").order_by(BlogPost.published_at.desc()))
    ).scalars().all()
    return {"blogPosts": [_blog_post_to_schema(r) for r in rows]}


@router.get("/blog-posts/{slug}")
async def get_blog_post(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return _blog_post_to_schema(row)


def _blog_post_to_schema(row: BlogPost) -> cms_schemas.BlogPost:
    return cms_schemas.BlogPost(
        slug=row.slug,
        title=row.title,
        meta_title=row.meta_title,
        meta_description=row.meta_description,
        tldr=row.tldr,
        body_mdx_path=row.body_mdx_path or "",
        author=cms_schemas.Author(
            id=row.author_name.lower().replace(" ", "-"),
            name=row.author_name,
            title=row.author_title,
            avatar_src=row.author_avatar_src or "",
            bio=row.author_bio,
        ),
        published_at=row.published_at,
        updated_at=row.updated_at,
        tags=row.tags,
        cover_image_src=row.cover_image_src,
        reading_time_minutes=row.reading_time_minutes,
        faqs=row.faqs,
        related_slugs=row.related_slugs,
    )


@router.post("/blog-posts", dependencies=[Depends(require_roles("owner", "admin"))])
async def create_blog_post(payload: cms_schemas.BlogPost, db: AsyncSession = Depends(get_db)):
    existing_texts = [r.tldr for r in (await db.execute(select(BlogPost))).scalars().all()]
    too_similar, ratio = is_too_similar(payload.tldr, existing_texts)
    if too_similar:
        raise HTTPException(status_code=422, detail=f"Too similar to an existing post (similarity={ratio:.2f})")

    row = BlogPost(
        slug=payload.slug,
        title=payload.title,
        meta_title=payload.meta_title,
        meta_description=payload.meta_description,
        tldr=payload.tldr,
        body_mdx_path=payload.body_mdx_path,
        author_name=payload.author.name,
        author_title=payload.author.title,
        author_avatar_src=payload.author.avatar_src,
        author_bio=payload.author.bio,
        tags=payload.tags,
        cover_image_src=payload.cover_image_src,
        reading_time_minutes=payload.reading_time_minutes,
        faqs=payload.faqs,
        related_slugs=payload.related_slugs,
        status="published",
    )
    db.add(row)
    await db.commit()
    return _blog_post_to_schema(row)


@router.delete("/blog-posts/{slug}", dependencies=[Depends(require_roles("owner", "admin"))])
async def delete_blog_post(slug: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}
