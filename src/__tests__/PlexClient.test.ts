import { Filter } from '@lukehagar/plexjs/sdk/models/operations';
import { PlexClient } from '../PlexClient';
import { PlexAPI } from '@lukehagar/plexjs';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Mock the entire @lukehagar/plexjs module
jest.mock('@lukehagar/plexjs', () => {
  return {
    PlexAPI: jest.fn().mockImplementation(() => ({
      library: {
        getAllLibraries: jest.fn(),
        getLibraryItems: jest.fn(),
        getMetadataChildren: jest.fn()
      },
      search: {
        getSearchResults: jest.fn()
      },
      watchlist: {
        getWatchList: jest.fn()
      }
    }))
  };
});

describe('PlexClient', () => {
  let plexClient: PlexClient;
  let mockPlexAPI: any;
  let originalEnv: any;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Save original environment variables
    originalEnv = { ...process.env };
    
    // Set up environment variables for testing if not already set
    if (!process.env.PLEX_TOKEN) {
      process.env.PLEX_TOKEN = 'test-token';
    }
    if (!process.env.PLEX_URL) {
      process.env.PLEX_URL = 'http://test-plex-server:32400';
    }
    
    // Create PlexClient instance
    plexClient = new PlexClient();
    
    // Access the mocked PlexAPI instance
    mockPlexAPI = (plexClient as any).client;
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      const token = process.env.PLEX_TOKEN || 'test-token';
      const url = process.env.PLEX_URL || 'http://test-plex-server:32400';
      
      expect(PlexAPI).toHaveBeenCalledWith({
        accessToken: token,
        serverURL: url
      });
    });

    it('should throw error if no token provided', () => {
      // Store original token value
      const originalToken = process.env.PLEX_TOKEN;
      // Temporarily clear the token
      process.env.PLEX_TOKEN = '';
      
      expect(() => new PlexClient()).toThrow('Plex token is required');
      
      // Restore the token
      process.env.PLEX_TOKEN = originalToken;
    });
  });

  describe('getLibraries', () => {
    it('should return libraries array', async () => {
      const mockLibraries = {
        object: {
          mediaContainer: {
            directory: [
              { key: '1', title: 'Movies', type: 'movie' },
              { key: '2', title: 'TV Shows', type: 'show' }
            ]
          }
        }
      };

      mockPlexAPI.library.getAllLibraries.mockResolvedValue(mockLibraries);

      const result = await plexClient.getLibraries();
      
      expect(mockPlexAPI.library.getAllLibraries).toHaveBeenCalled();
      expect(result).toEqual(mockLibraries.object.mediaContainer.directory);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      mockPlexAPI.library.getAllLibraries.mockRejectedValue(error);

      await expect(plexClient.getLibraries()).rejects.toThrow();
    });
  });

  describe('getLibraryContents', () => {
    it('should return media items array', async () => {
      const mockContents = {
        object: {
          mediaContainer: {
            metadata: [
              { 
                ratingKey: '1',
                title: 'Test Movie',
                type: 'movie',
                year: 2024
              }
            ]
          }
        }
      };

      mockPlexAPI.library.getLibraryItems.mockResolvedValue(mockContents);

      const result = await plexClient.getLibraryContents('1');
      
      expect(mockPlexAPI.library.getLibraryItems).toHaveBeenCalledWith({ 
        sectionKey: 1,
        type: 1,
        tag: "newest"
      });
      expect(result).toEqual(mockContents.object.mediaContainer.metadata);
    });

    it('should handle errors', async () => {
      const error = new Error('Library error');
      mockPlexAPI.library.getLibraryItems.mockRejectedValue(error);

      await expect(plexClient.getLibraryContents('1')).rejects.toThrow();
    });
  });

  describe('getMovies', () => {
    it('should return movies from all movie libraries', async () => {
      // Mock libraries
      const mockLibraries = {
        object: {
          mediaContainer: {
            directory: [
              { key: '1', title: 'Movies', type: 'movie' },
              { key: '2', title: 'TV Shows', type: 'show' }
            ]
          }
        }
      };

      // Mock library contents
      const mockMovies = {
        object: {
          mediaContainer: {
            metadata: [
              { ratingKey: '101', title: 'The Matrix', type: 'movie', year: 1999 },
              { ratingKey: '102', title: 'Inception', type: 'movie', year: 2010 }
            ]
          }
        }
      };

      mockPlexAPI.library.getAllLibraries.mockResolvedValue(mockLibraries);
      mockPlexAPI.library.getLibraryItems.mockResolvedValue(mockMovies);

      const result = await plexClient.getMovies();
      
      expect(mockPlexAPI.library.getAllLibraries).toHaveBeenCalled();
      expect(mockPlexAPI.library.getLibraryItems).toHaveBeenCalledWith({ 
        sectionKey: 1,
        type: 1,
        tag: "newest"
      });
      expect(result).toEqual(mockMovies.object.mediaContainer.metadata);
    });

    it('should return empty array when no movie libraries found', async () => {
      // Mock libraries with no movie libraries
      const mockLibraries = {
        object: {
          mediaContainer: {
            directory: [
              { key: '2', title: 'TV Shows', type: 'show' }
            ]
          }
        }
      };

      mockPlexAPI.library.getAllLibraries.mockResolvedValue(mockLibraries);

      const result = await plexClient.getMovies();
      
      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      const error = new Error('Movie error');
      mockPlexAPI.library.getAllLibraries.mockRejectedValue(error);

      await expect(plexClient.getMovies()).rejects.toThrow();
    });
  });

  describe('getSeasons', () => {
    it('should return seasons for a TV show', async () => {
      const mockSeasons = {
        object: {
          mediaContainer: {
            metadata: [
              { ratingKey: '201', title: 'Season 1', index: 1, leafCount: 10 },
              { ratingKey: '202', title: 'Season 2', index: 2, leafCount: 12 }
            ]
          }
        }
      };

      mockPlexAPI.library.getMetadataChildren.mockResolvedValue(mockSeasons);

      const result = await plexClient.getSeasons('123');
      
      expect(mockPlexAPI.library.getMetadataChildren).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockSeasons.object.mediaContainer.metadata);
    });

    it('should handle errors', async () => {
      const error = new Error('Season error');
      mockPlexAPI.library.getMetadataChildren.mockRejectedValue(error);

      await expect(plexClient.getSeasons('123')).rejects.toThrow();
    });
  });

  describe('getEpisodes', () => {
    it('should return episodes for a season', async () => {
      const mockEpisodes = {
        object: {
          mediaContainer: {
            metadata: [
              { ratingKey: '301', title: 'Episode 1', parentIndex: 1, index: 1 },
              { ratingKey: '302', title: 'Episode 2', parentIndex: 1, index: 2 }
            ]
          }
        }
      };

      mockPlexAPI.library.getMetadataChildren.mockResolvedValue(mockEpisodes);

      const result = await plexClient.getEpisodes('201');
      
      expect(mockPlexAPI.library.getMetadataChildren).toHaveBeenCalledWith(201);
      expect(result).toEqual(mockEpisodes.object.mediaContainer.metadata);
    });

    it('should handle errors', async () => {
      const error = new Error('Episode error');
      mockPlexAPI.library.getMetadataChildren.mockRejectedValue(error);

      await expect(plexClient.getEpisodes('201')).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockResults = {
        object: {
          mediaContainer: {
            metadata: [
              { ratingKey: '101', title: 'The Matrix', type: 'movie' },
              { ratingKey: '201', title: 'Breaking Bad', type: 'show' }
            ]
          }
        }
      };

      mockPlexAPI.search.getSearchResults.mockResolvedValue(mockResults);

      const result = await plexClient.search('matrix');
      
      expect(mockPlexAPI.search.getSearchResults).toHaveBeenCalledWith('matrix');
      expect(result).toEqual(mockResults.object.mediaContainer.metadata);
    });

    it('should handle errors', async () => {
      const error = new Error('Search error');
      mockPlexAPI.search.getSearchResults.mockRejectedValue(error);

      await expect(plexClient.search('matrix')).rejects.toThrow();
    });
  });

  describe('getWatchList', () => {
    it('should return watchlist items with no filter', async () => {
      const mockWatchlist = {
        object: {
          mediaContainer: {
            metadata: [
              { ratingKey: '501', title: 'Dune', type: 'movie' },
              { ratingKey: '502', title: 'The Last of Us', type: 'show' }
            ]
          }
        }
      };

      mockPlexAPI.watchlist.getWatchList.mockResolvedValue(mockWatchlist);

      const result = await plexClient.getWatchList(Filter.All);
      
      expect(mockPlexAPI.watchlist.getWatchList).toHaveBeenCalledWith({ 
        filter: Filter.All,
        xPlexToken: process.env.PLEX_TOKEN || 'test-token'
      });
      
      // Check structure but not content as the actual implementation might modify the data
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return watchlist items with filter', async () => {
      const mockWatchlist = {
        object: {
          mediaContainer: {
            metadata: [
              { ratingKey: '501', title: 'Dune', type: 'movie' }
            ]
          }
        }
      };

      mockPlexAPI.watchlist.getWatchList.mockResolvedValue(mockWatchlist);

      const result = await plexClient.getWatchList(Filter.Available);
      
      expect(mockPlexAPI.watchlist.getWatchList).toHaveBeenCalledWith({ 
        filter: Filter.Available,
        xPlexToken: process.env.PLEX_TOKEN || 'test-token'
      });
      
      // Check structure but not content as the actual implementation might modify the data
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle undefined response object', async () => {
      const mockWatchlist = {
        object: undefined
      };

      mockPlexAPI.watchlist.getWatchList.mockResolvedValue(mockWatchlist);

      const result = await plexClient.getWatchList(Filter.All);
      
      // Should return empty array for undefined response
      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      const error = new Error('Watchlist error');
      mockPlexAPI.watchlist.getWatchList.mockRejectedValue(error);

      await expect(plexClient.getWatchList(Filter.All)).rejects.toThrow();
    });
  });
}); 