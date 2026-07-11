import logging
from collections.abc import Callable
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_CONFIGS
from app.models.recommendation import Recommendation, RecommendationResult
from app.models.recommendation import MovieProfile, WhyRecommended
from app.services.tmdb_service import TMDBMovieMetadata, TMDBService, get_tmdb_service
from app.utils.feature_engineering import (
    build_weighted_tags,
    extract_director,
    extract_names,
    extract_raw_director,
    extract_raw_names,
    extract_raw_top_cast,
    extract_top_cast,
    normalize_token,
)
from app.utils.paths import (
    MODEL_DIR,
    PROCESSED_MOVIES_PATH,
)


logger = logging.getLogger(__name__)
_default_recommender: "MovieRecommender | None" = None


class MovieNotFoundError(ValueError):
    pass


class MovieRecommender:
    def __init__(
        self,
        data_path: Path = PROCESSED_MOVIES_PATH,
        model_name: str = DEFAULT_MODEL,
        text_column: str | None = None,
        data_transformer: Callable[[pd.DataFrame], pd.DataFrame] | None = None,
        vectorizer_path: Path | None = None,
        similarity_path: Path | None = None,
        tmdb_service: TMDBService | None = None,
    ) -> None:
        if model_name not in MODEL_CONFIGS:
            available_models = ", ".join(AVAILABLE_MODELS)
            raise ValueError(f"Unknown recommendation model '{model_name}'. Available models: {available_models}")

        model_config = MODEL_CONFIGS[model_name]
        self.data_path = data_path
        self.model_name = model_name
        self.text_column = text_column or model_config.text_column
        self.data_transformer = data_transformer
        self.vectorizer_path = vectorizer_path or model_config.vectorizer_path
        self.similarity_path = similarity_path or model_config.similarity_path
        self.movies: pd.DataFrame | None = None
        self.vectorizer: TfidfVectorizer | None = None
        self.similarity_matrix = None
        self.local_tfidf_matrix = None
        self.tmdb_service = tmdb_service or get_tmdb_service()
        self._model_logged = False

    def load_data(self) -> pd.DataFrame:
        if not self.data_path.exists():
            raise FileNotFoundError(f"Processed movies file not found: {self.data_path}")

        movies = pd.read_csv(self.data_path)
        required_columns = {"movie_id", "title"}
        if self.data_transformer is None:
            required_columns.add(self.text_column)
        missing_columns = required_columns.difference(movies.columns)
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise ValueError(f"Processed movies file is missing columns: {missing}")

        if self.data_transformer is not None:
            movies = self.data_transformer(movies)

        self.movies = movies.dropna(subset=["movie_id", "title", self.text_column]).reset_index(drop=True)
        if "overview" not in self.movies.columns:
            self.movies["overview"] = ""
        return self.movies

    def train(self) -> None:
        movies = self.movies if self.movies is not None else self.load_data()

        self.vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = self.vectorizer.fit_transform(movies[self.text_column])
        self.similarity_matrix = cosine_similarity(tfidf_matrix)

    def load_artifacts(self) -> None:
        if not self.vectorizer_path.exists():
            raise FileNotFoundError(f"TF-IDF vectorizer artifact not found: {self.vectorizer_path}")
        if not self.similarity_path.exists():
            raise FileNotFoundError(f"Similarity matrix artifact not found: {self.similarity_path}")

        self.vectorizer = joblib.load(self.vectorizer_path)
        self.similarity_matrix = joblib.load(self.similarity_path)
        self._build_local_tfidf_matrix()

        if not self._model_logged:
            logger.info("[MovieLens] Loaded recommendation model: %s", self.model_name)
            self._model_logged = True

    def _build_local_tfidf_matrix(self) -> None:
        if self.vectorizer is None:
            raise RuntimeError("Load the TF-IDF vectorizer before building local vectors.")
        movies = self.movies if self.movies is not None else self.load_data()
        self.local_tfidf_matrix = self.vectorizer.transform(movies[self.text_column])

    def save_artifacts(self) -> None:
        if self.vectorizer is None or self.similarity_matrix is None:
            raise RuntimeError("Train the recommender before saving artifacts.")

        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.vectorizer, self.vectorizer_path)
        joblib.dump(self.similarity_matrix, self.similarity_path)

    def _release_year_from_date(self, release_date: str | None) -> int | None:
        if not release_date:
            return None
        try:
            return int(str(release_date).split("-", maxsplit=1)[0])
        except (TypeError, ValueError):
            return None

    def recommend(self, movie_title: str, top_n: int = 10) -> list[Recommendation]:
        if self.movies is None:
            self.load_data()
        if self.similarity_matrix is None:
            self.load_artifacts()

        assert self.movies is not None
        assert self.similarity_matrix is not None

        normalized_title = movie_title.strip().casefold()
        title_matches = self.movies[self.movies["title"].str.casefold() == normalized_title]
        if title_matches.empty:
            raise MovieNotFoundError(f"Movie not found: {movie_title}")

        movie_index = int(title_matches.index[0])
        scores = list(enumerate(self.similarity_matrix[movie_index]))
        selected_row = self.movies.iloc[movie_index]
        selected_movie = self._build_movie_profile(selected_row, default_media_type="movie", tmdb_id=None)
        return self._rank_recommendations(
            scores=scores,
            top_n=top_n,
            excluded_index=movie_index,
            selected_row=selected_row,
            selected_movie=selected_movie,
        )

    def get_movie_profile_by_title(self, movie_title: str) -> MovieProfile:
        if self.movies is None:
            self.load_data()

        assert self.movies is not None
        normalized_title = movie_title.strip().casefold()
        title_matches = self.movies[self.movies["title"].str.casefold() == normalized_title]
        if title_matches.empty:
            raise MovieNotFoundError(f"Movie not found: {movie_title}")

        movie_index = int(title_matches.index[0])
        return self._build_movie_profile(self.movies.iloc[movie_index], default_media_type="movie", tmdb_id=None)

    def recommend_external_by_tmdb_id(
        self,
        tmdb_id: int,
        media_type: str = "movie",
        top_n: int = 10,
    ) -> RecommendationResult:
        if self.movies is None:
            self.load_data()
        if self.vectorizer is None or self.local_tfidf_matrix is None:
            self.load_artifacts()

        assert self.vectorizer is not None
        assert self.local_tfidf_matrix is not None

        metadata = self.tmdb_service.get_metadata_by_id(tmdb_id=tmdb_id, media_type=media_type)
        external_vector = self.vectorizer.transform([metadata.tags])
        scores = list(enumerate(cosine_similarity(external_vector, self.local_tfidf_matrix)[0]))
        selected_movie = MovieProfile(
            tmdb_id=tmdb_id,
            title=metadata.title,
            media_type=metadata.media_type,
            overview=metadata.overview,
            poster_path=metadata.poster_path,
            release_date=metadata.release_date,
            release_year=self._release_year_from_date(metadata.release_date),
            vote_average=metadata.vote_average,
            genres=metadata.genres,
            keywords=metadata.keywords,
            cast=metadata.cast,
            director=metadata.director,
            top_genres=metadata.genres[:3],
        )
        recommendations = self._rank_recommendations(
            scores=scores,
            top_n=top_n,
            selected_movie=selected_movie,
        )
        return RecommendationResult(movie=metadata.title, source="external", selected_movie=selected_movie, recommendations=recommendations)

    def _rank_recommendations(
        self,
        scores: list[tuple[int, float]],
        top_n: int,
        excluded_index: int | None = None,
        selected_row: pd.Series | None = None,
        selected_movie: MovieProfile | None = None,
    ) -> list[Recommendation]:
        assert self.movies is not None
        ranked_scores = sorted(scores, key=lambda item: item[1], reverse=True)

        recommendations = []
        for index, score in ranked_scores:
            if index == excluded_index:
                continue
            row = self.movies.iloc[index]
            movie_profile = self._build_movie_profile(row, default_media_type="movie", tmdb_id=None)
            explanation = self._build_why_recommended(selected_row, row, selected_movie)
            enrichment = self._lookup_recommendation_metadata(movie_profile.title, movie_profile.media_type)
            recommendations.append(
                Recommendation(
                    title=movie_profile.title,
                    similarity_score=float(score),
                    poster_path=enrichment.poster_path if enrichment and enrichment.poster_path else movie_profile.poster_path,
                    release_date=enrichment.release_date if enrichment and enrichment.release_date else movie_profile.release_date,
                    release_year=self._release_year_from_date(
                        enrichment.release_date if enrichment and enrichment.release_date else movie_profile.release_date
                    ),
                    media_type=(enrichment.media_type if enrichment else movie_profile.media_type),
                    vote_average=enrichment.vote_average if enrichment and enrichment.vote_average is not None else movie_profile.vote_average,
                    genres=movie_profile.genres,
                    top_genres=movie_profile.top_genres,
                    overview_snippet=self._overview_snippet(movie_profile.overview),
                    why_recommended=explanation,
                    tmdb_id=enrichment.tmdb_id if enrichment and enrichment.tmdb_id is not None else movie_profile.tmdb_id,
                )
            )
            if len(recommendations) == top_n:
                break

        return recommendations

    def _build_movie_profile(
        self,
        row: pd.Series,
        default_media_type: str,
        tmdb_id: int | None,
    ) -> MovieProfile:
        genres = self._extract_row_genres(row)
        keywords = self._extract_row_keywords(row)
        cast = self._extract_row_cast(row)
        director = self._extract_row_director(row)
        overview = str(row.get("overview", "")).strip() or None
        return MovieProfile(
            tmdb_id=tmdb_id,
            title=str(row.get("title", "")).strip(),
            media_type=default_media_type,
            overview=overview,
            release_date=str(row.get("release_date", "")).strip() or None,
            release_year=self._release_year_from_date(str(row.get("release_date", "")).strip() or None),
            genres=genres,
            keywords=keywords,
            cast=cast,
            director=director,
            top_genres=genres[:3],
        )

    def _extract_row_genres(self, row: pd.Series) -> list[str]:
        return [name.strip() for name in extract_raw_names(row.get("genres")) if name.strip()]

    def _extract_row_keywords(self, row: pd.Series) -> list[str]:
        return [name.strip() for name in extract_raw_names(row.get("keywords")) if name.strip()]

    def _extract_row_cast(self, row: pd.Series) -> list[str]:
        return [name.strip() for name in extract_raw_top_cast(row.get("cast")) if name.strip()]

    def _extract_row_director(self, row: pd.Series) -> list[str]:
        raw_director = row.get("director")
        if isinstance(raw_director, str) and raw_director.strip():
            return [raw_director.strip()]
        return [name.strip() for name in extract_raw_director(row.get("crew")) if name.strip()]

    def _build_why_recommended(
        self,
        selected_row: pd.Series | None,
        candidate_row: pd.Series,
        selected_movie: MovieProfile | None = None,
    ) -> WhyRecommended:
        if selected_row is None and selected_movie is None:
            return WhyRecommended()

        if selected_row is not None:
            selected_genres = self._extract_row_genres(selected_row)
            selected_keywords = self._extract_row_keywords(selected_row)
            selected_cast = self._extract_row_cast(selected_row)
            selected_director_list = self._extract_row_director(selected_row)
        else:
            assert selected_movie is not None
            selected_genres = selected_movie.genres
            selected_keywords = selected_movie.keywords
            selected_cast = selected_movie.cast
            selected_director_list = selected_movie.director

        selected_director = {normalize_token(item) for item in selected_director_list}
        candidate_director = {normalize_token(item) for item in self._extract_row_director(candidate_row)}

        return WhyRecommended(
            shared_genres=self._shared_display_values(selected_genres, self._extract_row_genres(candidate_row)),
            shared_keywords=self._shared_display_values(selected_keywords, self._extract_row_keywords(candidate_row)),
            shared_cast=self._shared_display_values(selected_cast, self._extract_row_cast(candidate_row)),
            shared_director=bool(selected_director and candidate_director and selected_director.intersection(candidate_director)),
        )

    def _shared_display_values(self, left: list[str], right: list[str]) -> list[str]:
        right_lookup = {normalize_token(item): item for item in right}
        shared: list[str] = []
        for item in left:
            key = normalize_token(item)
            if key in right_lookup and right_lookup[key] not in shared:
                shared.append(right_lookup[key])
        return shared

    def _overview_snippet(self, overview: str | None, limit: int = 180) -> str | None:
        if not overview:
            return None
        snippet = overview.strip()
        if len(snippet) <= limit:
            return snippet
        return snippet[: limit - 3].rstrip() + "..."

    def _lookup_recommendation_metadata(self, title: str, media_type: str | None) -> TMDBMovieMetadata | None:
        try:
            return self.tmdb_service.lookup_title_card(title, preferred_media_type=media_type)
        except Exception:
            logger.debug("Best-effort TMDB enrichment failed for title=%s", title, exc_info=True)
            return None


