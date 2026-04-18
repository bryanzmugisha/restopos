-- Add station to MenuCategory if not exists
ALTER TABLE "MenuCategory" ADD COLUMN IF NOT EXISTS "station" TEXT NOT NULL DEFAULT 'KITCHEN';

-- Add station to Kot if not exists  
ALTER TABLE "Kot" ADD COLUMN IF NOT EXISTS "station" TEXT NOT NULL DEFAULT 'KITCHEN';

-- Update existing Drinks/Bar categories automatically
UPDATE "MenuCategory" SET station = 'BAR' WHERE LOWER(name) IN ('drinks', 'beverages', 'alcohol', 'bar', 'cocktails', 'wines', 'beers', 'spirits', 'sodas');
