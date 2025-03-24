import * as dotenv from 'dotenv';
import { MockPlexClient } from '../mocks/MockPlexClient';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Set NODE_ENV to 'test' to prevent process.exit in the server code
process.env.NODE_ENV = 'test';

// Mock the McpServer
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      tool: jest.fn().mockReturnThis(),
      connect: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock the transports
jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => {
  return {
    SSEServerTransport: jest.fn().mockImplementation(() => ({
      handlePostMessage: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: jest.fn().mockImplementation(() => ({}))
  };
});

// Mock express
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation((path, callback) => {
      if (path === '/sse') {
        const req = {};
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        callback(req, res);
      }
      return mockApp;
    }),
    post: jest.fn().mockImplementation((path, callback) => {
      if (path === '/messages') {
        const req = {};
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        callback(req, res);
      }
      return mockApp;
    }),
    listen: jest.fn().mockImplementation((port, callback) => {
      if (callback) callback();
      return mockApp;
    })
  };
  
  const mockExpress: any = jest.fn().mockReturnValue(mockApp);
  mockExpress.json = jest.fn().mockReturnValue(() => {});
  
  return mockExpress;
});

// Mock the PlexClient
jest.mock('../PlexClient', () => {
  return {
    PlexClient: jest.fn().mockImplementation(() => {
      throw new Error('Plex token is required');
    })
  };
});

// Set up environment for testing
process.env.PORT = '3001';

describe('Plex MCP Server', () => {
  let originalConsoleLog: any;
  let originalConsoleError: any;
  
  beforeEach(() => {
    // Mock console methods to prevent noise in test output
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  it('should initialize the server with correct configuration', async () => {
    // Import the main function dynamically to avoid hoisting issues with mocks
    const serverModule = await import('../plex-mcp-server-ts');
    const main = serverModule.main;
    
    // Execute the main function
    await main();
    
    // Verify McpServer was initialized with correct config
    expect(McpServer).toHaveBeenCalledWith({
      name: "plex-media-retriever",
      description: "Retrieve movies and TV shows from a Plex Media Server",
      author: "MCP Developer",
      version: "1.0.0"
    });
  });
  
  it('should register the tools with the MCP server', async () => {
    // Import the main function
    const serverModule = await import('../plex-mcp-server-ts');
    const main = serverModule.main;
    
    // Execute the main function
    await main();
    
    // Get the mock MCP server instance
    const mockServer = (McpServer as jest.Mock).mock.results[0].value;
    
    // Verify that tool was called for each endpoint
    expect(mockServer.tool).toHaveBeenCalledTimes(7); // 7 tools in total
    
    // Check that specific tools were registered
    const toolCalls = mockServer.tool.mock.calls.map((call: any) => call[0]);
    expect(toolCalls).toContain('get-libraries');
    expect(toolCalls).toContain('get-library-contents');
    expect(toolCalls).toContain('get-movies');
    expect(toolCalls).toContain('get-seasons');
    expect(toolCalls).toContain('get-episodes');
    expect(toolCalls).toContain('search');
    expect(toolCalls).toContain('get-watchlist');
  });
  
  it('should use MockPlexClient when PlexClient fails to initialize', async () => {
    // Mock console.log to capture calls
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;
    
    // Import the main function
    const serverModule = await import('../plex-mcp-server-ts');
    const main = serverModule.main;
    
    // Execute the main function
    await main();
    
    // Verify that MockPlexClient was used
    expect(mockConsoleLog).toHaveBeenCalledWith('Using mock PlexClient for testing.');
  });
  
  it('should set up Express endpoints correctly', async () => {
    // Import express to get the mock
    const express = require('express');
    const mockApp = express();
    
    // Import the main function
    const serverModule = await import('../plex-mcp-server-ts');
    const main = serverModule.main;
    
    // Execute the main function
    await main();
    
    // Verify that Express routes were set up
    expect(mockApp.use).toHaveBeenCalled();
    expect(mockApp.get).toHaveBeenCalledWith('/sse', expect.any(Function));
    expect(mockApp.post).toHaveBeenCalledWith('/messages', expect.any(Function));
    expect(mockApp.listen).toHaveBeenCalledWith(3001, expect.any(Function));
    
    // Verify SSE transport was initialized
    expect(SSEServerTransport).toHaveBeenCalled();
  });
  
  it('should connect to both transports', async () => {
    // Import the main function
    const serverModule = await import('../plex-mcp-server-ts');
    const main = serverModule.main;
    
    // Execute the main function
    await main();
    
    // Get the mock MCP server instance
    const mockServer = (McpServer as jest.Mock).mock.results[0].value;
    
    // Verify connect was called for both transports
    expect(mockServer.connect).toHaveBeenCalledTimes(2);
    expect(StdioServerTransport).toHaveBeenCalled();
  });
}); 