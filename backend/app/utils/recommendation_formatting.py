from __future__ import annotations

from app.models.recommendation import Recommendation


def format_recommendations_table(
    movie_title: str,
    old_recommendations: list[Recommendation],
    new_recommendations: list[Recommendation],
) -> str:
    lines = [f"Recommendations for {movie_title}", "-" * 132]
    lines.append(
        f"{'Old Rank':<8} {'Old Title':<42} {'Old Score':<10} | {'New Rank':<8} {'New Title':<42} {'New Score':<10}"
    )
    lines.append("-" * 132)

    max_rows = max(len(old_recommendations), len(new_recommendations))
    for index in range(max_rows):
        if index < len(old_recommendations):
            old_rank = f"{index + 1}"
            old_title = old_recommendations[index].title[:42]
            old_score = f"{old_recommendations[index].similarity_score:.4f}"
        else:
            old_rank = old_title = old_score = ""

        if index < len(new_recommendations):
            new_rank = f"{index + 1}"
            new_title = new_recommendations[index].title[:42]
            new_score = f"{new_recommendations[index].similarity_score:.4f}"
        else:
            new_rank = new_title = new_score = ""

        lines.append(
            f"{old_rank:<8} {old_title:<42} {old_score:<10} | {new_rank:<8} {new_title:<42} {new_score:<10}"
        )

    return "\n".join(lines)

