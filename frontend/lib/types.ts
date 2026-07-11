export type MediaType = "movie" | "tv";

export type SearchResult = {
  tmdb_id: number;
  title: string;
  media_type: MediaType;
  confidence: number;
  release_date?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
};

export type Recommendation = {
  title: string;
  score: number;
  tmdb_id?: number | null;
  poster_path?: string | null;
  release_date?: string | null;
  release_year?: number | null;
  media_type?: MediaType | null;
  vote_average?: number | null;
  genres?: string[];
  top_genres: string[];
  overview_snippet?: string | null;
  why_recommended: WhyRecommended;
};

export type RecommendationResponse = {
  movie: string;
  source: "local" | "external";
  selected_movie?: MovieProfile | null;
  recommendations: Recommendation[];
};

export type WhyRecommended = {
  shared_genres: string[];
  shared_keywords: string[];
  shared_cast: string[];
  shared_director: boolean;
};

export type MovieProfile = {
  tmdb_id?: number | null;
  title: string;
  media_type: MediaType;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  release_year?: number | null;
  vote_average?: number | null;
  genres: string[];
  keywords: string[];
  cast: string[];
  director: string[];
  top_genres: string[];
};
