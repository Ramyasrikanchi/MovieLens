# MovieLens Project Outline

## Project Goal

MovieLens is a full-stack movie recommendation application that helps users search for a movie or TV title, select the correct TMDB result, and receive explainable recommendations from a local movie corpus.

The project combines a content-based recommendation engine with a modern web interface. Its main goal is not only to return similar movies, but also to make the recommendation process understandable by showing metadata, similarity scores, and overlap signals such as shared genres, keywords, cast, and director.

## Project Description

The application uses the TMDB 5000 dataset as its local recommendation corpus. Movie metadata is processed into text-based feature tags, transformed using TF-IDF vectorization, and compared through cosine similarity. The backend exposes this recommendation logic through a FastAPI API, while the frontend provides a Next.js interface for search, selection, and recommendation browsing.

The product flow is intentionally split into two stages:

1. Search TMDB for the exact movie or TV show.
2. Generate recommendations for the selected TMDB title against the local dataset.

This separation improves clarity because users can resolve ambiguous titles before recommendations are generated.

## High-Level Architecture

```text
User
  |
  v
Next.js Frontend
  |
  | HTTP requests
  v
FastAPI Backend
  |
  +--> TMDB API for search and metadata enrichment
  |
  +--> Local processed TMDB 5000 dataset
  |
  +--> Trained TF-IDF vectorizer and similarity matrix artifacts
```

## Technology Stack

### Backend

- Python
- FastAPI
- Pydantic
- pandas
- NumPy
- scikit-learn
- joblib
- requests
- rapidfuzz
- python-dotenv

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Data and Machine Learning

- TMDB 5000 movies and credits CSV files
- TF-IDF vectorization
- Cosine similarity
- Serialized model artifacts stored with joblib

## Repository Structure

```text
backend/
  app/
    api/
    models/
    services/
    utils/
  data/
    raw/
    interim/
    processed/
  models/
  train_recommender.py
  compare_recommendations.py

frontend/
  app/
  components/
  lib/

notebooks/
SETUP.md
DESIGN.md
requirements.txt
```

## Backend Modules

### `backend/app/main.py`

Creates and configures the FastAPI application.

Responsibilities:

- Registers API routes.
- Enables CORS for local frontend development.
- Loads the recommendation model during application startup.
- Defines API metadata such as title, description, and version.

### `backend/app/api/routes.py`

Contains the HTTP API endpoints.

Main endpoints:

- `GET /health`: Checks API health and loaded model name.
- `GET /search?q=...`: Searches TMDB for movie and TV candidates.
- `GET /recommend/local/{movie_title}`: Generates recommendations from a title already present in the local dataset.
- `GET /recommend/tmdb/{tmdb_id}`: Generates recommendations for an external TMDB movie or TV title.

This module also maps TMDB-related service exceptions to appropriate HTTP status codes.

### `backend/app/api/schemas.py`

Defines Pydantic response schemas used by the API.

Important schemas:

- `SearchResponse`
- `CandidateOption`
- `RecommendationResponse`
- `RecommendationItem`
- `MovieProfileSchema`
- `WhyRecommendedSchema`
- `HealthResponse`
- `ErrorResponse`

These schemas keep the API response structure predictable for the frontend.

### `backend/app/services/recommendation_service.py`

Implements the core recommendation engine.

Responsibilities:

- Loads processed movie data.
- Loads trained TF-IDF vectorizer and similarity matrix artifacts.
- Generates local title recommendations.
- Generates recommendations for external TMDB titles.
- Builds selected movie profiles.
- Computes recommendation explanations.
- Enriches recommendation cards with TMDB metadata when available.

The service supports two model configurations:

- `baseline`: Uses the standard `tags` column.
- `weighted`: Uses the `weighted_tags` column with extra weighting for metadata fields.

The current production-facing default model is `baseline`.

### `backend/app/services/tmdb_service.py`

Handles communication with The Movie Database API.

Responsibilities:

- Searches TMDB using `/search/multi`.
- Fetches full movie or TV metadata by TMDB ID.
- Retrieves credits, keywords, genres, posters, release dates, and ratings.
- Builds external recommendation tags from TMDB metadata.
- Provides best-effort metadata enrichment for recommendation cards.
- Uses retry-enabled HTTP sessions.
- Caches metadata lookups during runtime.

Required environment configuration:

- `TMDB_API_KEY`, or
- `TMDB_READ_ACCESS_TOKEN`, or
- `TMDB_BEARER_TOKEN`

### `backend/app/models/recommendation.py`

Defines internal dataclasses used by the recommendation service.

Main domain models:

- `MovieProfile`
- `Recommendation`
- `RecommendationResult`
- `WhyRecommended`

These models represent backend business objects before they are converted into API response schemas.

### `backend/app/config.py`

Stores recommendation model configuration.

Responsibilities:

- Loads environment variables.
- Defines available model names.
- Maps each model to its vectorizer path, similarity matrix path, and text feature column.

### `backend/app/utils/feature_engineering.py`

Contains feature extraction and tag-building helpers.

