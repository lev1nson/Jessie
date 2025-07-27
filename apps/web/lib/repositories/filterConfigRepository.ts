import { createServiceSupabase } from '@jessie/lib';
import { FilterConfig } from '@jessie/lib';
import { FilterConfigSchema } from '../filters/config';

export class FilterConfigRepository {
  private supabase;

  constructor() {
    this.supabase = createServiceSupabase();
  }

  /**
   * Get all filter configurations for a user
   */
  async getUserFilterConfigs(userId: string): Promise<FilterConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('filter_config')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user filter configs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch user filter configs:', error);
      return [];
    }
  }

  /**
   * Create a new filter configuration
   */
  async createFilterConfig(
    userId: string,
    domainPattern: string,
    filterType: 'blacklist' | 'whitelist'
  ): Promise<FilterConfig | null> {
    try {
      // Validate input
      const validation = FilterConfigSchema.safeParse({
        domain_pattern: domainPattern,
        filter_type: filterType,
      });

      if (!validation.success) {
        console.error('Invalid filter config data:', validation.error);
        return null;
      }

      const { data, error } = await this.supabase
        .from('filter_config')
        .insert({
          user_id: userId,
          domain_pattern: domainPattern,
          filter_type: filterType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating filter config:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to create filter config:', error);
      return null;
    }
  }

  /**
   * Update an existing filter configuration
   */
  async updateFilterConfig(
    configId: string,
    userId: string,
    updates: Partial<Pick<FilterConfig, 'domain_pattern' | 'filter_type'>>
  ): Promise<FilterConfig | null> {
    try {
      // Validate updates
      if (updates.domain_pattern !== undefined || updates.filter_type !== undefined) {
        const validation = FilterConfigSchema.partial().safeParse(updates);
        if (!validation.success) {
          console.error('Invalid filter config updates:', validation.error);
          return null;
        }
      }

      const { data, error } = await this.supabase
        .from('filter_config')
        .update(updates)
        .eq('id', configId)
        .eq('user_id', userId) // Ensure user can only update their own configs
        .select()
        .single();

      if (error) {
        console.error('Error updating filter config:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to update filter config:', error);
      return null;
    }
  }

  /**
   * Delete a filter configuration
   */
  async deleteFilterConfig(configId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('filter_config')
        .delete()
        .eq('id', configId)
        .eq('user_id', userId); // Ensure user can only delete their own configs

      if (error) {
        console.error('Error deleting filter config:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete filter config:', error);
      return false;
    }
  }

  /**
   * Check if a domain pattern already exists for the user
   */
  async domainPatternExists(
    userId: string, 
    domainPattern: string, 
    filterType: 'blacklist' | 'whitelist'
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('filter_config')
        .select('id')
        .eq('user_id', userId)
        .eq('domain_pattern', domainPattern)
        .eq('filter_type', filterType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking domain pattern existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check domain pattern existence:', error);
      return false;
    }
  }

  /**
   * Get filter configurations by type
   */
  async getFilterConfigsByType(
    userId: string, 
    filterType: 'blacklist' | 'whitelist'
  ): Promise<FilterConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('filter_config')
        .select('*')
        .eq('user_id', userId)
        .eq('filter_type', filterType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching filter configs by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch filter configs by type:', error);
      return [];
    }
  }

  /**
   * Bulk create filter configurations
   */
  async createFilterConfigsBatch(
    userId: string,
    configs: Array<{
      domain_pattern: string;
      filter_type: 'blacklist' | 'whitelist';
    }>
  ): Promise<FilterConfig[]> {
    if (configs.length === 0) {
      return [];
    }

    try {
      // Validate all configs
      for (const config of configs) {
        const validation = FilterConfigSchema.safeParse(config);
        if (!validation.success) {
          console.error('Invalid filter config in batch:', validation.error);
          return [];
        }
      }

      const configsToInsert = configs.map(config => ({
        user_id: userId,
        domain_pattern: config.domain_pattern,
        filter_type: config.filter_type,
      }));

      const { data, error } = await this.supabase
        .from('filter_config')
        .insert(configsToInsert)
        .select();

      if (error) {
        console.error('Error creating filter configs batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to create filter configs batch:', error);
      return [];
    }
  }
}