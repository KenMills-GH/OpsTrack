-- ==========================================
-- OPSTRACK DATABASE INITIALIZATION SCRIPT
-- ==========================================

-- Enable cryptographic functions for database-level password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CLEAN SLATE
-- Drop existing tables in reverse order of dependencies to avoid constraint errors
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. THE OPERATORS (Users Table)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    clearance_level VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT users_clearance_level_check
      CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'))
);

-- 3. THE MISSION BOARD (Tasks Table)
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    priority_level VARCHAR(50) NOT NULL,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT tasks_status_check
            CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
        CONSTRAINT tasks_priority_level_check
            CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- 4. THE IMMUTABLE LEDGER (Audit Logs Table)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    operator_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details TEXT,
    logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. SEED DATA
-- Populate the base operators with a default password of 'password123'
INSERT INTO users (name, rank, clearance_level, email, password) VALUES 
('Jane Miller', 'SGT', 'SECRET', 'j.miller@opstrack.mil', crypt('password123', gen_salt('bf', 10))),
('Marcus Vance', 'CW2', 'TOP SECRET', 'm.vance@opstrack.mil', crypt('password123', gen_salt('bf', 10))),
('Kenneth Mills', 'SSG', 'TOP SECRET', 'k.mills@opstrack.mil', crypt('password123', gen_salt('bf', 10))),
('Sarah Connor', 'CPT', 'TOP SECRET', 's.connor@opstrack.mil', crypt('password123', gen_salt('bf', 10)));

-- Populate an initial task
INSERT INTO tasks (title, description, status, priority_level, assigned_to) VALUES 
('Operation: Network Calibration', 'Recalibrate routing protocols for Sector 4 comms.', 'PENDING', 'HIGH', 1);

-- 6. PERFORMANCE INDEXES
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority_level);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

CREATE INDEX idx_audit_logs_operator ON audit_logs(operator_id);
CREATE INDEX idx_audit_logs_logged_at ON audit_logs(logged_at);