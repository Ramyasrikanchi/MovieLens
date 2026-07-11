from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from app.utils.paths import (
    SIMILARITY_MATRIX_PATH,
    TFIDF_VECTORIZER_PATH,
    WEIGHTED_SIMILARITY_MATRIX_PATH,
    WEIGHTED_TFIDF_VECTORIZER_PATH,
)


load_dotenv()

DEFAULT_MODEL = "baseline"
AVAILABLE_MODELS = ["baseline", "weighted"]


@dataclass(frozen=True)
class RecommendationModelConfig:
    name: str
    vectorizer_path: Path
    similarity_path: Path
    text_column: str


MODEL_CONFIGS = {
    "baseline": RecommendationModelConfig(
        name="baseline",
        vectorizer_path=TFIDF_VECTORIZER_PATH,
        similarity_path=SIMILARITY_MATRIX_PATH,
        text_column="tags",
    ),
    "weighted": RecommendationModelConfig(
        name="weighted",
        vectorizer_path=WEIGHTED_TFIDF_VECTORIZER_PATH,
        similarity_path=WEIGHTED_SIMILARITY_MATRIX_PATH,
        text_column="weighted_tags",
    ),
}
