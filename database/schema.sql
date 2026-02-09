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
    duration_minutes INTEGER DEFAULT 30,
    room_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (patient orders/appointments)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    procedure_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, assigned, in_progress, completed
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid, failed
    payment_intent_id VARCHAR(255),
    room_number VARCHAR(50),
    total_amount DECIMAL(10, 2),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

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
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    worker_id INTEGER REFERENCES workers(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Insert sample procedures
INSERT INTO procedures (name, description, price, duration_minutes, room_number) VALUES
('Blood Test', 'Complete blood count and basic panel', 50.00, 15, 'Room 2'),
('X-Ray', 'Chest X-ray examination', 80.00, 20, 'Room 5'),
('MRI Scan', 'Magnetic Resonance Imaging', 300.00, 45, 'Room 1'),
('Ultrasound', 'Abdominal ultrasound scan', 120.00, 30, 'Room 3'),
('ECG', 'Electrocardiogram test', 60.00, 15, 'Room 4')
ON CONFLICT DO NOTHING;

-- Test procedure (10000 VND)
INSERT INTO procedures (name, description, price, duration_minutes, room_number) VALUES
('Test', 'Test - 10000 VND', 10000.00, 15, 'Room 6')
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
    
    -- Get the next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM orders
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

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set default timezone to Vietnam (UTC+7) for all connections.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO ''Asia/Ho_Chi_Minh''', current_database());
END $$;
