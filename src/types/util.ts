export interface DownloadEventDetail {
  slug: string;
}

export type DownloadEvent = CustomEvent<DownloadEventDetail>;
