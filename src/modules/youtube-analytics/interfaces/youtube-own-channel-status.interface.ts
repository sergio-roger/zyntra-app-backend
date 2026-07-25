export type YoutubeCredentialStatus = 'connected' | 'expired' | 'revoked';

export interface YoutubeOwnChannelStatus {
  status: YoutubeCredentialStatus;
  youtubeChannelId: string | null;
}
