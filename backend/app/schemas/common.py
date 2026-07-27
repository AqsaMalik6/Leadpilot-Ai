from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base for every response/request model — emits camelCase JSON matching
    frontend/lib/schema/*.ts verbatim (SKILL-BACKEND.md: "All JSON responses are
    camelCase")."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
