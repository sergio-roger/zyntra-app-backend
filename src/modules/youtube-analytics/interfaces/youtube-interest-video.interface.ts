export interface YoutubeInterestVideo {
  id: string;
  businessId: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number | null;
  durationSeconds: number | null;
  uploadedAt: string | null;
  fetchedAt: string;
}
