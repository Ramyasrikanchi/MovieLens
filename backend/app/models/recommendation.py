from dataclasses import dataclass, field


@dataclass(frozen=True)
class WhyRecommended:
    shared_genres: list[str] = field(default_factory=list)
    shared_keywords: list[str] = field(default_factory=list)
    shared_cast: list[str] = field(default_factory=list)
    shared_director: bool = False


@dataclass(frozen=True)
class MovieProfile:
    tmdb_id: int | None
    title: str
    media_type: str
    overview: str | None = None
    poster_path: str | None = None
    release_date: str | None = None
    release_year: int | None = None
    vote_average: float | None = None
    genres: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    cast: list[str] = field(default_factory=list)
    director: list[str] = field(default_factory=list)
    top_genres: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Recommendation:
    title: str
    similarity_score: float
    poster_path: str | None = None
    release_date: str | None = None
    release_year: int | None = None
    media_type: str | None = None
    vote_average: float | None = None
    genres: list[str] = field(default_factory=list)
    top_genres: list[str] = field(default_factory=list)
    overview_snippet: str | None = None
    why_recommended: WhyRecommended = field(default_factory=WhyRecommended)
    tmdb_id: int | None = None


@dataclass(frozen=True)
class RecommendationResult:
    movie: str
    source: str
    selected_movie: MovieProfile | None
    recommendations: list[Recommendation]
