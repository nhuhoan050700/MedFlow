-- Hospital Testing Service Center Database Schema
-- PostgreSQL Database for Railway

-- Users table (stores patient information)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    birthday DATE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Procedures table (available medical procedures)
CREATE TABLE IF NOT EXISTS procedures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    room_number VARCHAR(50)
);

-- Unpaid orders: one row per order until payment. Procedures in pending_procedures JSONB.
CREATE TABLE IF NOT EXISTS unpaid_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_intent_id VARCHAR(255),
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    pending_procedures JSONB
);
CREATE INDEX IF NOT EXISTS idx_unpaid_orders_user_id ON unpaid_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_unpaid_orders_order_number ON unpaid_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_unpaid_orders_payment_status ON unpaid_orders(payment_status);

-- Paid orders: one row per procedure after payment. state = pending | in_progress | done.
CREATE TABLE IF NOT EXISTS paid_orders (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES unpaid_orders(id) ON DELETE CASCADE,
    procedure_id INTEGER REFERENCES procedures(id) ON DELETE SET NULL,
    procedure_name VARCHAR(255),
    room_number VARCHAR(50),
    amount DECIMAL(10, 2),
    paid_at TIMESTAMP,
    state VARCHAR(50) DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_paid_orders_order_id ON paid_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_paid_orders_state ON paid_orders(state);

-- Workers table (staff members)
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order updates log (for tracking status changes)
CREATE TABLE IF NOT EXISTS order_updates (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES unpaid_orders(id) ON DELETE CASCADE,
    worker_id INTEGER REFERENCES workers(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Insert sample procedures
INSERT INTO procedures (name, description, price, room_number) VALUES
('Blood Test', 'Complete blood count and basic panel', 50000.00, 'Room 2'),
('X-Ray', 'Chest X-ray examination', 800000.00, 'Room 5'),
('MRI Scan', 'Magnetic Resonance Imaging', 300000.00, 'Room 1'),
('Ultrasound', 'Abdominal ultrasound scan', 240000.00, 'Room 3'),
('ECG', 'Electrocardiogram test', 120000.00, 'Room 4')
ON CONFLICT DO NOTHING;

-- test1 (10 VND) and test2 (5 VND)
INSERT INTO procedures (name, description, price, room_number) VALUES
('test1', 'Test1 - 10 VND', 10.00, 'Room 6')
ON CONFLICT DO NOTHING;
INSERT INTO procedures (name, description, price, room_number) VALUES
('test2', 'Test2 - 5 VND', 5.00, 'Room 6')
ON CONFLICT DO NOTHING;

-- Insert sample worker
INSERT INTO workers (email, name, role) VALUES
('staff@hospital.com', 'Medical Staff', 'staff')
ON CONFLICT (email) DO NOTHING;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS VARCHAR(50) AS $$
DECLARE
    new_order_number VARCHAR(50);
    date_prefix VARCHAR(10);
    sequence_num INTEGER;
BEGIN
    date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM unpaid_orders
    WHERE order_number LIKE date_prefix || '%';
    new_order_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Use Vietnam time for all tables on Railway (UTC+7).
-- Every connection (Railway SQL, n8n, Node) then uses Asia/Ho_Chi_Minh for CURRENT_TIMESTAMP and display.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO ''Asia/Ho_Chi_Minh''', current_database());
END $$;
