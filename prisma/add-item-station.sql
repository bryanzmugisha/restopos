-- Add station to MenuItem
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "station" TEXT DEFAULT 'KITCHEN';

-- Auto-set station based on category station
UPDATE "MenuItem" m
SET station = c.station
FROM "MenuCategory" c
WHERE m."categoryId" = c.id AND c.station IS NOT NULL;

-- Show results
SELECT m.name, m.station, c.name as category, c.station as cat_station
FROM "MenuItem" m
JOIN "MenuCategory" c ON m."categoryId" = c.id
ORDER BY m.station, c.name;
