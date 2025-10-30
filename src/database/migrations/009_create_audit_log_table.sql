-- ============================================
-- Audit Log Table - Track all critical operations
-- Security: Complete audit trail for compliance
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    record_id INTEGER NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT operation_valid CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Indexes for performance
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_operation ON audit_log(operation);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Composite indexes
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_table_created ON audit_log(table_name, created_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data_json JSONB;
    new_data_json JSONB;
    changed_fields_array TEXT[];
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_data_json := row_to_json(OLD)::JSONB;
        INSERT INTO audit_log (table_name, operation, record_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, old_data_json);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data_json := row_to_json(OLD)::JSONB;
        new_data_json := row_to_json(NEW)::JSONB;
        
        -- Identify changed fields
        SELECT array_agg(key)
        INTO changed_fields_array
        FROM jsonb_each(old_data_json)
        WHERE old_data_json->key IS DISTINCT FROM new_data_json->key;
        
        INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, changed_fields)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, old_data_json, new_data_json, changed_fields_array);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_data_json := row_to_json(NEW)::JSONB;
        INSERT INTO audit_log (table_name, operation, record_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, new_data_json);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE audit_log IS 'Complete audit trail of all database operations for compliance and security';
COMMENT ON COLUMN audit_log.changed_fields IS 'Array of field names that were modified';