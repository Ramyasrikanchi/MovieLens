from app.models.recommendation import Recommendation
from app.services.recommendation_service import MovieRecommender, build_weighted_features_frame
from app.utils.recommendation_formatting import format_recommendations_table


TEST_MOVIES = ("Avatar", "Interstellar", "The Dark Knight")


def get_recommendations(recommender: MovieRecommender, movie_title: str, top_n: int = 10) -> list[Recommendation]:
    return recommender.recommend(movie_title, top_n)


def main() -> None:
    baseline = MovieRecommender()
    baseline.load_data()
    baseline.load_artifacts()

    weighted = MovieRecommender(
        model_name="weighted",
        data_transformer=build_weighted_features_frame,
    )
    weighted.load_data()
    weighted.load_artifacts()

    print(f"Loaded baseline vectorizer: {baseline.vectorizer_path}")
    print(f"Loaded baseline similarity matrix: {baseline.similarity_path}")
    print(f"Loaded weighted vectorizer: {weighted.vectorizer_path}")
    print(f"Loaded weighted similarity matrix: {weighted.similarity_path}")

    for movie_title in TEST_MOVIES:
        old_recommendations = get_recommendations(baseline, movie_title)
        new_recommendations = get_recommendations(weighted, movie_title)
        print()
        print(format_recommendations_table(movie_title, old_recommendations, new_recommendations))


if __name__ == "__main__":
    main()
