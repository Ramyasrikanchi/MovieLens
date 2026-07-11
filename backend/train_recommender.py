from app.services.recommendation_service import MovieRecommender


TEST_MOVIES = ("Avatar", "Interstellar", "The Dark Knight")


def print_recommendations(recommender: MovieRecommender, movie_title: str, top_n: int = 10) -> None:
    print(f"\nRecommendations for {movie_title}:")
    print("-" * 80)
    for rank, recommendation in enumerate(recommender.recommend(movie_title, top_n), start=1):
        print(f"{rank:>2}. {recommendation.title:<45} score={recommendation.similarity_score:.4f}")


def main() -> None:
    recommender = MovieRecommender()
    movies = recommender.load_data()
    recommender.train()
    recommender.save_artifacts()

    print(f"Loaded movies: {movies.shape}")
    print(f"Saved vectorizer: {recommender.vectorizer_path}")
    print(f"Saved similarity matrix: {recommender.similarity_path}")

    for movie_title in TEST_MOVIES:
        print_recommendations(recommender, movie_title)


if __name__ == "__main__":
    main()