def get_recommender() -> MovieRecommender:
    global _default_recommender
    if _default_recommender is None:
        _default_recommender = MovieRecommender()
        _default_recommender.load_data()
        _default_recommender.load_artifacts()
    return _default_recommender


def recommend(movie_title: str, top_n: int = 10) -> list[Recommendation]:
    recommender = get_recommender()
    return recommender.recommend(movie_title=movie_title, top_n=top_n)


def recommend_external_by_tmdb_id(tmdb_id: int, media_type: str = "movie", top_n: int = 10) -> RecommendationResult:
    recommender = get_recommender()
    return recommender.recommend_external_by_tmdb_id(tmdb_id=tmdb_id, media_type=media_type, top_n=top_n)


def build_weighted_features_frame(movies: pd.DataFrame) -> pd.DataFrame:
    frame = movies.copy()
    frame["genres"] = frame["genres"].apply(extract_names)
    frame["keywords"] = frame["keywords"].apply(extract_names)
    frame["cast"] = frame["cast"].apply(extract_top_cast)
    frame["director"] = frame["director"].apply(extract_director)
    frame["weighted_tags"] = frame.apply(
        lambda row: build_weighted_tags(
            overview=row["overview"],
            genres=row["genres"],
            keywords=row["keywords"],
            cast=row["cast"],
            director=row["director"],
        ),
        axis=1,
    )
    return frame.dropna(subset=["movie_id", "title", "weighted_tags"]).reset_index(drop=True)
