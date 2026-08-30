"""Versioned validation and search projection for imported research analyses."""

from __future__ import annotations

from typing import Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Evidence(StrictModel):
    quote: str = Field(min_length=1)
    section: str | None = None
    explanation: str | None = None


class SongIdentity(StrictModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    artist: str = Field(min_length=1)


class Summary(StrictModel):
    overview: str
    key_insights: list[str]


TechniqueCategory = Literal[
    "connection",
    "modification",
    "repetition",
    "viewpoint",
    "abstraction_move",
    "wording",
    "sound",
    "structure",
    "rhetoric",
    "other",
]


class Technique(StrictModel):
    name: str = Field(min_length=1)
    category: TechniqueCategory
    description: str
    why_it_works: str
    evidence: list[Evidence] = Field(min_length=1)
    reuse_hint: str
    tags: list[str]


class ExpressionPattern(StrictModel):
    expression: str = Field(min_length=1)
    description: str
    effect: str
    evidence: list[Evidence] = Field(min_length=1)
    reuse_hint: str
    tags: list[str]


class NotablePhrase(StrictModel):
    phrase: str = Field(min_length=1)
    section: str | None = None
    description: str
    reuse_hint: str
    tags: list[str]


class ExpressionPatterns(StrictModel):
    sentence_endings: list[ExpressionPattern]
    connections: list[ExpressionPattern]
    modifiers: list[ExpressionPattern]
    notable_phrases: list[NotablePhrase]


class MotifElement(StrictModel):
    text: str = Field(min_length=1)
    section: str | None = None
    note: str | None = None


class Motif(StrictModel):
    name: str = Field(min_length=1)
    elements: list[MotifElement] = Field(min_length=1)
    development: str
    shared_principle: str
    function: str


class Structure(StrictModel):
    overview: str
    repetition_and_variation: str
    viewpoint_flow: str
    abstract_concrete_flow: str


class Takeaway(StrictModel):
    title: str = Field(min_length=1)
    description: str
    how_to_use: str
    avoid_copying: str


class ResearchAnalysisV02(StrictModel):
    schema_version: Literal["0.2"]
    song: SongIdentity
    summary: Summary
    techniques: list[Technique]
    expression_patterns: ExpressionPatterns
    motifs: list[Motif]
    structure: Structure
    takeaways: list[Takeaway] = Field(max_length=5)


ConstructionKind = Literal[
    "connection",
    "comparison",
    "condition",
    "negation",
    "word_order",
    "modification",
    "repetition",
    "other",
]


class Construction(StrictModel):
    expression: str = Field(min_length=1)
    kind: ConstructionKind
    description: str = Field(min_length=1)
    effect: str = Field(min_length=1)
    evidence: list[Evidence] = Field(min_length=1)
    reuse_hint: str = Field(min_length=1)
    tags: list[str]


class SentenceEndingV03(StrictModel):
    expression: str = Field(min_length=1)
    description: str = Field(min_length=1)
    effect: str = Field(min_length=1)
    evidence: list[Evidence] = Field(min_length=1)
    reuse_hint: str = Field(min_length=1)
    tags: list[str]


class PhraseV03(StrictModel):
    phrase: str = Field(min_length=1)
    section: str | None = None
    description: str = Field(min_length=1)
    reuse_hint: str = Field(min_length=1)
    tags: list[str]


class TechniqueV03(Technique):
    description: str = Field(min_length=1)
    why_it_works: str = Field(min_length=1)
    reuse_hint: str = Field(min_length=1)


class ResearchAnalysisV03(StrictModel):
    schema_version: Literal["0.3"]
    song: SongIdentity
    techniques: list[TechniqueV03]
    constructions: list[Construction]
    sentence_endings: list[SentenceEndingV03]
    phrases: list[PhraseV03]


VALIDATORS: dict[str, type[BaseModel]] = {
    "0.2": ResearchAnalysisV02,
    "0.3": ResearchAnalysisV03,
}


class ResearchValidationFailure(ValueError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("\n".join(errors))


def _format_location(location: tuple[Any, ...]) -> str:
    result = "$"
    for part in location:
        result += f"[{part}]" if isinstance(part, int) else f".{part}"
    return result


ResearchAnalysis = Union[ResearchAnalysisV02, ResearchAnalysisV03]


def validate_research_analysis(payload: Any) -> ResearchAnalysis:
    if not isinstance(payload, dict):
        raise ResearchValidationFailure(["$: JSONの最上位はオブジェクトである必要があります。"])

    version = payload.get("schema_version")
    validator = VALIDATORS.get(version)
    if validator is None:
        shown = "未指定" if version is None else repr(version)
        raise ResearchValidationFailure([
            f"$.schema_version: {shown} は未対応です。現在は \"0.2\" と \"0.3\" を取り込めます。"
        ])

    try:
        validated = validator.model_validate(payload)
    except ValidationError as exc:
        errors = [
            f"{_format_location(error['loc'])}: {error['msg']}"
            for error in exc.errors(include_url=False)
        ]
        raise ResearchValidationFailure(errors) from exc

    return validated  # type: ignore[return-value]


def parse_and_validate_research_json(raw_json: str) -> ResearchAnalysis:
    try:
        payload = __import__("json").loads(raw_json)
    except ValueError as exc:
        raise ResearchValidationFailure([f"$: JSONとして読み取れません: {exc}"]) from exc
    return validate_research_analysis(payload)


def _evidence_examples(items: list[Evidence]) -> list[dict[str, Any]]:
    return [item.model_dump(exclude_none=True) for item in items]


def derive_research_items(analysis: ResearchAnalysis) -> list[dict[str, Any]]:
    """Create replaceable search rows. The validated analysis remains canonical."""
    rows: list[dict[str, Any]] = []

    if isinstance(analysis, ResearchAnalysisV03):
        return _derive_v03_items(analysis)

    for insight in analysis.summary.key_insights:
        rows.append({
            "item_type": "summary_insight",
            "category": None,
            "title": insight,
            "content": insight,
            "effect": None,
            "reuse_hint": None,
            "examples": [],
            "tags": [],
        })

    for item in analysis.techniques:
        rows.append({
            "item_type": "technique",
            "category": item.category,
            "title": item.name,
            "content": item.description,
            "effect": item.why_it_works or None,
            "reuse_hint": item.reuse_hint or None,
            "examples": _evidence_examples(item.evidence),
            "tags": item.tags,
        })

    expression_groups = (
        ("sentence_ending", analysis.expression_patterns.sentence_endings),
        ("connection", analysis.expression_patterns.connections),
        ("modifier", analysis.expression_patterns.modifiers),
    )
    for item_type, group in expression_groups:
        for item in group:
            rows.append({
                "item_type": item_type,
                "category": None,
                "title": item.expression,
                "content": item.description,
                "effect": item.effect or None,
                "reuse_hint": item.reuse_hint or None,
                "examples": _evidence_examples(item.evidence),
                "tags": item.tags,
            })

    for item in analysis.expression_patterns.notable_phrases:
        example = {"quote": item.phrase}
        if item.section:
            example["section"] = item.section
        rows.append({
            "item_type": "notable_phrase",
            "category": None,
            "title": item.phrase,
            "content": item.description,
            "effect": None,
            "reuse_hint": item.reuse_hint or None,
            "examples": [example],
            "tags": item.tags,
        })

    for motif in analysis.motifs:
        rows.append({
            "item_type": "motif",
            "category": motif.shared_principle or None,
            "title": motif.name,
            "content": motif.development,
            "effect": motif.function or None,
            "reuse_hint": None,
            "examples": [element.model_dump(exclude_none=True) for element in motif.elements],
            "tags": [],
        })

    structure_fields = {
        "overview": analysis.structure.overview,
        "repetition_and_variation": analysis.structure.repetition_and_variation,
        "viewpoint_flow": analysis.structure.viewpoint_flow,
        "abstract_concrete_flow": analysis.structure.abstract_concrete_flow,
    }
    for category, content in structure_fields.items():
        if content:
            rows.append({
                "item_type": "structure",
                "category": category,
                "title": category.replace("_", " "),
                "content": content,
                "effect": None,
                "reuse_hint": None,
                "examples": [],
                "tags": [],
            })

    for item in analysis.takeaways:
        rows.append({
            "item_type": "takeaway",
            "category": None,
            "title": item.title,
            "content": item.description,
            "effect": item.avoid_copying or None,
            "reuse_hint": item.how_to_use or None,
            "examples": [],
            "tags": [],
        })

    return rows


def _derive_v03_items(analysis: ResearchAnalysisV03) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for item in analysis.techniques:
        rows.append({
            "item_type": "technique",
            "category": item.category,
            "title": item.name,
            "content": item.description,
            "effect": item.why_it_works,
            "reuse_hint": item.reuse_hint,
            "examples": _evidence_examples(item.evidence),
            "tags": item.tags,
        })

    for item in analysis.constructions:
        rows.append({
            "item_type": "modifier" if item.kind == "modification" else "connection",
            "category": item.kind,
            "title": item.expression,
            "content": item.description,
            "effect": item.effect,
            "reuse_hint": item.reuse_hint,
            "examples": _evidence_examples(item.evidence),
            "tags": item.tags,
        })

    for item in analysis.sentence_endings:
        rows.append({
            "item_type": "sentence_ending",
            "category": None,
            "title": item.expression,
            "content": item.description,
            "effect": item.effect,
            "reuse_hint": item.reuse_hint,
            "examples": _evidence_examples(item.evidence),
            "tags": item.tags,
        })

    for item in analysis.phrases:
        example: dict[str, Any] = {"quote": item.phrase}
        if item.section:
            example["section"] = item.section
        rows.append({
            "item_type": "notable_phrase",
            "category": None,
            "title": item.phrase,
            "content": item.description,
            "effect": None,
            "reuse_hint": item.reuse_hint,
            "examples": [example],
            "tags": item.tags,
        })

    return rows
