-- Update procedure prices to specific VND amounts
-- blood test 50000 VND, ecg 120000 VND, mri scan 300000 VND,
-- ultrasound 240000 VND, x-ray 800000 VND, test 10 VND

UPDATE procedures SET price = 50000.00 WHERE LOWER(name) = 'blood test';
UPDATE procedures SET price = 120000.00 WHERE LOWER(name) = 'ecg';
UPDATE procedures SET price = 300000.00 WHERE LOWER(name) = 'mri scan';
UPDATE procedures SET price = 240000.00 WHERE LOWER(name) = 'ultrasound';
UPDATE procedures SET price = 800000.00 WHERE LOWER(name) = 'x-ray' OR LOWER(name) = 'xray';

UPDATE procedures
SET price = 100.00,
    description = 'Test - 10 VND'
WHERE LOWER(name) = 'test';

