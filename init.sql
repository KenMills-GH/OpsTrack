-- ==========================================
-- OPSTRACK DATABASE INITIALIZATION SCRIPT
-- ==========================================

-- Enable cryptographic functions for database-level password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CLEAN SLATE
-- Drop existing tables in reverse order of dependencies to avoid constraint errors
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS task_notes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. THE OPERATORS (Users Table)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    clearance_level VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT users_clearance_level_check
        CHECK (clearance_level IN ('UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET')),
    CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN', 'MEMBER'))
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
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_status_check
        CHECK (status IN ('PENDING', 'ACTIVE', 'RESOLVED')),
    CONSTRAINT tasks_priority_level_check
        CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- 4. MISSION COMMS (Task Notes Table - 1-to-Many Flex)
CREATE TABLE task_notes (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    operator_id INT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. THE IMMUTABLE LEDGER (Audit Logs Table)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    operator_id INT REFERENCES users(id) ON DELETE SET NULL,
    task_id INT REFERENCES tasks(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details TEXT,
    logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- SEED DATA INJECTION
-- ==========================================

-- A. Populate the Core Command Team (Passwords are 'password123')
INSERT INTO users (name, rank, clearance_level, role, email, password) VALUES 
('Jane Miller', 'SGT', 'SECRET', 'MEMBER', 'j.miller@opstrack.mil', crypt('password123', gen_salt('bf', 10))),
('Marcus Vance', 'CW2', 'SECRET', 'MEMBER', 'm.vance@opstrack.mil', crypt('password123', gen_salt('bf', 10))),
('Kenneth Mills', 'SSG', 'TOP SECRET', 'ADMIN', 'k.mills@opstrack.mil', crypt('password123', gen_salt('bf', 10))),
('Sarah Connor', 'CPT', 'TOP SECRET', 'ADMIN', 's.connor@opstrack.mil', crypt('password123', gen_salt('bf', 10)));

-- B. Inject 50 Dummy Operators for UI Stress Testing
-- All generated demo operators use the password 'password123'
INSERT INTO users (name, rank, clearance_level, role, email, password)
SELECT 
    'Mock Operator ' || i,
    (ARRAY['SGT', 'SSG', 'SFC', 'LT', 'CPT', 'MAJ'])[floor(random() * 6 + 1)],
    (ARRAY['CONFIDENTIAL', 'SECRET', 'TOP SECRET'])[floor(random() * 3 + 1)],
    CASE WHEN i % 10 = 0 THEN 'ADMIN' ELSE 'MEMBER' END,
    'op' || i || '@opstrack.mil',
    crypt('password123', gen_salt('bf', 10))
FROM generate_series(1, 50) as i;

-- C. Inject 50 Dummy Tasks for the Kanban Board
INSERT INTO tasks (title, description, status, priority_level, assigned_to)
SELECT 
    'Operation ' || (ARRAY['Vanguard', 'Thunder', 'Phoenix', 'Wraith', 'Spectre'])[floor(random() * 5 + 1)] || ' ' || i,
    'Auto-generated simulation data for UI stress testing. Parameter set: ' || i,
    (ARRAY['PENDING', 'ACTIVE', 'RESOLVED'])[floor(random() * 3 + 1)],
    (ARRAY['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])[floor(random() * 4 + 1)],
    (SELECT id FROM users ORDER BY random() LIMIT 1)
FROM generate_series(1, 50) as i;

-- D. Inject some mock Task Notes to showcase the relational data
INSERT INTO task_notes (task_id, operator_id, content) VALUES
(1, 3, 'Initial reconnaissance indicates heavy interference on standard frequencies. Switching to sub-channel audio.'),
(1, 1, 'Confirmed. Rerouting comms protocol now. Standby.'),
(2, 4, 'Thermal spikes detected near the extraction point. Advise caution.');

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority_level);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

CREATE INDEX idx_task_notes_task_id ON task_notes(task_id);

CREATE INDEX idx_audit_logs_operator ON audit_logs(operator_id);
CREATE INDEX idx_audit_logs_task_logged_at ON audit_logs(task_id, logged_at DESC);
CREATE INDEX idx_audit_logs_logged_at ON audit_logs(logged_at);

-- Trigger function to automatically update the updated_at column on tasks
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_modtime
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();