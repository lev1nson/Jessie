-- Supabase Production Setup Verification Script
-- Run these queries in Supabase SQL Editor to verify proper setup

-- 1. Check pgvector extension
SELECT 
    extname as extension_name,
    extversion as version 
FROM pg_extension 
WHERE extname = 'vector';
-- Expected: 1 row with extension 'vector'

-- 2. Verify all required tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'emails', 'chats', 'messages', 'filter_config')
ORDER BY table_name;
-- Expected: 5 rows

-- 3. Check RLS is enabled on all tables
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'emails', 'chats', 'messages', 'filter_config')
ORDER BY tablename;
-- Expected: All rows should have rls_enabled = true

-- 4. Verify essential indexes exist
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('emails', 'users', 'chats', 'messages')
    AND schemaname = 'public'
ORDER BY tablename, indexname;
-- Expected: Multiple indexes including vector index

-- 5. Check vector search function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name = 'match_emails';
-- Expected: 1 row with function 'match_emails'

-- 6. Test vector search function (with dummy data)
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public' 
    AND specific_name LIKE '%match_emails%'
ORDER BY ordinal_position;
-- Expected: Multiple parameters for match_emails function

-- 7. Check user creation trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Expected: 1 row with trigger details

-- 8. Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: Multiple policies for each table

-- 9. Check grants for authenticated role
SELECT 
    table_schema,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges
WHERE grantee = 'authenticated' 
    AND table_schema = 'public'
ORDER BY table_name, privilege_type;
-- Expected: ALL privileges granted to authenticated for each table

-- 10. Test basic table structure
\d+ public.users;
\d+ public.emails;
\d+ public.chats;
\d+ public.messages;
-- Expected: Complete table definitions with proper column types

-- 11. PRODUCTION READINESS CHECK
-- Run this final query to get a summary:
SELECT 
    'Tables' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'emails', 'chats', 'messages', 'filter_config')

UNION ALL

SELECT 
    'RLS Policies' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) >= 12 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Vector Extension' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_extension 
WHERE extname = 'vector'

UNION ALL

SELECT 
    'Vector Function' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name = 'match_emails';

-- Expected: All checks should show ✅ PASS