-- Migration: Monitoring and Health Checks
-- Date: 2025-07-28
-- Description: Create tables for metrics storage and system status tracking

-- Create metrics table for performance data collection
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  tags JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON metrics (name, timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_tags ON metrics USING GIN (tags);

-- Create system_status table for component health tracking
CREATE TABLE IF NOT EXISTS system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL, -- healthy, degraded, down, warning
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for system status queries
CREATE INDEX IF NOT EXISTS idx_system_status_component_timestamp ON system_status (component, timestamp);
CREATE INDEX IF NOT EXISTS idx_system_status_timestamp ON system_status (timestamp);
CREATE INDEX IF NOT EXISTS idx_system_status_status ON system_status (status);

-- Insert initial system status records
INSERT INTO system_status (component, status, details) VALUES
  ('database', 'healthy', '{"message": "Initial health check setup"}'),
  ('gmail_api', 'healthy', '{"message": "Initial health check setup"}'),
  ('openai_api', 'healthy', '{"message": "Initial health check setup"}'),
  ('email_sync_cron', 'healthy', '{"message": "Initial health check setup"}')
ON CONFLICT DO NOTHING;

-- Create a function to clean up old metrics (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM metrics 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  INSERT INTO system_status (component, status, details)
  VALUES ('metrics_cleanup', 'completed', jsonb_build_object(
    'deleted_records', deleted_count,
    'cleanup_date', NOW()
  ));
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old system status records (older than 7 days, keep latest per component)
CREATE OR REPLACE FUNCTION cleanup_old_system_status()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep latest 100 records per component and delete older than 7 days
  WITH ranked_status AS (
    SELECT id, component, timestamp,
           ROW_NUMBER() OVER (PARTITION BY component ORDER BY timestamp DESC) as rn
    FROM system_status
    WHERE timestamp < NOW() - INTERVAL '7 days'
  )
  DELETE FROM system_status 
  WHERE id IN (
    SELECT id FROM ranked_status WHERE rn > 100
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security) for the tables if needed
-- ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust as needed based on your RLS policies)
-- GRANT ALL ON metrics TO authenticated;
-- GRANT ALL ON system_status TO authenticated;

COMMENT ON TABLE metrics IS 'Stores performance metrics and monitoring data';
COMMENT ON TABLE system_status IS 'Tracks the health status of system components';
COMMENT ON FUNCTION cleanup_old_metrics() IS 'Removes metrics older than 30 days';
COMMENT ON FUNCTION cleanup_old_system_status() IS 'Removes old system status records while keeping recent ones per component';