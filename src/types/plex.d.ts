/**
 * Interface for Plex client
 */
export interface IPlexClient {
  getLibraries(): Promise<any[]>;
  getLibraryContents(libraryId: string, type?: number, tag?: any, start?: number, size?: number): Promise<{ items: any[], totalSize: number }>;
  getMovies(): Promise<any[]>;
  getSeasons(showId: string): Promise<any[]>;
  getEpisodes(seasonId: string): Promise<any[]>;
  search(query: string): Promise<any[]>;
  getWatchList(filter?: string): Promise<any[]>;
  getDevices(): Promise<any[]>;
  playMedia(mediaId: string, deviceId: string): Promise<void>;
} 