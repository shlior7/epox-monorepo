/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { DatabaseService } from '../database-service';
import type { CreateClientConfigInput, UpdateClientConfigInput } from '../services/client-config-service';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Serverless API handler for Client Configuration management
 * Can be deployed to Vercel, Netlify, AWS Lambda, etc.
 */
export class ClientConfigAPI {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Handle HTTP requests for client configuration operations
   */
  async handleRequest(method: string, path: string, body?: any, query?: Record<string, string>): Promise<ApiResponse> {
    try {
      // Parse path to extract clientId
      const pathParts = path.split('/').filter(Boolean);
      const clientId = pathParts.at(-1)!;

      switch (method.toUpperCase()) {
        case 'GET':
          return await this.handleGet(clientId, query);
        case 'POST':
          return await this.handlePost(body);
        case 'PUT':
        case 'PATCH':
          return await this.handleUpdate(clientId, body);
        case 'DELETE':
          return await this.handleDelete(clientId);
        default:
          return {
            success: false,
            error: `Method ${method} not allowed`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Handle GET requests
   */
  private async handleGet(clientId: string, query?: Record<string, string>): Promise<ApiResponse> {
    try {
      // If no clientId provided, return all clients
      if (!clientId || clientId === 'clients') {
        const activeOnly = query?.active !== 'false';
        const clients = await this.db.clientConfigs.getAllClientConfigs(activeOnly);
        return {
          success: true,
          data: clients,
          message: `Found ${clients.length} client configurations`,
        };
      }

      // Get specific client with or without credentials
      const includeCredentials = query?.includeCredentials === 'true';

      if (includeCredentials) {
        const result = await this.db.clientConfigs.getClientConfigWithCredentials(clientId);
        if (!result) {
          return {
            success: false,
            error: `Client configuration '${clientId}' not found`,
          };
        }
        return {
          success: true,
          data: result,
        };
      }
      const client = await this.db.clientConfigs.getClientConfig(clientId);
      if (!client) {
        return {
          success: false,
          error: `Client configuration '${clientId}' not found`,
        };
      }
      return {
        success: true,
        data: client,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve client configuration',
      };
    }
  }

  /**
   * Handle POST requests (create new client)
   */
  private async handlePost(body: CreateClientConfigInput): Promise<ApiResponse> {
    try {
      if (!body) {
        return {
          success: false,
          error: 'Request body is required',
        };
      }

      // Validate input
      const validation = this.validateCreateInput(body);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Check if client already exists
      const exists = await this.db.clientConfigs.clientConfigExists(body.clientId);
      if (exists) {
        return {
          success: false,
          error: `Client configuration '${body.clientId}' already exists`,
        };
      }

      const client = await this.db.clientConfigs.createClientConfig(body);
      return {
        success: true,
        data: client,
        message: `Client configuration '${client.clientId}' created successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create client configuration',
      };
    }
  }

  /**
   * Handle PUT/PATCH requests (update client)
   */
  private async handleUpdate(clientId: string, body: Partial<UpdateClientConfigInput>): Promise<ApiResponse> {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required in the URL path',
        };
      }

      if (!body) {
        return {
          success: false,
          error: 'Request body is required',
        };
      }

      // Check if client exists
      const exists = await this.db.clientConfigs.clientConfigExists(clientId);
      if (!exists) {
        return {
          success: false,
          error: `Client configuration '${clientId}' not found`,
        };
      }

      const updateData = { ...body, clientId };
      const client = await this.db.clientConfigs.updateClientConfig(updateData);

      return {
        success: true,
        data: client,
        message: `Client configuration '${clientId}' updated successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update client configuration',
      };
    }
  }

  /**
   * Handle DELETE requests
   */
  private async handleDelete(clientId: string): Promise<ApiResponse> {
    try {
      if (!clientId) {
        return {
          success: false,
          error: 'Client ID is required in the URL path',
        };
      }

      // Check if client exists
      const exists = await this.db.clientConfigs.clientConfigExists(clientId);
      if (!exists) {
        return {
          success: false,
          error: `Client configuration '${clientId}' not found`,
        };
      }

      await this.db.clientConfigs.deleteClientConfig(clientId);

      return {
        success: true,
        message: `Client configuration '${clientId}' deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete client configuration',
      };
    }
  }

  /**
   * Validate create input
   */
  private validateCreateInput(input: CreateClientConfigInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!input.clientId?.trim()) {
      errors.push('clientId is required');
    }
    if (!input.baseUrl?.trim()) {
      errors.push('baseUrl is required');
    }
    if (!input.companyDb?.trim()) {
      errors.push('companyDb is required');
    }
    if (!input.productEntity?.trim()) {
      errors.push('productEntity is required');
    }
    if (!input.partsSubform?.trim()) {
      errors.push('partsSubform is required');
    }
    if (!input.partsEntity?.trim()) {
      errors.push('partsEntity is required');
    }
    if (!input.partsProperties) {
      errors.push('partsProperties is required');
    }
    if (!input.partsDetailsSubform?.trim()) {
      errors.push('partsDetailsSubform is required');
    }
    if (!input.partsSubformProperties) {
      errors.push('partsSubformProperties is required');
    }
    if (!input.secretName?.trim()) {
      errors.push('secretName is required');
    }

    // URL validation
    if (input.baseUrl && !this.isValidUrl(input.baseUrl)) {
      errors.push('baseUrl must be a valid URL');
    }

    // JSON validation
    if (input.partsProperties && typeof input.partsProperties === 'string') {
      try {
        JSON.parse(input.partsProperties);
      } catch {
        errors.push('partsProperties must be valid JSON');
      }
    }

    if (input.partsSubformProperties && typeof input.partsSubformProperties === 'string') {
      try {
        JSON.parse(input.partsSubformProperties);
      } catch {
        errors.push('partsSubformProperties must be valid JSON');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Simple URL validation
   */
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }
}

// Utility functions for different serverless platforms

/**
 * Vercel API Route handler
 */
export async function vercelHandler(req: any, res: any) {
  const api = new ClientConfigAPI();

  try {
    const { method, url, body, query } = req;
    const result = await api.handleRequest(method, url, body, query);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Netlify Function handler
 */
export async function netlifyHandler(event: any, context: any) {
  const api = new ClientConfigAPI();

  try {
    const { httpMethod, path, body, queryStringParameters } = event;
    const parsedBody = body ? JSON.parse(body) : undefined;

    const result = await api.handleRequest(httpMethod, path, parsedBody, queryStringParameters);

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    };
  }
}

/**
 * AWS Lambda handler
 */
export async function lambdaHandler(event: any, context: any) {
  const api = new ClientConfigAPI();

  try {
    const { httpMethod, path, body, queryStringParameters } = event;
    const parsedBody = body ? JSON.parse(body) : undefined;

    const result = await api.handleRequest(httpMethod, path, parsedBody, queryStringParameters);

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    };
  }
}
