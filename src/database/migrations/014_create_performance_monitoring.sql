-- ============================================
-- Performance Monitoring Views
-- Track slow queries and database health
-- ============================================

-- Enable pg_stat_statements extension for query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View: Slow queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries taking more than 100ms
ORDER BY mean_exec_time DESC
LIMIT 50;

-- View: Table sizes (FIXED for PostgreSQL 18)
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname AS schema_name,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) AS index_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- View: Index usage statistics (FIXED for PostgreSQL 18)
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- View: Database connections
CREATE OR REPLACE VIEW v_active_connections AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query,
    query_start,
    state_change
FROM pg_stat_activity
WHERE datname = current_database()
AND pid <> pg_backend_pid()
ORDER BY query_start DESC;

-- Add comments
COMMENT ON VIEW v_slow_queries IS 'Identifies slow queries for optimization';
COMMENT ON VIEW v_table_sizes IS 'Shows disk space usage by tables';
COMMENT ON VIEW v_index_usage IS 'Tracks index usage to identify unused indexes';
COMMENT ON VIEW v_active_connections IS 'Shows active database connections';