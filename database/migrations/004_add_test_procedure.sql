-- Add Test procedure (10000 VND): name "Test", create or rename existing
UPDATE procedures SET name = 'Test', description = 'Test - 10000 VND' WHERE name = 'Test Procedure';
INSERT INTO procedures (name, description, price, duration_minutes, room_number)
SELECT 'Test', 'Test - 10000 VND', 10000.00, 15, 'Room 6'
WHERE NOT EXISTS (SELECT 1 FROM procedures WHERE name = 'Test');
