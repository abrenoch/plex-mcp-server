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

  constructor(options: { baseUrl?: string; token?: string } = {}) {
    this.accessToken = options.token || process.env.PLEX_TOKEN || '';
    
    if (!this.accessToken) {
      throw new Error('Plex token is required. Set it in the constructor options or as PLEX_TOKEN in your .env file.');
    }
    
    this.client = new PlexAPI({
      accessToken: this.accessToken,
      serverURL: options.baseUrl || process.env.PLEX_URL || 'http://localhost:32400'
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
   * Get all media items from a library
   * @param libraryId - The ID of the library
   * @param type - The type of content to retrieve (default: 1)
   * @param tag - The tag to filter by (default: Tag.Newest)
   */
  async getLibraryContents(libraryId: string, type: number = 1, tag: Tag = Tag.Newest): Promise<any[]> {
    try {
      // Converting libraryId to number as required by the PlexAPI
      const numericId = parseInt(libraryId, 10);
      // Due to API changes, we need to provide the required parameters as per documentation
      // Using any here to bypass type checking until we can determine the correct types
      const params: GetLibraryItemsRequest = {
        sectionKey: numericId,
        type: type,
        tag: tag
      };
      const response = await this.client.library.getLibraryItems(params);
      const mediaContainer = response.object?.mediaContainer;
      const items = mediaContainer?.metadata || [];
      return items;
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
      const allMovies = movieResults.flat().filter((item: any) => item.type === 'movie');
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
} 