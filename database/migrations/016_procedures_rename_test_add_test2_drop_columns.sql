-- Rename Test procedure to test1, add test2, drop duration_minutes, is_active, created_at from procedures

-- 1. Drop columns from procedures (duration_minutes = duration; user asked to remove duration_time)
ALTER TABLE procedures DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE procedures DROP COLUMN IF EXISTS is_active;
ALTER TABLE procedures DROP COLUMN IF EXISTS created_at;

-- 2. Rename existing Test procedure to test1
UPDATE procedures SET name = 'test1', description = 'Test1 - 10 VND' WHERE LOWER(name) = 'test';

-- 3. Add new procedure test2 (5 VND)
INSERT INTO procedures (name, description, price, room_number)
SELECT 'test2', 'Test2 - 5 VND', 5.00, 'Room 6'
WHERE NOT EXISTS (SELECT 1 FROM procedures WHERE LOWER(name) = 'test2');
