import express from 'express';
import { MCPServer } from '../mocks/mcp-sdk';
import { PlexClient } from '../PlexClient';

// Define request and response types
interface MockRequest {
  params: Record<string, any>;
  query: Record<string, any>;
  body: any;
}

interface MockResponse {
  status: (code: number) => { json: (data: any) => any };
}

// Mock PlexClient
jest.mock('../PlexClient');
const MockedPlexClient = PlexClient as jest.MockedClass<typeof PlexClient>;

describe('MCP Server', () => {
  let app: express.Application;
  let mcpServer: MCPServer;
  let plexClient: jest.Mocked<PlexClient>;

  beforeEach(() => {
    app = express();
    plexClient = new MockedPlexClient() as jest.Mocked<PlexClient>;
    
    mcpServer = new MCPServer({
      name: "plex-media-retriever",
      description: "Test MCP Server",
      author: "Test Author",
      version: "1.0.0",
      authentication: { type: "none" },
      expressApp: app
    });

    // Implement the /libraries endpoint for testing
    mcpServer.implement("/libraries", async (req: MockRequest, res: MockResponse) => {
      try {
        const libraries = await plexClient.getLibraries();
        return {
          status: 200,
          body: {
            libraries: libraries.map(lib => ({
              id: lib.key,
              title: lib.title,
              type: lib.type
            }))
          }
        };
      } catch (error) {
        return {
          status: 500,
          body: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    });
  });

  describe('GET /libraries', () => {
    it('should return transformed libraries', async () => {
      const mockLibraries = [
        { key: '1', title: 'Movies', type: 'movie' },
        { key: '2', title: 'TV Shows', type: 'show' }
      ];

      plexClient.getLibraries.mockResolvedValueOnce(mockLibraries);

      const response = await mcpServer.testEndpoint('/libraries', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        libraries: mockLibraries.map(lib => ({
          id: lib.key,
          title: lib.title,
          type: lib.type
        }))
      });
    });

    it('should handle errors', async () => {
      plexClient.getLibraries.mockRejectedValueOnce(new Error('Test error'));

      const response = await mcpServer.testEndpoint('/libraries', {
        method: 'GET'
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 