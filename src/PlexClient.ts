import { PlexAPI } from "@lukehagar/plexjs";
import { Logger } from "./Logger";
import { Filter, GetLibraryItemsRequest, Tag } from "@lukehagar/plexjs/sdk/models/operations";

// Create logger instance for the PlexClient
const logger = new Logger("plex-client");

/**
 * Class to interact with the Plex API
 */
export class PlexClient {
  private client: PlexAPI;
  private accessToken: string;
  private serverUrl: string;

  constructor(options: { baseUrl?: string; token?: string } = {}) {
    this.accessToken = options.token || process.env.PLEX_TOKEN || '';
    this.serverUrl = options.baseUrl || process.env.PLEX_URL || 'http://localhost:32400';
    
    if (!this.accessToken) {
      throw new Error('Plex token is required. Set it in the constructor options or as PLEX_TOKEN in your .env file.');
    }
    
    this.client = new PlexAPI({
      accessToken: this.accessToken,
      serverURL: this.serverUrl
    });
  }

  /**
   * Get all libraries from the Plex server
   */
  async getLibraries(): Promise<any[]> {
    try {
      const response = await this.client.library.getAllLibraries();
      const libraries = response.object?.mediaContainer.directory || [];
      return libraries;
    } catch (error) {
      logger.error('Error fetching libraries:', error);
      throw error;
    }
  }

  /**
   * Get media items from a library with pagination support
   * @param libraryId - The ID of the library
   * @param type - The type of content to retrieve (default: 1)
   * @param tag - The tag to filter by (default: Tag.Newest)
   * @param start - Starting index for pagination (default: 0)
   * @param size - Number of items to return (default: 20)
   */
  async getLibraryContents(
    libraryId: string, 
    type: number = 1, 
    tag: Tag = Tag.Newest,
    start: number = 0,
    size: number = 20
  ): Promise<{ items: any[], totalSize: number }> {
    try {
      // Converting libraryId to number as required by the PlexAPI
      const numericId = parseInt(libraryId, 10);
      
      // Construct the URL with query parameters
      const url = `${this.serverUrl}/library/sections/${numericId}/all?type=${type}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`;
      
      // Make the request using fetch
      const response = await fetch(url, {
        headers: {
          'X-Plex-Token': this.accessToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch library contents: ${response.statusText}`);
      }

      interface PlexResponse {
        MediaContainer: {
          Metadata: any[];
          totalSize?: number;
        };
      }

      const data = await response.json() as PlexResponse;
      const items = data.MediaContainer?.Metadata || [];
      const totalSize = data.MediaContainer?.totalSize || items.length;
      
      return {
        items,
        totalSize
      };
    } catch (error) {
      logger.error(`Error fetching content from library ${libraryId}:`, error);
      throw error;
    }
  }

  /**
   * Get all movies across all movie libraries
   */
  async getMovies(): Promise<any[]> {
    try {
      // Find all movie libraries
      const libraries = await this.getLibraries();
      const movieLibraries = libraries.filter((lib: any) => lib.type === 'movie');
      
      if (movieLibraries.length === 0) {
        logger.warn('No movie libraries found');
        return [];
      }
      
      // Get all movies from all movie libraries
      const moviePromises = movieLibraries.map((lib: any) => this.getLibraryContents(lib.key));
      const movieResults = await Promise.all(moviePromises);
      
      // Flatten the array of arrays and filter to only include movies
      const allMovies = movieResults.flatMap(result => result.items).filter((item: any) => item.type === 'movie');
      return allMovies;
    } catch (error) {
      logger.error('Error fetching movies:', error);
      throw error;
    }
  }

  /**
   * Get all seasons for a TV show
   * @param showId - The rating key of the TV show
   */
  async getSeasons(showId: string): Promise<any[]> {
    try {
      const numericId = parseInt(showId, 10);
      const response = await this.client.library.getMetadataChildren(numericId);
      const mediaContainer = response.object?.mediaContainer;
      const seasons = mediaContainer?.metadata || [];
      return seasons;
    } catch (error) {
      logger.error(`Error fetching seasons for show ${showId}:`, error);
      throw error;
    }
  }

  /**
   * Get all episodes for a season
   * @param seasonId - The rating key of the season
   */
  async getEpisodes(seasonId: string): Promise<any[]> {
    try {
      const numericId = parseInt(seasonId, 10);
      const response = await this.client.library.getMetadataChildren(numericId);
      const mediaContainer = response.object?.mediaContainer;
      const episodes = mediaContainer?.metadata || [];
      return episodes;
    } catch (error) {
      logger.error(`Error fetching episodes for season ${seasonId}:`, error);
      throw error;
    }
  }

  /**
   * Search for content across libraries
   * @param query - The search query
   */
  async search(query: string): Promise<any[]> {
    try {
      const response = await this.client.search.getSearchResults(query);
      const mediaContainer = response.object?.mediaContainer;
      const results = mediaContainer?.metadata || [];
      return results;
    } catch (error) {
      logger.error(`Error searching for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get the user's watchlist
   * @param filter - Filter to apply ('available', 'unwatched')
   */
  async getWatchList(filter: Filter): Promise<any[]> {

    logger.info(`Getting watchlist with filter: ${this.accessToken}`);

    try {
      const response = await this.client.watchlist.getWatchList({
        filter,
        xPlexToken: this.accessToken,
      });

      logger.info(JSON.stringify(response, null, 2));
      
      // Handle different possible response structures
      const responseObj = response.object;
      // Return empty array if response object is undefined
      if (!responseObj) return [];
      
      return responseObj.metadata || [];
    } catch (error) {
      logger.error('Error fetching watchlist:', error);
      throw error;
    }
  }

  /**
   * Get all devices connected to the Plex server
   */
  async getDevices(): Promise<any[]> {
    try {
      const response = await this.client.server.getDevices();
      const devices = response.object?.mediaContainer?.device || [];
      return devices;
    } catch (error) {
      logger.error('Error fetching devices:', error);
      throw error;
    }
  }

  /**
   * Play a media item on a specific device
   * @param mediaId - The rating key of the media item to play
   * @param deviceId - The client identifier of the device to play on
   */
  async playMedia(mediaId: string, deviceId: string): Promise<void> {
    try {
      const numericId = parseInt(mediaId, 10);
      
      // First, get the device details to ensure it exists
      const devices = await this.getDevices();
      const targetDevice = devices.find((device: any) => device.clientIdentifier === deviceId);
      
      if (!targetDevice) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      // Get the media item details to ensure it exists using library sections endpoint
      const response = await this.client.library.getLibraryItems({ 
        sectionKey: numericId,
        type: 1,  // Default to movie type
        tag: Tag.Newest  // Required parameter
      });
      
      if (!response.object?.mediaContainer?.metadata?.[0]) {
        throw new Error(`Media item with ID ${mediaId} not found`);
      }

      // Construct and send the playback request
      const playbackUrl = `${this.serverUrl}/player/playback/playMedia`;
      const params = new URLSearchParams({
        'X-Plex-Token': this.accessToken,
        'machineIdentifier': deviceId,
        'key': `/library/metadata/${mediaId}`,
        'offset': '0',
        'type': 'video',
        'commandID': Date.now().toString()
      });

      const fullUrl = `${playbackUrl}?${params.toString()}`;
      
      const playResponse = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!playResponse.ok) {
        throw new Error(`Failed to start playback: ${playResponse.statusText}`);
      }

      logger.info(`Started playback of media ${mediaId} on device ${deviceId}`);
    } catch (error) {
      logger.error(`Error playing media ${mediaId} on device ${deviceId}:`, error);
      throw error;
    }
  }
} 