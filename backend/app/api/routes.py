import logging

from fastapi import APIRouter, HTTPException, Path, Query, status
from app.api.schemas import (
    CandidateOption,
    MovieProfileSchema,
    ErrorResponse,
    HealthResponse,
    RecommendationItem,
    RecommendationResponse,
    WhyRecommendedSchema,
    SearchResponse,
)
from app.services import get_recommender
from app.services.tmdb_service import get_tmdb_service
from app.services.tmdb_service import (
    TMDBLookupError,
    TMDBNetworkError,
    TMDBNoResultsError,
    TMDBServerError,
    TMDBTimeoutError,
)


logger = logging.getLogger(__name__)
router = APIRouter(tags=["recommendations"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Check API and model health",
)
def health() -> HealthResponse:
    recommender = get_recommender()
    return HealthResponse(status="healthy", model=recommender.model_name)


def map_tmdb_error(exc: TMDBLookupError) -> HTTPException:
    if isinstance(exc, TMDBNoResultsError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, TMDBNetworkError):
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    if isinstance(exc, TMDBTimeoutError):
        return HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc))
    if isinstance(exc, TMDBServerError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def recommendation_response(result) -> RecommendationResponse:
    response = RecommendationResponse(
        movie=result.movie,
        source=result.source,
        selected_movie=_movie_profile_schema(result.selected_movie) if result.selected_movie else None,
        recommendations=[
            RecommendationItem(
                title=item.title,
                score=round(item.similarity_score, 4),
                poster_path=item.poster_path,
                release_date=item.release_date,
                release_year=item.release_year,
                media_type=item.media_type,
                vote_average=item.vote_average,
                genres=item.genres,
                top_genres=item.top_genres,
                overview_snippet=item.overview_snippet,
                tmdb_id=item.tmdb_id,
                why_recommended=_why_schema(item.why_recommended),
            )
            for item in result.recommendations
        ],
    )
    logger.info(
        "[Recommendation API]\nmovie=%s\nsource=%s\nselectedMovieLoaded=%s\nrecommendationCount=%s",
        response.movie,
        response.source,
        response.selected_movie is not None,
        len(response.recommendations),
    )
    return response


def _why_schema(why) -> WhyRecommendedSchema:
    return WhyRecommendedSchema(
        shared_genres=why.shared_genres,
        shared_keywords=why.shared_keywords,
        shared_cast=why.shared_cast,
        shared_director=why.shared_director,
    )


def _movie_profile_schema(profile) -> MovieProfileSchema:
    return MovieProfileSchema(
        tmdb_id=profile.tmdb_id,
        title=profile.title,
        media_type=profile.media_type,
        overview=profile.overview,
        poster_path=profile.poster_path,
        release_date=profile.release_date,
        release_year=profile.release_year,
        vote_average=profile.vote_average,
        genres=profile.genres,
        keywords=profile.keywords,
        cast=profile.cast,
        director=profile.director,
        top_genres=profile.top_genres,
    )


@router.get(
    "/search",
    response_model=SearchResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "No TMDB results"},
        status.HTTP_502_BAD_GATEWAY: {"model": ErrorResponse, "description": "TMDB server error"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "TMDB network failure"},
        status.HTTP_504_GATEWAY_TIMEOUT: {"model": ErrorResponse, "description": "TMDB request timeout"},
    },
    summary="Search TMDB candidates",
)
def search_tmdb(q: str = Query(..., min_length=1, description="Movie or TV search query")) -> SearchResponse:
    tmdb_service = get_tmdb_service()
    try:
        candidates = tmdb_service.search(q)
    except TMDBLookupError as exc:
        raise map_tmdb_error(exc) from exc

    return SearchResponse(
        query=q,
        results=[
            CandidateOption(
                tmdb_id=candidate.tmdb_id,
                title=candidate.title,
                media_type=candidate.media_type,
                confidence=candidate.confidence,
                release_date=candidate.release_date,
                poster_path=candidate.poster_path,
                vote_average=candidate.vote_average,
            )
            for candidate in candidates
        ],
    )


@router.get(
    "/recommend/local/{movie_title}",
    response_model=RecommendationResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "Movie not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected server error"},
    },
    summary="Get local movie recommendations",
)
def recommend_local_movie(
    movie_title: str = Path(..., min_length=1, description="Movie title to recommend from"),
    top_n: int = Query(default=10, ge=1, le=50, description="Number of recommendations to return"),
) -> RecommendationResponse:
    recommender = get_recommender()

    try:
        recommendations = recommender.recommend(movie_title=movie_title, top_n=top_n)
        selected_movie = recommender.get_movie_profile_by_title(movie_title)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected local recommendation failure for movie_title=%s", movie_title)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected recommendation failure.",
        ) from exc

    return RecommendationResponse(
        movie=movie_title,
        source="local",
        selected_movie=_movie_profile_schema(selected_movie),
        recommendations=[
            RecommendationItem(
                title=item.title,
                score=round(item.similarity_score, 4),
                poster_path=item.poster_path,
                release_date=item.release_date,
                release_year=item.release_year,
                media_type=item.media_type,
                vote_average=item.vote_average,
                genres=item.genres,
                top_genres=item.top_genres,
                overview_snippet=item.overview_snippet,
                tmdb_id=item.tmdb_id,
                why_recommended=_why_schema(item.why_recommended),
            )
            for item in recommendations
        ],
    )


@router.get(
    "/recommend/tmdb/{tmdb_id}",
    response_model=RecommendationResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "TMDB content not found"},
        status.HTTP_502_BAD_GATEWAY: {"model": ErrorResponse, "description": "TMDB server error"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "TMDB network failure"},
        status.HTTP_504_GATEWAY_TIMEOUT: {"model": ErrorResponse, "description": "TMDB request timeout"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected server error"},
    },
    summary="Get recommendations for TMDB content",
)
def recommend_tmdb_content(
    tmdb_id: int = Path(..., ge=1, description="TMDB movie or TV id"),
    media_type: str = Query(default="movie", pattern="^(movie|tv)$", description="TMDB media type from /search"),
    top_n: int = Query(default=10, ge=1, le=50, description="Number of recommendations to return"),
) -> RecommendationResponse:
    recommender = get_recommender()
    logger.info(
        "[Recommendation Request]\ntmdbId=%s\nmediaType=%s\ntopN=%s",
        tmdb_id,
        media_type,
        top_n,
    )
    try:
        result = recommender.recommend_external_by_tmdb_id(
            tmdb_id=tmdb_id,
            media_type=media_type,
            top_n=top_n,
        )
    except TMDBLookupError as exc:
        raise map_tmdb_error(exc) from exc
    except Exception as exc:
        logger.exception("Unexpected TMDB recommendation failure for tmdb_id=%s", tmdb_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected recommendation failure.",
        ) from exc

    return recommendation_response(result)
