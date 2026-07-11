from __future__ import annotations

import ast

import pandas as pd


def parse_literal_list(value: str | list | tuple | None) -> list:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    if not isinstance(value, str) or not value.strip():
        return []

    try:
        parsed = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return []
    return parsed if isinstance(parsed, list) else []


def normalize_token(value: str) -> str:
    return value.replace(" ", "").lower()


def extract_names(value: str | list | None) -> list[str]:
    return [
        normalize_token(str(item.get("name")))
        for item in parse_literal_list(value)
        if isinstance(item, dict) and item.get("name")
    ]


def extract_raw_names(value: str | list | None) -> list[str]:
    return [
        str(item.get("name"))
        for item in parse_literal_list(value)
        if isinstance(item, dict) and item.get("name")
    ]


def extract_top_cast(value: str | list | None, limit: int = 3) -> list[str]:
    return [
        normalize_token(str(item.get("name")))
        for item in parse_literal_list(value)[:limit]
        if isinstance(item, dict) and item.get("name")
    ]


def extract_raw_top_cast(value: str | list | None, limit: int = 3) -> list[str]:
    return [
        str(item.get("name"))
        for item in parse_literal_list(value)[:limit]
        if isinstance(item, dict) and item.get("name")
    ]


def extract_director(value: str | list | None) -> list[str]:
    for item in parse_literal_list(value):
        if isinstance(item, dict) and item.get("job") == "Director" and item.get("name"):
            return [normalize_token(str(item["name"]))]
    return []


def extract_raw_director(value: str | list | None) -> list[str]:
    for item in parse_literal_list(value):
        if isinstance(item, dict) and item.get("job") == "Director" and item.get("name"):
            return [str(item["name"])]
    return []


def build_weighted_tags(
    overview: str,
    genres: list[str],
    keywords: list[str],
    cast: list[str],
    director: list[str],
) -> str:
    overview_tokens = str(overview).split()
    tokens: list[str] = []
    tokens.extend(overview_tokens)
    tokens.extend(genres * 3)
    tokens.extend(keywords * 3)
    tokens.extend(director * 2)
    tokens.extend(cast)
    return " ".join(normalize_token(token) for token in tokens if str(token).strip())


def build_baseline_tags(
    overview: str,
    genres: list[str],
    keywords: list[str],
    cast: list[str],
    director: list[str],
) -> str:
    tokens: list[str] = []
    tokens.extend(str(overview).split())
    tokens.extend(genres)
    tokens.extend(keywords)
    tokens.extend(cast)
    tokens.extend(director)
    return " ".join(normalize_token(token) for token in tokens if str(token).strip())
