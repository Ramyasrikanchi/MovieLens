import logging
import os
import re
import time
from dataclasses import dataclass

import requests
from rapidfuzz import fuzz
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.utils.feature_engineering import build_baseline_tags


logger = logging.getLogger(__name__)


class TMDBLookupError(RuntimeError):
    pass


class TMDBNoResultsError(TMDBLookupError):
    pass


class TMDBNetworkError(TMDBLookupError):
    pass


class TMDBTimeoutError(TMDBLookupError):
    pass


class TMDBServerError(TMDBLookupError):
    pass


@dataclass(frozen=True)
class TMDBCandidate:
    tmdb_id: int
    title: str
    media_type: str
    confidence: int
    release_date: str | None = None
    poster_path: str | None = None
    vote_average: float | None = None


@dataclass(frozen=True)
class TMDBMovieMetadata:
    tmdb_id: int | None
    title: str
    media_type: str
    overview: str
    genres: list[str]
    keywords: list[str]
    cast: list[str]
    director: list[str]
    tags: str
    poster_path: str | None = None
    release_date: str | None = None
    vote_average: float | None = None


class TMDBService:
    def __init__(
        self,
        api_key: str | None = None,
        bearer_token: str | None = None,
        base_url: str = "https://api.themoviedb.org/3",
        timeout: tuple[float, float] = (5.0, 10.0),
        minimum_confidence: int = 70,
        ambiguity_delta: int = 3,
        session: requests.Session | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("TMDB_API_KEY")
        self.bearer_token = bearer_token or os.getenv("TMDB_READ_ACCESS_TOKEN") or os.getenv("TMDB_BEARER_TOKEN")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.minimum_confidence = minimum_confidence
        self.ambiguity_delta = ambiguity_delta
        self.session = session or get_tmdb_http_session()
        self._cache: dict[str, TMDBMovieMetadata] = {}
        self._card_cache: dict[str, TMDBMovieMetadata | None] = {}

    def search(self, query: str) -> list[TMDBCandidate]:
        normalized_query = query.strip()
        if not normalized_query:
            raise TMDBNoResultsError("Search query is required.")

        payload = self._get_json("/search/multi", {"query": normalized_query, "include_adult": "false"})
        candidates = self._score_candidates(normalized_query, payload.get("results", []))
        if not candidates:
            self._log_lookup_diagnostics(normalized_query, None, 0, None, "not_found")
            raise TMDBNoResultsError(f"No TMDB results found for '{query}'.")

        self._log_lookup_diagnostics(normalized_query, None, len(candidates), None, "return_candidates")
        return candidates

    def get_metadata_by_id(self, tmdb_id: int, media_type: str = "movie") -> TMDBMovieMetadata:
        if media_type not in {"movie", "tv"}:
            raise TMDBNoResultsError("TMDB media_type must be 'movie' or 'tv'.")

        cache_key = f"{media_type}:{tmdb_id}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        details = self._get_json(
            f"/{media_type}/{tmdb_id}",
            {"append_to_response": "credits,keywords"},
        )

        metadata = self._build_metadata(details=details, media_type=media_type)
        self._cache[cache_key] = metadata
        return metadata

    def lookup_title_card(self, title: str, preferred_media_type: str | None = None) -> TMDBMovieMetadata | None:
        normalized_title = title.strip()
        if not normalized_title:
            return None

        cache_key = f"{preferred_media_type or 'any'}:{normalized_title.casefold()}"
        if cache_key in self._card_cache:
            return self._card_cache[cache_key]

        try:
            payload = self._get_json("/search/multi", {"query": normalized_title, "include_adult": "false"})
        except TMDBLookupError:
            self._card_cache[cache_key] = None
            return None

        candidates = self._score_candidates(normalized_title, payload.get("results", []))
        if preferred_media_type:
            preferred = [candidate for candidate in candidates if candidate.media_type == preferred_media_type]
            if preferred:
                candidates = preferred

        if not candidates:
            self._card_cache[cache_key] = None
            return None

        candidate = candidates[0]
        try:
            metadata = self.get_metadata_by_id(candidate.tmdb_id, candidate.media_type)
        except TMDBLookupError:
            self._card_cache[cache_key] = None
            return None

        self._card_cache[cache_key] = metadata
        return metadata

    def _score_candidates(self, movie_title: str, results: list[dict]) -> list[TMDBCandidate]:
        candidates = []
        for result in results:
            media_type = result.get("media_type")
            if media_type not in {"movie", "tv"}:
                continue

            title = self._result_title(result)
            tmdb_id = result.get("id")
            if not title or not tmdb_id:
                continue

            candidates.append(
                TMDBCandidate(
                    tmdb_id=int(tmdb_id),
                    title=title,
                    media_type=media_type,
                    confidence=self._title_confidence(movie_title, title),
                    release_date=result.get("release_date") or result.get("first_air_date"),
                    poster_path=result.get("poster_path"),
                    vote_average=result.get("vote_average"),
                )
            )

        return sorted(candidates, key=lambda item: item.confidence, reverse=True)

    def _title_confidence(self, input_title: str, candidate_title: str) -> int:
        input_key = self._match_key(input_title)
        candidate_key = self._match_key(candidate_title)
        scores = [
            fuzz.WRatio(input_title, candidate_title),
            fuzz.ratio(input_key, candidate_key),
        ]
        return int(round(max(scores)))

    def _match_key(self, title: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", title.casefold())

    def _result_title(self, result: dict) -> str:
        return (
            result.get("title")
            or result.get("name")
            or result.get("original_title")
            or result.get("original_name")
            or ""
        )

    def _get_json(self, path: str, params: dict[str, str] | None = None) -> dict:
        if not self.api_key and not self.bearer_token:
            raise TMDBLookupError("TMDB lookup requires TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.")

        query_params = dict(params or {})
        headers = {"Accept": "application/json"}
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        else:
            query_params["api_key"] = self.api_key or ""

        url = f"{self.base_url}{path}"
        started_at = time.perf_counter()
        status_code: int | str = "network_error"
        try:
            response = self.session.get(url, params=query_params, headers=headers, timeout=self.timeout)
            status_code = response.status_code
            response.raise_for_status()
            return response.json()
        except requests.Timeout as exc:
            status_code = "timeout"
            raise TMDBTimeoutError(f"TMDB lookup timed out for endpoint {path}.") from exc
        except requests.HTTPError as exc:
            response = exc.response
            status = response.status_code if response is not None else None
            if status in {401, 403}:
                raise TMDBLookupError("TMDB lookup failed: invalid or unauthorized API credentials.") from exc
            if status == 404:
                raise TMDBNoResultsError("TMDB lookup failed: movie metadata was not found.") from exc
            if status in {429, 500, 502, 503, 504}:
                raise TMDBServerError(f"TMDB server error while calling endpoint {path}.") from exc
            raise TMDBLookupError(f"TMDB lookup failed with HTTP status {status}.") from exc
        except (requests.ConnectionError, requests.RequestException) as exc:
            raise TMDBNetworkError(f"TMDB network failure while calling endpoint {path}.") from exc
        except ValueError as exc:
            raise TMDBServerError(f"TMDB returned invalid JSON for endpoint {path}.") from exc
        finally:
            duration_ms = int(round((time.perf_counter() - started_at) * 1000))
            logger.info(
                "[TMDB]\nMethod=GET\nEndpoint=%s\nStatus=%s\nDurationMs=%s",
                path,
                status_code,
                duration_ms,
            )

    def _log_lookup_diagnostics(
        self,
        query: str,
        top_n: int | None,
        candidate_count: int,
        selected: str | None,
        action: str,
    ) -> None:
        logger.info(
            '[TMDB Lookup]\nQuery="%s"\nTopN=%s\nCandidates=%s\nSelected="%s"\nAction=%s',
            query,
            top_n if top_n is not None else "None",
            candidate_count,
            selected if selected else "None",
            action,
        )

    def _build_metadata(self, details: dict, media_type: str) -> TMDBMovieMetadata:
        title = details.get("title") or details.get("name") or details.get("original_title") or details.get("original_name")
        overview = details.get("overview") or ""
        if not title or not overview:
            raise TMDBLookupError("TMDB metadata is missing title or overview.")

        genres = [str(item["name"]).strip() for item in details.get("genres", []) if item.get("name")]
        keywords_payload = details.get("keywords", {})
        keyword_names = [
            str(item["name"]).strip()
            for item in keywords_payload.get("keywords", keywords_payload.get("results", []))
            if item.get("name")
        ]
        credits = details.get("credits", {})
        cast = [
            str(item["name"]).strip()
            for item in credits.get("cast", [])[:3]
            if item.get("name")
        ]
        director = [
            str(item["name"]).strip()
            for item in credits.get("crew", [])
            if item.get("job") == "Director" and item.get("name")
        ][:1]
        if not director and media_type == "tv":
            director = [
                str(item["name"]).strip()
                for item in details.get("created_by", [])
                if item.get("name")
            ][:1]

        tags = build_baseline_tags(
            overview=overview,
            genres=genres,
            keywords=keyword_names,
            cast=cast,
            director=director,
        )
        return TMDBMovieMetadata(
            tmdb_id=int(details.get("id")) if details.get("id") is not None else None,
            title=title,
            media_type=media_type,
            overview=overview,
            genres=genres,
            keywords=keyword_names,
            cast=cast,
            director=director,
            tags=tags,
            poster_path=details.get("poster_path"),
            release_date=details.get("release_date") or details.get("first_air_date"),
            vote_average=details.get("vote_average"),
        )


_tmdb_service: TMDBService | None = None
_tmdb_http_session: requests.Session | None = None


def get_tmdb_http_session() -> requests.Session:
    global _tmdb_http_session
    if _tmdb_http_session is None:
        retry = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({"GET"}),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
        session = requests.Session()
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        session.headers.update(
            {
                "Accept": "application/json",
                "Connection": "keep-alive",
                "User-Agent": "MovieLens/0.1.0",
            }
        )
        _tmdb_http_session = session
    return _tmdb_http_session


def get_tmdb_service() -> TMDBService:
    global _tmdb_service
    if _tmdb_service is None:
        _tmdb_service = TMDBService()
    return _tmdb_service
