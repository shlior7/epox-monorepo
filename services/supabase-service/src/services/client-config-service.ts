/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { supabase } from '../supabaseClient';
import { SecretsService } from './secrets-service';

export interface ClientConfig {
  /** Matches the `id` column of your Clients table and the secret name in Vault */
  clientId: string;
  /** e.g. "https://www.drzoom.co.il/odata" */
  baseUrl: string;
  /** e.g. "tabula.ini/a310512" */
  companyDb: string;
  /** e.g. "MARO_SHOWERTYPE" */
  productEntity: string;
  /** e.g. "MARO_SHOWERTYPEPART_SUBFORM" */
  partsSubform: string;
  /** e.g. "LOGPART" */
  partsEntity: string;
  /** e.g. properties of the parts entity */
  partsProperties: string;
  /** e.g. "LOGCOUNTERS_SUBFORM" */
  partsDetailsSubform: string;
  /** e.g. properties of the parts subforms data */
  partsSubformProperties: string;
  /** Name of the Supabase Vault secret that holds JSON creds */
  secretName: string;
  // Optional metadata fields
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  description?: string;
}

export interface CreateClientConfigInput {
  clientId: string;
  baseUrl: string;
  companyDb: string;
  productEntity: string;
  partsSubform: string;
  partsEntity: string;
  partsProperties: string | object;
  partsDetailsSubform: string;
  partsSubformProperties: string | object;
  secretName: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateClientConfigInput extends Partial<CreateClientConfigInput> {
  clientId: string;
}

export class ClientConfigService {
  private secrets: SecretsService;

  constructor() {
    this.secrets = new SecretsService(supabase);
  }

  /**
   * Create the Clients table if it doesn't exist
   */
  async createClientsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public."Clients" (
        "clientId" TEXT PRIMARY KEY,
        "baseUrl" TEXT NOT NULL,
        "companyDb" TEXT NOT NULL,
        "productEntity" TEXT NOT NULL,
        "partsSubform" TEXT NOT NULL,
        "partsEntity" TEXT NOT NULL,
        "partsProperties" TEXT NOT NULL,
        "partsDetailsSubform" TEXT NOT NULL,
        "partsSubformProperties" TEXT NOT NULL,
        "secretName" TEXT NOT NULL,
        "description" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Create trigger to automatically update updatedAt
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_clients_updated_at ON public."Clients";
      CREATE TRIGGER update_clients_updated_at
        BEFORE UPDATE ON public."Clients"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_clients_active ON public."Clients" ("isActive");
      CREATE INDEX IF NOT EXISTS idx_clients_secret_name ON public."Clients" ("secretName");
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });
    if (error) {
      throw new Error(`Failed to create Clients table: ${error.message}`);
    }
  }

  /**
   * Get a client configuration by ID
   */
  async getClientConfig(clientId: string): Promise<ClientConfig | null> {
    try {
      const { data, error } = await supabase.from('Clients').select('*').eq('clientId', clientId).single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        throw error;
      }

      return this.formatClientConfig(data);
    } catch (error) {
      throw new Error(`Failed to get client config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all client configurations
   */
  async getAllClientConfigs(activeOnly = true): Promise<ClientConfig[]> {
    try {
      let query = supabase.from('Clients').select('*');

      if (activeOnly) {
        query = query.eq('isActive', true);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });

      if (error) {
        throw error;
      }

      return data ? data.map((item) => this.formatClientConfig(item)) : [];
    } catch (error) {
      throw new Error(`Failed to get client configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new client configuration
   */
  async createClientConfig(input: CreateClientConfigInput): Promise<ClientConfig> {
    try {
      // Ensure JSON fields are properly stringified
      const clientData = {
        ...input,
        partsProperties: typeof input.partsProperties === 'object' ? JSON.stringify(input.partsProperties) : input.partsProperties,
        partsSubformProperties:
          typeof input.partsSubformProperties === 'object' ? JSON.stringify(input.partsSubformProperties) : input.partsSubformProperties,
        isActive: input.isActive ?? true,
      };

      const { data, error } = await supabase.from('Clients').insert([clientData]).select().single();

      if (error) {
        throw error;
      }

      return this.formatClientConfig(data);
    } catch (error) {
      throw new Error(`Failed to create client config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing client configuration
   */
  async updateClientConfig(input: UpdateClientConfigInput): Promise<ClientConfig> {
    try {
      const updateData = { ...input };

      // Handle JSON fields
      if (input.partsProperties) {
        updateData.partsProperties =
          typeof input.partsProperties === 'object' ? JSON.stringify(input.partsProperties) : input.partsProperties;
      }

      if (input.partsSubformProperties) {
        updateData.partsSubformProperties =
          typeof input.partsSubformProperties === 'object' ? JSON.stringify(input.partsSubformProperties) : input.partsSubformProperties;
      }

      const { data, error } = await supabase.from('Clients').update(updateData).eq('clientId', input.clientId).select().single();

      if (error) {
        throw error;
      }

      return this.formatClientConfig(data);
    } catch (error) {
      throw new Error(`Failed to update client config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a client configuration
   */
  async deleteClientConfig(clientId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('Clients').delete().eq('clientId', clientId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete client config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a client configuration exists
   */
  async clientConfigExists(clientId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('Clients').select('clientId').eq('clientId', clientId).single();

      return !error && data != null;
    } catch {
      return false;
    }
  }

  /**
   * Get client configuration with associated secret
   */
  async getClientConfigWithCredentials(clientId: string): Promise<{ config: ClientConfig; credentials: unknown } | null> {
    try {
      const config = await this.getClientConfig(clientId);
      if (!config) {
        return null;
      }

      // Get credentials from vault using the secrets service
      const credentialsResult = await this.secrets.getSecret(config.secretName);

      return {
        config,

        credentials: credentialsResult?.data ?? null,
      };
    } catch (error) {
      throw new Error(`Failed to get client config with credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format client config for consistent output
   */
  private formatClientConfig(data: unknown): ClientConfig {
    const item = data as Record<string, unknown>;
    return {
      clientId: item.clientId as string,
      baseUrl: item.baseUrl as string,
      companyDb: item.companyDb as string,
      productEntity: item.productEntity as string,
      partsSubform: item.partsSubform as string,
      partsEntity: item.partsEntity as string,
      partsProperties: item.partsProperties as string,
      partsDetailsSubform: item.partsDetailsSubform as string,
      partsSubformProperties: item.partsSubformProperties as string,
      secretName: item.secretName as string,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
      isActive: item.isActive as boolean,
      description: item.description as string,
    };
  }
}
