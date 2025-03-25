import express from 'express';
import dotenv from 'dotenv';
import { PlexClient } from './PlexClient';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MockPlexClient } from './mocks/MockPlexClient';
import { Logger } from './Logger';
import { Filter } from '@lukehagar/plexjs/sdk/models/operations';
import { Tag } from '@lukehagar/plexjs/sdk/models/operations';

dotenv.config();

// Create logger instance for the server
const logger = new Logger("plex-mcp-server");

// Create a type that can represent both PlexClient and MockPlexClient
type IPlexClient = PlexClient | MockPlexClient;

// Initialize the Plex client based on environment variables
async function main(): Promise<void> {
  let plexClient: IPlexClient;
  
  // Use mock client if USE_MOCK_PLEX=true is set
  if (process.env.USE_MOCK_PLEX === 'true') {
    logger.info('Using mock PlexClient as specified by USE_MOCK_PLEX=true');
    plexClient = new MockPlexClient();
  } else {
    try {
      plexClient = new PlexClient({
        token: process.env.PLEX_TOKEN,
        baseUrl: process.env.PLEX_URL,
      });
      logger.info('PlexClient initialized successfully');
    } catch (error) {

      throw error;

      logger.error('Error initializing PlexClient:', error);
      
      // Fail if there's an error and USE_MOCK_PLEX isn't set
      logger.error('Set USE_MOCK_PLEX=true if you want to use the mock client');
      throw new Error('Failed to initialize PlexClient. Set USE_MOCK_PLEX=true to use mock client instead.');
    }
  }

  // Create Express app
  const app = express();
  app.use(express.json());

  // Initialize the MCP Server
  const server = new McpServer({
    name: "plex-media-retriever",
    description: "Retrieve movies and TV shows from a Plex Media Server",
    author: "MCP Developer",
    version: "1.0.0"
  });

  // Define and register tools for each endpoint
  server.tool(
    "get-libraries",
    {},
    async () => {
      logger.info('Getting libraries...');
      try {
        const libraries = await plexClient.getLibraries();
        logger.info('Libraries retrieved');
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              libraries: libraries.map((lib: any) => ({
                id: lib.key,
                title: lib.title,
                type: lib.type
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error getting libraries:', error);
        return {
          content: [{
            type: "text", 
            text: `Error getting libraries: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get-library-contents",
    { 
      libraryId: z.string().describe("The ID of the library"),
      type: z.number().optional().describe("The type of content to retrieve (1=movie, 2=show, 3=season, 4=episode)"),
      tag: z.enum(['newest', 'recentlyAdded', 'recentlyViewed', 'onDeck', 'unwatched', 'collection']).optional().describe("The tag to filter by"),
      start: z.number().optional().describe("Starting index for pagination (default: 0)"),
      size: z.number().optional().describe("Number of items to return (default: 20)")
    },
    async ({ libraryId, type = 1, tag = 'newest', start = 0, size = 20 }) => {
      try {
        logger.info(`Getting library contents for library ${libraryId} with type=${type}, tag=${tag}, start=${start}, size=${size}`);
        
        // Convert string tag to Tag enum
        const tagEnum = tag === 'newest' ? Tag.Newest :
                       tag === 'recentlyAdded' ? Tag.RecentlyAdded :
                       tag === 'recentlyViewed' ? Tag.RecentlyViewed :
                       tag === 'onDeck' ? Tag.OnDeck :
                       tag === 'unwatched' ? Tag.Unwatched :
                       tag === 'collection' ? Tag.Collection : Tag.Newest;
        
        const result = await plexClient.getLibraryContents(libraryId, type, tagEnum, start, size);
        
        // Transform the media items based on their type
        const mediaItems = result.items.map((item: any) => {
          const baseInfo = {
            id: item.ratingKey,
            title: item.title,
            year: item.year,
            type: item.type
          };
          
          if (item.type === 'movie') {
            return {
              ...baseInfo,
              duration: item.duration,
              rating: item.rating,
              summary: item.summary
            };
          } else if (item.type === 'show') {
            return {
              ...baseInfo,
              seasons: item.childCount,
              summary: item.summary
            };
          }
          
          return baseInfo;
        });
        
        // Create a properly structured response object that matches the expected schema
        const responseObject = {
          MediaContainer: {
            content: "library items", // Adding the required content field
            totalSize: result.totalSize,
            Metadata: result.items.map((item: any) => {
              // Ensure each Media item has optimizedForStreaming
              if (item.Media && Array.isArray(item.Media)) {
                item.Media = item.Media.map((mediaItem: any) => ({
                  ...mediaItem,
                  optimizedForStreaming: mediaItem.optimizedForStreaming !== undefined ? 
                    mediaItem.optimizedForStreaming : 1
                }));
              } else if (!item.Media) {
                item.Media = [{ optimizedForStreaming: 1 }];
              }
              return item;
            })
          }
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ 
              media: mediaItems,
              totalSize: result.totalSize,
              object: responseObject // Include the properly structured object for validation
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error getting library contents for ${libraryId}:`, error);
        return {
          content: [{
            type: "text", 
            text: `Error getting library contents: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get-movies",
    {},
    async () => {
      try {
        logger.info('Getting movies...');
        const movies = await plexClient.getMovies();
        
        const movieItems = movies.map((movie: any) => ({
          id: movie.ratingKey,
          title: movie.title,
          year: movie.year,
          duration: movie.duration,
          rating: movie.rating,
          summary: movie.summary
        }));
        
        // Create a properly structured response object that matches the expected schema
        const responseObject = {
          MediaContainer: {
            content: "movies", // Adding the required content field
            Metadata: movies.map((item: any) => {
              // Ensure each Media item has optimizedForStreaming
              if (item.Media && Array.isArray(item.Media)) {
                item.Media = item.Media.map((mediaItem: any) => ({
                  ...mediaItem,
                  optimizedForStreaming: mediaItem.optimizedForStreaming !== undefined ? 
                    mediaItem.optimizedForStreaming : 1
                }));
              } else if (!item.Media) {
                item.Media = [{ optimizedForStreaming: 1 }];
              }
              return item;
            })
          }
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ 
              movies: movieItems,
              object: responseObject // Include the properly structured object for validation
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error getting movies:', error);
        return {
          content: [{
            type: "text", 
            text: `Error getting movies: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get-seasons",
    { showId: z.string().describe("The rating key of the TV show") },
    async ({ showId }) => {
      try {
        logger.info(`Getting seasons for show ${showId}`);
        const seasons = await plexClient.getSeasons(showId);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              seasons: seasons.map((season: any) => ({
                id: season.ratingKey,
                title: season.title,
                seasonNumber: season.index,
                episodeCount: season.leafCount
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error getting seasons for show ${showId}:`, error);
        return {
          content: [{
            type: "text", 
            text: `Error getting seasons: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get-episodes",
    { seasonId: z.string().describe("The rating key of the season") },
    async ({ seasonId }) => {
      try {
        logger.info(`Getting episodes for season ${seasonId}`);
        const episodes = await plexClient.getEpisodes(seasonId);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              episodes: episodes.map((episode: any) => ({
                id: episode.ratingKey,
                title: episode.title,
                seasonNumber: episode.parentIndex,
                episodeNumber: episode.index,
                duration: episode.duration,
                summary: episode.summary
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error getting episodes for season ${seasonId}:`, error);
        return {
          content: [{
            type: "text", 
            text: `Error getting episodes: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "search",
    { query: z.string().describe("The search query") },
    async ({ query }) => {
      try {
        if (!query || query.trim() === '') {
          return {
            content: [{
              type: "text",
              text: "Error: Search query is required"
            }],
            isError: true
          };
        }
        
        logger.info(`Searching for "${query}"`);
        const results = await plexClient.search(query);
        
        // Create a properly structured response object that matches the expected schema
        const responseObject = {
          MediaContainer: {
            content: "search results", // Adding the required content field
            Metadata: results.map((item: any) => {
              // Ensure each Media item has optimizedForStreaming
              if (item.Media && Array.isArray(item.Media)) {
                item.Media = item.Media.map((mediaItem: any) => ({
                  ...mediaItem,
                  optimizedForStreaming: mediaItem.optimizedForStreaming !== undefined ? 
                    mediaItem.optimizedForStreaming : 1
                }));
              } else if (!item.Media) {
                item.Media = [{ optimizedForStreaming: 1 }];
              }
              return item;
            })
          }
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              results: results.map((item: any) => ({
                id: item.ratingKey,
                title: item.title,
                type: item.type,
                year: item.year
              })),
              object: responseObject // Include the properly structured object for validation
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error searching for "${query}":`, error);
        return {
          content: [{
            type: "text", 
            text: `Error searching: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get-watchlist",
    { 
      filter: z.enum(['all', 'available', 'released']).optional()
        .describe("Optional filter: 'all', 'available', or 'released'") 
    },
    async ({ filter }) => {
      try {
        logger.info(`Getting watchlist with filter: ${filter || 'none'}`);
        const watchlist = await plexClient.getWatchList(filter as Filter);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              watchlist: watchlist.map((item: any) => {
                const baseInfo = {
                  id: item.ratingKey,
                  title: item.title,
                  year: item.year,
                  type: item.type
                };
                
                if (item.type === 'movie') {
                  return {
                    ...baseInfo,
                    duration: item.duration,
                    rating: item.rating,
                    summary: item.summary
                  };
                } else if (item.type === 'show') {
                  return {
                    ...baseInfo,
                    seasons: item.childCount,
                    summary: item.summary
                  };
                }
                
                return baseInfo;
              })
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error(`Error getting watchlist with filter ${filter || 'none'}:`, error);
        return {
          content: [{
            type: "text", 
            text: `Error getting watchlist: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "get-devices",
    {},
    async () => {
      try {
        logger.info('Getting Plex devices...');
        const devices = await plexClient.getDevices();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              devices: devices.map((device: any) => ({
                id: device.clientIdentifier,
                name: device.name,
                product: device.product,
                productVersion: device.productVersion,
                platform: device.platform,
                platformVersion: device.platformVersion,
                device: device.device,
                model: device.model,
                vendor: device.vendor,
                provides: device.provides,
                owned: device.owned,
                lastSeenAt: device.lastSeenAt,
                publicAddress: device.publicAddress
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error getting devices:', error);
        return {
          content: [{
            type: "text", 
            text: `Error getting devices: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Start the server with Express HTTP transport
  const PORT = parseInt(process.env.PORT || '3000', 10);
  
  // Create a single SSE transport instance for the server
  let sseTransport: SSEServerTransport | null = null;
  
  app.get('/sse', async (req, res) => {
    sseTransport = new SSEServerTransport("/messages", res);
    await server.connect(sseTransport);
  });
  
  app.post('/messages', async (req, res) => {
    if (!sseTransport) {
      return res.status(400).json({ error: "No active SSE connection" });
    }
    
    await sseTransport.handlePostMessage(req, res);
  });
  
  app.listen(PORT, () => {
    logger.info(`Plex MCP server running on http://localhost:${PORT}`);
    logger.info(`MCP SSE endpoint at http://localhost:${PORT}/sse`);
    logger.info(`MCP messages endpoint at http://localhost:${PORT}/messages`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export { main };

// Skip process.exit in test environments
if (process.env.NODE_ENV !== 'test') {
  main().catch(error => {
    logger.error('Application failed to start:', error);
    process.exit(1);
  });
}
