from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"
MODEL_DIR = BACKEND_DIR / "models"

PROCESSED_MOVIES_PATH = DATA_DIR / "processed" / "processed_movies.csv"
TFIDF_VECTORIZER_PATH = MODEL_DIR / "tfidf_vectorizer.pkl"
SIMILARITY_MATRIX_PATH = MODEL_DIR / "similarity_matrix.pkl"
WEIGHTED_TFIDF_VECTORIZER_PATH = MODEL_DIR / "weighted_tfidf_vectorizer.pkl"
WEIGHTED_SIMILARITY_MATRIX_PATH = MODEL_DIR / "weighted_similarity_matrix.pkl"
