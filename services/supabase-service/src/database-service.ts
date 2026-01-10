import { supabase } from './supabaseClient';
import { TablesService } from './services/tables-service';
import { SecretsService } from './services/secrets-service';
import { ClientConfigService } from './services/client-config-service';

/**
 * Main Database Service
 * Provides comprehensive database operations for Supabase tables and secrets
 */
export class DatabaseService {
  public readonly tables: TablesService;
  public readonly secrets: SecretsService;
  public readonly clientConfigs: ClientConfigService;

  constructor() {
    this.tables = new TablesService(supabase);
    this.secrets = new SecretsService(supabase);
    this.clientConfigs = new ClientConfigService();
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      const { error } = await supabase.from('_health').select('1').limit(1);
      if (error) {
        // If health table doesn't exist, try any simple query
        const { error: simpleError } = await supabase.auth.getSession();
        if (simpleError) {
          return { status: 'error', message: simpleError.message };
        }
      }
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Get database metadata and statistics
   */
  async getDatabaseInfo(): Promise<{
    tables: string[];
    version: string;
    connection: 'healthy' | 'error';
  }> {
    try {
      // Get list of tables from information_schema
      const { data: tables, error: tablesError } = await supabase.rpc('get_table_list');

      if (tablesError) {
        console.warn('Could not fetch table list:', tablesError);
      }

      const { data: version } = await supabase.rpc('version');

      const health = await this.healthCheck();

      return {
        tables: tables ?? [],
        version: version ?? 'unknown',
        connection: health.status === 'ok' ? 'healthy' : 'error',
      };
    } catch (error) {
      console.error('Error getting database info:', error);
      return {
        tables: [],
        version: 'unknown',
        connection: 'error',
      };
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