Responsibilities:

- Parses serialized list-like TMDB fields.
- Extracts genres, keywords, cast, and director.
- Normalizes tokens.
- Builds baseline tags.
- Builds weighted tags.

Baseline tags combine overview, genres, keywords, cast, and director once. Weighted tags repeat selected metadata features to increase their influence in TF-IDF similarity.

### `backend/app/utils/paths.py`

Centralizes filesystem paths for backend data and model artifacts.

Important paths:

- Processed dataset CSV
- TF-IDF vectorizer artifact
- Similarity matrix artifact
- Weighted TF-IDF vectorizer artifact
- Weighted similarity matrix artifact

### `backend/app/utils/recommendation_formatting.py`

Formats recommendation comparisons for command-line output.

This is mainly used by comparison scripts to inspect baseline and weighted model differences.

## Backend Scripts

### `backend/train_recommender.py`

Trains the recommender using the processed dataset.

Main tasks:

- Loads processed movie data.
- Fits a TF-IDF vectorizer.
- Computes cosine similarity.
- Saves the vectorizer and similarity matrix.
- Prints sample recommendations for test movies.

### `backend/compare_recommendations.py`

Compares baseline and weighted recommendation outputs.

Main tasks:

- Loads both baseline and weighted model artifacts.
- Runs recommendations for sample movies.
- Prints side-by-side recommendation tables.

This script is useful for evaluating whether weighted metadata improves recommendation quality.

## Data Pipeline

The project uses TMDB 5000 movie and credits data.

### Raw Data

Located in:

```text
backend/data/raw/
```

Files:

- `tmdb_5000_movies.csv`
- `tmdb_5000_credits.csv`

### Interim Data

Located in:

```text
backend/data/interim/
```

Used for cleaned intermediate data.

### Processed Data

Located in:

```text
backend/data/processed/processed_movies.csv
```

This dataset is consumed by the recommendation service. It must include movie identifiers, titles, and the text feature column required by the active model.

## Recommendation Logic

The recommendation system is content-based.

### Feature Construction

Movie features are built from:

- Overview text
- Genres
- Keywords
- Top cast members
- Director

These fields are normalized into text tags. The recommender then uses those tags as the input text for TF-IDF vectorization.

### Vectorization

The project uses `TfidfVectorizer` from scikit-learn with English stop words removed.

Each movie is represented as a TF-IDF vector.

### Similarity Calculation

Cosine similarity is used to compare movie vectors.

For local movie recommendations:

- The selected movie is found in the processed dataset.
- Its row in the similarity matrix is used to rank similar movies.
- The selected movie itself is excluded from the results.

For external TMDB recommendations:

- TMDB metadata is fetched for the selected title.
- A temporary tag string is built from the external metadata.
- The trained vectorizer transforms that tag string.
- The external vector is compared against the local movie TF-IDF matrix.

### Explainability

Each recommendation includes a `why_recommended` object.

It can include:

- Shared genres
- Shared keywords
- Shared cast members
- Whether the director matches

The ranking is still based on TF-IDF cosine similarity. The explanation fields are supporting information for the user interface.

## Frontend Modules

### `frontend/app/page.tsx`

Renders the homepage through `HomePage`.

### `frontend/app/search/page.tsx`

Renders the search page through `SearchPage`.

### `frontend/app/recommend/[mediaType]/[tmdbId]/page.tsx`

Renders the recommendation page for a selected TMDB movie or TV show.

Dynamic route parameters:

- `mediaType`: `movie` or `tv`
- `tmdbId`: TMDB identifier

### `frontend/lib/api.ts`

Central frontend API client.

Responsibilities:

- Calls backend search and recommendation endpoints.
- Normalizes backend API responses.
- Builds TMDB poster image URLs.
- Provides defensive defaults for missing fields.

Default backend URL:

```text
http://127.0.0.1:8000
```

This can be overridden with:

```text
NEXT_PUBLIC_API_BASE_URL
```

### `frontend/lib/types.ts`

Defines TypeScript types shared across frontend components.

Important types:

- `MediaType`
- `SearchResult`
- `SearchResponse`
- `Recommendation`
- `RecommendationResponse`
- `MovieProfile`
- `WhyRecommended`

## Frontend Components

### Pages

- `HomePage`: Landing page that explains the product flow and links to search or sample results.
- `SearchPage`: Dedicated TMDB search interface.
- `RecommendationPage`: Detailed recommendation screen for a selected title.

### Search Components

- `SearchBar`: Debounced search input that calls the backend TMDB search endpoint.
- `SearchResults`: Candidate list with poster, media type, year, confidence, and rating.

### Recommendation Components

- `RecommendationGrid`: Displays recommendation cards or empty states.
- `RecommendationCard`: Shows poster, rank, similarity score, metadata, overview snippet, and explanation.
- `RecommendationReason`: Shows shared genres, keywords, cast, or director match.

### Shared UI Components

- `Navbar`: Main navigation.
- `Hero`: Homepage hero section.
- `EmptyState`: Empty or error state display.
- `LoadingState`: Loading and skeleton state display.

