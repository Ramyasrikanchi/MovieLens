from pydantic import BaseModel, Field


class WhyRecommendedSchema(BaseModel):
    shared_genres: list[str] = Field(default_factory=list)
    shared_keywords: list[str] = Field(default_factory=list)
    shared_cast: list[str] = Field(default_factory=list)
    shared_director: bool = False


class MovieProfileSchema(BaseModel):
    tmdb_id: int | None = None
    title: str
    media_type: str
    overview: str | None = None
    poster_path: str | None = None
    release_date: str | None = None
    release_year: int | None = None
    vote_average: float | None = None
    genres: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    cast: list[str] = Field(default_factory=list)
    director: list[str] = Field(default_factory=list)
    top_genres: list[str] = Field(default_factory=list)


class RecommendationItem(BaseModel):
    title: str
    score: float = Field(..., ge=0.0, le=1.0)
    poster_path: str | None = None
    release_date: str | None = None
    release_year: int | None = None
    media_type: str | None = None
    vote_average: float | None = None
    genres: list[str] = Field(default_factory=list)
    top_genres: list[str] = Field(default_factory=list)
    overview_snippet: str | None = None
    tmdb_id: int | None = None
    why_recommended: WhyRecommendedSchema = Field(default_factory=WhyRecommendedSchema)


class RecommendationResponse(BaseModel):
    movie: str
    source: str
    selected_movie: MovieProfileSchema | None = None
    recommendations: list[RecommendationItem]


class HealthResponse(BaseModel):
    status: str
    model: str


class CandidateOption(BaseModel):
    tmdb_id: int
    title: str
    media_type: str
    confidence: int
    release_date: str | None = None
    poster_path: str | None = None
    vote_average: float | None = None


class CandidateOptionsResponse(BaseModel):
    detail: str
    candidates: list[CandidateOption]


class SearchResponse(BaseModel):
    query: str
    results: list[CandidateOption]


class ErrorResponse(BaseModel):
    detail: str
