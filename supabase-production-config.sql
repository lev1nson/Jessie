-- Supabase Production Configuration
-- Additional setup for production environment
-- Run AFTER the main setup scripts

-- 1. Create database backup function (for manual backups)
CREATE OR REPLACE FUNCTION backup_user_data(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user_info', (
            SELECT row_to_json(u) FROM (
                SELECT id, email, name, created_at, last_email_sync
                FROM users WHERE id = target_user_id
            ) u
        ),
        'email_count', (
            SELECT COUNT(*) FROM emails WHERE user_id = target_user_id
        ),
        'chat_count', (
            SELECT COUNT(*) FROM chats WHERE user_id = target_user_id
        ),
        'total_messages', (
            SELECT COUNT(*) FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE c.user_id = target_user_id
        ),
        'last_backup', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create cleanup function for old test data
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete emails older than 30 days with no embedding
    DELETE FROM emails 
    WHERE created_at < NOW() - INTERVAL '30 days'
        AND embedding IS NULL
        AND body_text LIKE '%test%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO public.system_logs (action, details, created_at)
    VALUES ('cleanup_test_data', json_build_object('deleted_emails', deleted_count), NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create system logs table for monitoring
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_logs_action ON public.system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- 4. Create database health check function
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_users INTEGER;
    total_emails INTEGER;  
    emails_with_embeddings INTEGER;
    recent_syncs INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO total_emails FROM emails;
    SELECT COUNT(*) INTO emails_with_embeddings FROM emails WHERE embedding IS NOT NULL;
    SELECT COUNT(*) INTO recent_syncs FROM users WHERE last_email_sync > NOW() - INTERVAL '24 hours';
    
    SELECT json_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'metrics', json_build_object(
            'total_users', total_users,
            'total_emails', total_emails,
            'vectorized_emails', emails_with_embeddings,
            'vectorization_rate', CASE 
                WHEN total_emails > 0 
                THEN ROUND((emails_with_embeddings::FLOAT / total_emails * 100), 2)
                ELSE 0 
            END,
            'recent_syncs_24h', recent_syncs
        ),
        'checks', json_build_object(
            'pgvector_enabled', (
                SELECT COUNT(*) = 1 FROM pg_extension WHERE extname = 'vector'
            ),
            'rls_enabled', (
                SELECT COUNT(*) = 5 FROM pg_tables 
                WHERE schemaname = 'public' 
                    AND tablename IN ('users', 'emails', 'chats', 'messages', 'filter_config')
                    AND rowsecurity = true
            ),
            'vector_function_exists', (
                SELECT COUNT(*) = 1 FROM information_schema.routines
                WHERE routine_schema = 'public' AND routine_name = 'match_emails'
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create monitoring view for admin dashboard
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
    'users' as metric,
    COUNT(*)::INTEGER as value,
    'Total registered users' as description
FROM users

UNION ALL

SELECT 
    'emails_total' as metric,
    COUNT(*)::INTEGER as value,
    'Total emails synced' as description
FROM emails

UNION ALL

SELECT 
    'emails_vectorized' as metric,
    COUNT(*)::INTEGER as value,
    'Emails with embeddings' as description
FROM emails WHERE embedding IS NOT NULL

UNION ALL

SELECT 
    'active_chats' as metric,
    COUNT(*)::INTEGER as value,
    'Active chat sessions' as description
FROM chats WHERE updated_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'recent_syncs' as metric,
    COUNT(*)::INTEGER as value,
    'Email syncs in last 24h' as description
FROM users WHERE last_email_sync > NOW() - INTERVAL '24 hours';

-- 6. Grant permissions for new functions
GRANT EXECUTE ON FUNCTION database_health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION backup_user_data(UUID) TO authenticated;
GRANT SELECT ON admin_stats TO authenticated;

-- 7. Create performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_emails_created_at_partial 
ON emails(created_at DESC) WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_sync 
ON users(last_email_sync DESC) WHERE last_email_sync IS NOT NULL;

-- 8. Set up row-level security for system logs (admin only)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only allow viewing system logs for service role
CREATE POLICY "Service role can access system logs" ON public.system_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 9. Create alert thresholds (for external monitoring)
INSERT INTO public.system_logs (action, details) 
VALUES (
    'production_config_applied',
    json_build_object(
        'timestamp', NOW(),
        'version', '1.0',
        'features', ARRAY[
            'backup_functions',
            'health_checks', 
            'monitoring_views',
            'performance_indexes',
            'cleanup_functions'
        ]
    )
) ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Production configuration applied successfully!' as status;