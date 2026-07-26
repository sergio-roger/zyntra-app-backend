import { YoutubeCompetitorChannel } from '@/modules/youtube-analytics/interfaces/youtube-competitor-channel.interface';

export interface YoutubeChannelDailyStats {
  id: string;
  businessId: string;
  date: string;
  subscribers: number;
  subscribersGained: number;
  subscribersLost: number;
  viewsTotal: number;
  watchTimeMinutes: number;
}

export interface YoutubeVideoDailyStats {
  id: string;
  businessId: string;
  videoId: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
  avgViewDuration: number;
  thumbnailCtr: number;
  trafficSource: Record<string, number>;
}

export interface YoutubeOwnChannelDashboard {
  channelDailyStats: YoutubeChannelDailyStats[];
  videoDailyStats: YoutubeVideoDailyStats[];
}

export interface YoutubeCompetitorVideoStats {
  id: string;
  competitorChannelId: string;
  videoId: string;
  date: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  thumbnailUrl: string | null;
}

export interface YoutubeCompetitorsDashboard {
  competitors: YoutubeCompetitorChannel[];
  competitorVideoStats: YoutubeCompetitorVideoStats[];
}
