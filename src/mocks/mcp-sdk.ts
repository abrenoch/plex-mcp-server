import express from 'express';

// Mock types to match the MCP SDK
export enum ParameterType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array'
}

export interface Parameter {
  name: string;
  description: string;
  required: boolean;
  schema: { type: ParameterType };
  in: 'path' | 'query' | 'body';
}

export interface MCPEndpoint {
  path: string;
  description: string;
  methods: string[];
  parameters: Parameter[];
}

interface MCPServerOptions {
  name: string;
  description: string;
  author: string;
  version: string;
  authentication: { type: string };
  expressApp: express.Application;
}

interface TestEndpointOptions {
  method: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
}

interface TestEndpointResponse {
  status: number;
  body: any;
}

// Mock MCPServer class
export class MCPServer {
  private app: express.Application;
  private endpoints: MCPEndpoint[] = [];
  private handlers: Map<string, Function> = new Map();

  constructor(options: MCPServerOptions) {
    this.app = options.expressApp;
  }

  addEndpoints(endpoints: MCPEndpoint[]): void {
    this.endpoints.push(...endpoints);
  }

  implement(path: string, handler: Function): void {
    this.handlers.set(path, handler);
  }

  listen(port: number): void {
    // Mock implementation that doesn't actually start a server
    console.log(`Mock MCP server would listen on port ${port}`);
  }

  // Test helper method
  async testEndpoint(path: string, options: TestEndpointOptions): Promise<TestEndpointResponse> {
    const handler = this.handlers.get(path);
    if (!handler) {
      return {
        status: 404,
        body: { error: 'Endpoint not found' }
      };
    }

    try {
      const req = {
        params: options.params || {},
        query: options.query || {},
        body: options.body || {}
      };
      const res = {
        status: (code: number) => ({ 
          json: (data: any) => ({ status: code, body: data })
        })
      };

      const result = await handler(req, res);
      return result || { status: 200, body: {} };
    } catch (error) {
      return {
        status: 500,
        body: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
} 