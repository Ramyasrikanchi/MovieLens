import { RecommendationPage } from "@/components/pages/RecommendationPage";
import type { MediaType } from "@/lib/types";

type PageProps = {
  params: Promise<{
    mediaType: MediaType;
    tmdbId: string;
  }>;
};

export default async function Recommend({ params }: PageProps) {
  const resolvedParams = await params;
  const tmdbId = Number(resolvedParams.tmdbId);

  return <RecommendationPage mediaType={resolvedParams.mediaType} tmdbId={tmdbId} />;
}