## Main User Features

### 1. TMDB Search

Users can search for movies and TV shows through TMDB.

Feature behavior:

- Debounced input.
- Minimum query length before search.
- Abort handling for stale requests.
- Candidate confidence scores.
- Poster, release year, media type, and rating display.

### 2. Candidate Selection

Users select the exact TMDB candidate before recommendations are generated.

The selected candidate is stored in browser session storage as a fallback so the recommendation page can show basic metadata immediately if the API response does not contain every display field.

### 3. TMDB-Based Recommendations

The selected TMDB title is sent to the backend using its TMDB ID and media type.

The backend:

- Fetches TMDB metadata.
- Builds text tags for the external title.
- Compares it against the local TMDB 5000 corpus.
- Returns the nearest local movie neighbors.

### 4. Local Dataset Recommendations

The backend also supports direct recommendations for a movie title that already exists in the local processed dataset.

Endpoint:

```text
GET /recommend/local/{movie_title}
```

### 5. Explainable Recommendation Cards

Recommendation cards show:

- Rank
- Similarity percentage
- Exact cosine similarity score
- Poster image
- Release year
- Rating
- Media type
- Genres
- Overview snippet
- Shared recommendation reasons

### 6. Metadata Enrichment

The backend and frontend both attempt to enrich displayed results with TMDB metadata such as posters, release dates, ratings, and TMDB IDs.

Backend enrichment is best-effort and does not block recommendation generation if a card metadata lookup fails.

## API Summary

### Health

```http
GET /health
```

Returns API status and active model name.

### Search

```http
GET /search?q={query}
```

Returns TMDB movie and TV candidates.

### Local Recommendation

```http
GET /recommend/local/{movie_title}?top_n=10
```

Returns recommendations for a movie in the local processed dataset.

### TMDB Recommendation

```http
GET /recommend/tmdb/{tmdb_id}?media_type=movie&top_n=10
```

Returns recommendations for an external TMDB title.

## Model Artifacts

The backend stores trained model artifacts in:

```text
backend/models/
```

Current artifacts:

- `tfidf_vectorizer.pkl`
- `similarity_matrix.pkl`
- `weighted_tfidf_vectorizer.pkl`
- `weighted_similarity_matrix.pkl`

The default application model uses:

- `tfidf_vectorizer.pkl`
- `similarity_matrix.pkl`
- `tags`

The weighted experimental model uses:

- `weighted_tfidf_vectorizer.pkl`
- `weighted_similarity_matrix.pkl`
- `weighted_tags`

## Configuration

### Backend Environment Variables

The backend uses `.env` through `python-dotenv`.

Important variables:

- `TMDB_API_KEY`
- `TMDB_READ_ACCESS_TOKEN`
- `TMDB_BEARER_TOKEN`

At least one TMDB credential is required for TMDB search, external recommendation, and metadata enrichment.

### Frontend Environment Variables

The frontend can configure the backend API base URL with:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

If this variable is not set, the frontend defaults to `http://127.0.0.1:8000`.

## Typical Development Workflow

### Backend Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Train Recommendation Artifacts

```bash
cd backend
python train_recommender.py
```

### Run Backend API

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Run Frontend

```bash
cd frontend
npm run dev
```

## Strengths of the Project

- Clear separation between search and recommendation.
- Full-stack implementation with a typed frontend and structured backend.
- Content-based recommender that works without user history.
- TMDB integration for live search and richer metadata.
- Explainable recommendation cards.
- Separate baseline and weighted model artifacts for experimentation.
- Reusable backend service layer.
- Defensive frontend normalization for API payloads.

## Current Limitations

- Recommendations are content-based only and do not use collaborative filtering.
- The local recommendation corpus is limited to the TMDB 5000 dataset.
- TMDB API credentials are required for search and external recommendations.
- The default production model is baseline even though weighted artifacts exist.
- There is no persistent database layer.
- Runtime caches are in-memory only.
- The project currently has scripts for training and comparison, but no formal automated test suite is present in the repository.

## Suggested Documentation Sections

This outline can be expanded into full project documentation with the following sections:

1. Introduction
2. Problem Statement
3. Objectives
4. Technology Stack
5. System Architecture
6. Dataset Description
7. Data Preprocessing
8. Feature Engineering
9. Recommendation Algorithm
10. Backend API Design
11. Frontend Design
12. User Flow
13. Module Description
14. Setup and Installation
15. API Reference
16. Screenshots
17. Results and Observations
18. Limitations
19. Future Enhancements
20. Conclusion

## Possible Future Enhancements

- Add collaborative filtering using user ratings.
- Add hybrid recommendation combining content similarity and popularity.
- Add user accounts and saved watchlists.
- Add a persistent database for movies, cached TMDB metadata, and user actions.
- Add automated backend and frontend tests.
- Add model evaluation metrics.
- Add controls for recommendation count, genre filters, and release year filters.
- Make the weighted model selectable through configuration.
- Add deployment documentation for backend and frontend hosting.

